// Integration tests for hooks/tsc-check.js. Two modes:
//   PostToolUse — records edited TS/JS files in <os tmp>/hopla-tsc-<session_id>.json (no tsc).
//   Stop        — runs `tsc -p <nearest tsconfig> --noEmit --pretty false` once per turn,
//                 blocks (exit 2) only for errors in files edited this turn, at most twice.
// A fake local tsc (shell script) stands in for TypeScript.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { makeTempDir, rmDir, writeText } from "../helpers/fixtures.js";

const REPO_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const HOOK = path.join(REPO_ROOT, "hooks", "tsc-check.js");

function runHook(payload, cwd = os.tmpdir()) {
    const res = spawnSync("node", [HOOK], {
        input: payload === undefined ? "" : JSON.stringify(payload),
        encoding: "utf8",
        cwd,
    });
    return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

const newSession = () => `test-${crypto.randomUUID()}`;
const recordPath = (sid) => path.join(os.tmpdir(), `hopla-tsc-${sid}.json`);
const readRecord = (sid) => {
    try {
        return JSON.parse(fs.readFileSync(recordPath(sid), "utf8"));
    } catch {
        return null;
    }
};

// Runs fn(sid) and always deletes the record file.
function withSession(fn) {
    const sid = newSession();
    try {
        return fn(sid);
    } finally {
        fs.rmSync(recordPath(sid), { force: true });
    }
}

const post = (sid, file, cwd) => runHook({
    session_id: sid, hook_event_name: "PostToolUse", cwd,
    tool_name: "Edit", tool_input: { file_path: file },
}, cwd);
const stop = (sid, cwd, active = false) => runHook({
    session_id: sid, hook_event_name: "Stop", cwd, stop_hook_active: active,
}, cwd);

// Writes an executable fake tsc that logs its args, counts runs, and prints `body`.
// `--showConfig` is answered from <binDir>/showconfig.json when present, fails
// when <binDir>/showconfig.fail exists, and otherwise reports a normal project
// (one root file). showConfig calls are not counted as runs.
function fakeTsc(binDir, body, exitCode = 2) {
    fs.mkdirSync(binDir, { recursive: true });
    const tsc = path.join(binDir, "tsc");
    fs.writeFileSync(tsc, `#!/bin/sh
if [ "$1" = "--showConfig" ]; then
  echo "$@" >> "${path.join(binDir, "showconfig.log")}"
  if [ -f "${path.join(binDir, "showconfig.fail")}" ]; then echo "error TS6053: File not found."; exit 1; fi
  if [ -f "${path.join(binDir, "showconfig.json")}" ]; then cat "${path.join(binDir, "showconfig.json")}"; exit 0; fi
  echo '{"compilerOptions": {}, "files": ["./src/a.ts"]}'
  exit 0
fi
echo "$@" >> "${path.join(binDir, "args.log")}"
echo run >> "${path.join(binDir, "runs.log")}"
${body}
exit ${exitCode}
`);
    fs.chmodSync(tsc, 0o755);
    return binDir;
}
const runs = (binDir) => {
    try {
        return fs.readFileSync(path.join(binDir, "runs.log"), "utf8").trim().split("\n").filter(Boolean).length;
    } catch {
        return 0;
    }
};
const errLine = (file, n) => `echo "${file}(${n},7): error TS2322: Type 'string' is not assignable to type 'number'."`;
const errorLines = (s) => s.split("\n").filter((l) => /error TS\d+/.test(l));

// Full tsc logs the hook writes (to /tmp, else the OS temp dir).
function listLogs() {
    const found = [];
    for (const dir of new Set(["/tmp", os.tmpdir()])) {
        try {
            for (const f of fs.readdirSync(dir)) {
                if (/^hopla-tsc-.*\.log$/.test(f)) found.push(path.join(dir, f));
            }
        } catch {
            // ignore
        }
    }
    return found;
}

function withTmp(fn) {
    const tmp = makeTempDir("hopla-tsc-");
    fs.mkdirSync(path.join(tmp, ".git"));
    const before = new Set(listLogs());
    try {
        return fn(tmp);
    } finally {
        rmDir(tmp);
        for (const f of listLogs()) if (!before.has(f)) fs.rmSync(f, { force: true });
    }
}

// --- PostToolUse recorder -------------------------------------------------

test("tsc-check: skips when only .md file is touched (not recorded)", () => withSession((sid) => {
    const res = post(sid, "/some/project/README.md", os.tmpdir());
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
    assert.equal(readRecord(sid), null);
}));

test("tsc-check: skips when only .txt file is touched", () => withSession((sid) => {
    const res = post(sid, "/some/project/notes.txt", os.tmpdir());
    assert.equal(res.status, 0);
    assert.equal(readRecord(sid), null);
}));

test("tsc-check: skips MultiEdit where every file is non-compilable", () => withSession((sid) => {
    const res = runHook({
        session_id: sid, hook_event_name: "PostToolUse", tool_name: "MultiEdit",
        tool_input: { edits: [{ file_path: "/p/README.md" }, { file_path: "/p/notes.txt" }, { file_path: "/p/d.json" }] },
    });
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
    assert.equal(readRecord(sid), null);
}));

test("tsc-check: .ts edit is recorded, tsc NOT invoked, no output", () => withTmp((tmp) => withSession((sid) => {
    writeText(path.join(tmp, "tsconfig.json"), "{}");
    const bin = fakeTsc(path.join(tmp, "node_modules", ".bin"), errLine("src/a.ts", 1));
    const file = path.join(tmp, "src", "a.ts");
    const res = post(sid, file, tmp);
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
    assert.equal(res.stderr, "");
    assert.equal(runs(bin), 0);
    assert.deepEqual(readRecord(sid).files, [file]);
})));

test("tsc-check: MultiEdit with mixed .md + .ts records only the .ts", () => withSession((sid) => {
    runHook({
        session_id: sid, hook_event_name: "PostToolUse", tool_name: "MultiEdit",
        tool_input: { edits: [{ file_path: "/p/README.md" }, { file_path: "/p/index.ts" }] },
    });
    assert.deepEqual(readRecord(sid).files, ["/p/index.ts"]);
}));

test("tsc-check: empty payload defaults to safe behavior (no crash)", () => {
    const res = runHook({});
    assert.equal(res.status, 0);
});

// --- Stop: once per turn on the nearest tsconfig ----------------------------

function makeMonorepo(tmp, body) {
    writeText(path.join(tmp, "apps", "api", "tsconfig.json"), "{}");
    return fakeTsc(path.join(tmp, "node_modules", ".bin"), body); // hoisted
}

test("tsc-check Stop: monorepo, 50 errors -> exit 2, 30 shown, total, log path", () => withTmp((tmp) => withSession((sid) => {
    const body = Array.from({ length: 50 }, (_, i) => errLine("src/a.ts", i + 1)).join("\n");
    const bin = makeMonorepo(tmp, body);
    const file = path.join(tmp, "apps", "api", "src", "a.ts");
    post(sid, file, tmp);
    post(sid, file, tmp);
    post(sid, file, tmp);
    const res = stop(sid, tmp);
    assert.equal(res.status, 2);
    assert.equal(errorLines(res.stderr).length, 30);
    assert.match(res.stderr, /50 errors/);
    const logMatch = res.stderr.match(/Full log: (\S+)/);
    assert.ok(logMatch, res.stderr);
    assert.equal(errorLines(fs.readFileSync(logMatch[1], "utf8")).length, 50);
    assert.equal(runs(bin), 1);
    const args = fs.readFileSync(path.join(bin, "args.log"), "utf8");
    assert.match(args, /-p \S*apps\/api\/tsconfig\.json/);
    assert.match(args, /--noEmit/);
    assert.match(args, /--pretty false/);
    fs.rmSync(logMatch[1], { force: true });
})));

test("tsc-check Stop: no recordings -> exit 0, tsc not run", () => withTmp((tmp) => withSession((sid) => {
    const bin = makeMonorepo(tmp, errLine("src/a.ts", 1));
    const res = stop(sid, tmp);
    assert.equal(res.status, 0);
    assert.equal(runs(bin), 0);
})));

test("tsc-check Stop: file without any tsconfig up to the git root -> exit 0", () => withTmp((tmp) => withSession((sid) => {
    const bin = fakeTsc(path.join(tmp, "node_modules", ".bin"), errLine("x.ts", 1));
    post(sid, path.join(tmp, "pkg", "src", "x.ts"), tmp);
    const res = stop(sid, tmp);
    assert.equal(res.status, 0);
    assert.equal(runs(bin), 0);
})));

test("tsc-check Stop: two packages -> both projects reported", () => withTmp((tmp) => withSession((sid) => {
    writeText(path.join(tmp, "apps", "api", "tsconfig.json"), "{}");
    writeText(path.join(tmp, "apps", "web", "tsconfig.json"), "{}");
    fakeTsc(path.join(tmp, "node_modules", ".bin"), errLine("src/a.ts", 1));
    post(sid, path.join(tmp, "apps", "api", "src", "a.ts"), tmp);
    post(sid, path.join(tmp, "apps", "web", "src", "a.ts"), tmp);
    const res = stop(sid, tmp);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /apps\/api/);
    assert.match(res.stderr, /apps\/web/);
})));

test("tsc-check Stop: clean tsc -> exit 0 and record cleared", () => withTmp((tmp) => withSession((sid) => {
    writeText(path.join(tmp, "tsconfig.json"), "{}");
    fakeTsc(path.join(tmp, "node_modules", ".bin"), "true", 0);
    post(sid, path.join(tmp, "src", "a.ts"), tmp);
    const res = stop(sid, tmp);
    assert.equal(res.status, 0);
    assert.equal(readRecord(sid), null);
})));

test("tsc-check Stop: errors split by file (own block, other counted)", () => withTmp((tmp) => withSession((sid) => {
    writeText(path.join(tmp, "tsconfig.json"), "{}");
    const body = [1, 2].map((n) => errLine("src/a.ts", n))
        .concat([1, 2, 3, 4, 5].map((n) => errLine("src/b.ts", n))).join("\n");
    fakeTsc(path.join(tmp, "node_modules", ".bin"), body);
    post(sid, path.join(tmp, "src", "a.ts"), tmp);
    const res = stop(sid, tmp);
    assert.equal(res.status, 2);
    const shown = errorLines(res.stderr);
    assert.equal(shown.length, 2);
    assert.ok(shown.every((l) => l.includes("src/a.ts")));
    assert.match(res.stderr, /5 errors in other files \(not edited this turn\), see log/);
})));

test("tsc-check Stop: only other-file errors -> exit 0 + systemMessage, record cleared", () => withTmp((tmp) => withSession((sid) => {
    writeText(path.join(tmp, "tsconfig.json"), "{}");
    fakeTsc(path.join(tmp, "node_modules", ".bin"), [1, 2, 3, 4, 5].map((n) => errLine("src/b.ts", n)).join("\n"));
    post(sid, path.join(tmp, "src", "a.ts"), tmp);
    const res = stop(sid, tmp);
    assert.equal(res.status, 0);
    const out = JSON.parse(res.stdout);
    assert.match(out.systemMessage, /5 errors in other files/);
    assert.match(out.systemMessage, /hopla-tsc-.*\.log/);
    assert.equal(readRecord(sid), null);
})));

test("tsc-check Stop: error path relative to a nested tsconfig matches the recorded file", () => withTmp((tmp) => withSession((sid) => {
    makeMonorepo(tmp, errLine("src/a.ts", 1));
    post(sid, path.join(tmp, "apps", "api", "src", "a.ts"), tmp);
    const res = stop(sid, tmp);
    assert.equal(res.status, 2);
    assert.equal(errorLines(res.stderr).length, 1);
    assert.doesNotMatch(res.stderr, /in other files/);
})));

test("tsc-check Stop: loop guard — unchanged error set with stop_hook_active -> exit 0", () => withTmp((tmp) => withSession((sid) => {
    writeText(path.join(tmp, "tsconfig.json"), "{}");
    fakeTsc(path.join(tmp, "node_modules", ".bin"), errLine("src/a.ts", 1));
    post(sid, path.join(tmp, "src", "a.ts"), tmp);
    assert.equal(stop(sid, tmp, false).status, 2);
    assert.equal(stop(sid, tmp, true).status, 0);
    assert.equal(readRecord(sid), null);
})));

test("tsc-check Stop: loop guard — at most 2 blocks per turn", () => withTmp((tmp) => withSession((sid) => {
    writeText(path.join(tmp, "tsconfig.json"), "{}");
    const bin = path.join(tmp, "node_modules", ".bin");
    // Each run reports a different line so the signature always changes.
    fakeTsc(bin, `n=$(wc -l < "${path.join(bin, "runs.log")}" | tr -d ' ')\necho "src/a.ts($n,1): error TS2322: x"`);
    const file = path.join(tmp, "src", "a.ts");
    post(sid, file, tmp);
    assert.equal(stop(sid, tmp, false).status, 2);
    post(sid, file, tmp); // Claude edits while fixing
    assert.equal(stop(sid, tmp, true).status, 2);
    post(sid, file, tmp);
    assert.equal(stop(sid, tmp, true).status, 0);
})));

test("tsc-check Stop: record missing or corrupt -> exit 0", () => withTmp((tmp) => withSession((sid) => {
    assert.equal(stop(sid, tmp).status, 0);
    fs.writeFileSync(recordPath(sid), "{ corrupt");
    assert.equal(stop(sid, tmp).status, 0);
})));

test("tsc-check Stop: tsconfig at session root still works", () => withTmp((tmp) => withSession((sid) => {
    writeText(path.join(tmp, "tsconfig.json"), "{}");
    const bin = fakeTsc(path.join(tmp, "node_modules", ".bin"), errLine("src/a.ts", 1));
    post(sid, path.join(tmp, "src", "a.ts"), tmp);
    const res = stop(sid, tmp);
    assert.equal(res.status, 2);
    assert.match(fs.readFileSync(path.join(bin, "args.log"), "utf8"), /-p \S*tsconfig\.json/);
})));

test("tsc-check Stop: directory names are never run by a shell", () => withTmp((tmp) => withSession((sid) => {
    const evil = path.join(tmp, "p$(touch PWNED_MARK)`touch PWNED_TICK`");
    writeText(path.join(evil, "tsconfig.json"), "{}");
    fakeTsc(path.join(tmp, "node_modules", ".bin"), errLine("a.ts", 1));
    post(sid, path.join(evil, "a.ts"), tmp);
    const res = stop(sid, tmp);
    assert.equal(res.status, 2);
    for (const marker of ["PWNED_MARK", "PWNED_TICK"]) {
        assert.ok(!fs.existsSync(path.join(evil, marker)) && !fs.existsSync(path.join(tmp, marker)), marker);
    }
})));

test("tsc-check Stop: projects beyond the first 3 stay recorded for the next Stop", () => withTmp((tmp) => withSession((sid) => {
    fakeTsc(path.join(tmp, "node_modules", ".bin"), "true", 0);
    for (const p of ["a", "b", "c", "d"]) {
        writeText(path.join(tmp, p, "tsconfig.json"), "{}");
        post(sid, path.join(tmp, p, "x.ts"), tmp);
    }
    assert.equal(stop(sid, tmp).status, 0);
    assert.deepEqual(readRecord(sid).files, [path.join(tmp, "d", "x.ts")]);
    assert.equal(stop(sid, tmp).status, 0);
    assert.equal(readRecord(sid), null);
})));

// Solution detection asks tsc itself (`--showConfig`), so extends chains, npm
// bases and JSONC follow TypeScript exactly. These cases pin the decision rule.
const showConfigCalls = (binDir) => {
    try {
        return fs.readFileSync(path.join(binDir, "showconfig.log"), "utf8").trim().split("\n").filter(Boolean).length;
    } catch {
        return 0;
    }
};

const SOLUTION_CASES = [
    ["references and no root files -> solution (skipped with notice)",
        '{"files": [], "references": [{"path": "./a"}]}', '{"compilerOptions": {}, "references": [{"path": "./a"}]}', "solution"],
    ["references and root files (e.g. inherited include) -> checked",
        '{"extends": "./base.json", "files": [], "references": [{"path": "./a"}]}',
        '{"compilerOptions": {}, "references": [{"path": "./a"}], "files": ["./src/a.ts"], "include": ["src"]}', "checked"],
    ["showConfig fails (unresolvable or broken base) -> checked",
        '{"extends": ".base/tsconfig.json", "references": [{"path": "./a"}]}', "FAIL", "checked"],
    ["showConfig prints something that is not JSON -> checked",
        '{"files": [], "references": [{"path": "./a"}]}', "not json", "checked"],
];

for (const [label, tsconfig, showConfig, expected] of SOLUTION_CASES) {
    test(`tsc-check Stop: ${label}`, () => withTmp((tmp) => withSession((sid) => {
        writeText(path.join(tmp, "tsconfig.json"), tsconfig);
        const bin = fakeTsc(path.join(tmp, "node_modules", ".bin"), errLine("src/a.ts", 1));
        if (showConfig === "FAIL") writeText(path.join(bin, "showconfig.fail"), "");
        else writeText(path.join(bin, "showconfig.json"), showConfig);
        post(sid, path.join(tmp, "src", "a.ts"), tmp);
        const res = stop(sid, tmp);
        assert.equal(showConfigCalls(bin), 1);
        if (expected === "solution") {
            assert.equal(res.status, 0);
            assert.equal(runs(bin), 0);
            assert.match(JSON.parse(res.stdout).systemMessage, /solution-style tsconfig/);
            assert.equal(readRecord(sid), null);
        } else {
            assert.equal(res.status, 2, res.stdout + res.stderr);
            assert.equal(runs(bin), 1);
        }
    })));
}

test("tsc-check Stop: tsconfig without references never spawns --showConfig", () => withTmp((tmp) => withSession((sid) => {
    writeText(path.join(tmp, "tsconfig.json"), '{"include": ["src"]}');
    const bin = fakeTsc(path.join(tmp, "node_modules", ".bin"), errLine("src/a.ts", 1));
    post(sid, path.join(tmp, "src", "a.ts"), tmp);
    assert.equal(stop(sid, tmp).status, 2);
    assert.equal(showConfigCalls(bin), 0);
    assert.equal(runs(bin), 1);
})));

// --- legacy manual run (no payload) -----------------------------------------

test("tsc-check: manual run without payload checks <cwd>/tsconfig.json immediately", () => withTmp((tmp) => {
    writeText(path.join(tmp, "tsconfig.json"), "{}");
    fakeTsc(path.join(tmp, "node_modules", ".bin"), errLine("src/a.ts", 1));
    const res = runHook(undefined, tmp);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /TypeScript errors/);
    assert.match(res.stderr, /TS2322/);
    assert.equal(res.stdout, "");
}));

// --- per-session record hardening (3.1) -------------------------------------
// Each case runs with its own TMPDIR so the record lands in a known, clean dir.
function postIn(tmp, sid, file) {
    const res = spawnSync("node", [HOOK], {
        input: JSON.stringify({ session_id: sid, hook_event_name: "PostToolUse", cwd: tmp,
            tool_name: "Edit", tool_input: { file_path: file } }),
        encoding: "utf8", cwd: tmp, env: { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp },
    });
    return res.status;
}
function withRecordTmp(fn) {
    const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "hopla-tsc-hard-")));
    try {
        return fn(tmp);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

test("tsc-check record: an unsafe session id stays inside TMPDIR (a.b -> a_b)", () => withRecordTmp((tmp) => {
    assert.equal(postIn(tmp, "a.b", path.join(tmp, "x.ts")), 0);
    assert.ok(fs.existsSync(path.join(tmp, "hopla-tsc-a_b.json")));
    assert.equal(postIn(tmp, "../escape", path.join(tmp, "x.ts")), 0);
    assert.ok(fs.existsSync(path.join(tmp, "hopla-tsc-___escape.json")));
}));

test("tsc-check record: a symlink planted at the record path is replaced, never written through", () => withRecordTmp((tmp) => {
    const victim = path.join(tmp, "victim.txt");
    fs.writeFileSync(victim, "keep me");
    fs.symlinkSync(victim, path.join(tmp, "hopla-tsc-s1.json"));
    assert.equal(postIn(tmp, "s1", path.join(tmp, "x.ts")), 0);
    assert.equal(fs.readFileSync(victim, "utf8"), "keep me");
    assert.ok(!fs.lstatSync(path.join(tmp, "hopla-tsc-s1.json")).isSymbolicLink());
}));

test("tsc-check record: written with mode 0600, no temp file left behind", () => withRecordTmp((tmp) => {
    assert.equal(postIn(tmp, "s2", path.join(tmp, "x.ts")), 0);
    const mode = fs.statSync(path.join(tmp, "hopla-tsc-s2.json")).mode & 0o777;
    assert.equal(mode, 0o600, mode.toString(8));
    assert.deepEqual(fs.readdirSync(tmp).filter((f) => f.endsWith(".tmp")), []);
}));
