// Integration tests for hooks/session-prime.js (SessionStart context).
//
// Expected output format (pinned — keep in sync with the hook):
//   Branch: <branch>
//   Working tree is clean.            | Uncommitted: <N> (<T> tracked, <U> untracked)
//   <up to 5 raw `git status --short` lines>
//   … +<K> more                        (only when N > 5)
//   Active plan: <path>[ — step: <step>]
//   Resuming from pre-compact snapshot (<M> min ago):
//   - branch: <b>[ (worktree)]         (only when it differs from live or inWorktree)
//   - active plan: <path>[ (step: <s>)] — re-read this plan before continuing
//   - uncommitted at snapshot:
//   <up to 5 lines>
//   … +<K> more
// Single newlines, every line <= 101 chars, total <= 1,500 chars, nothing at all
// when there is nothing to say. Never reads stdin.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeTempDir, rmDir, writeText, writeJson } from "../helpers/fixtures.js";

const REPO_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const HOOK = path.join(REPO_ROOT, "hooks", "session-prime.js");

const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };

function git(cwd, ...args) {
    const r = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", ...args],
        { cwd, encoding: "utf8", env: GIT_ENV });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout;
}

function makeRepo(branch = "feature/x") {
    const tmp = makeTempDir("hopla-sp-");
    git(tmp, "init", "-q");
    writeText(path.join(tmp, "a.txt"), "a\n");
    git(tmp, "add", "a.txt");
    git(tmp, "commit", "-q", "-m", "init");
    git(tmp, "checkout", "-q", "-b", branch);
    return tmp;
}

function runHook(cwd, input = JSON.stringify({ source: "startup" })) {
    const r = spawnSync("node", [HOOK], { input, encoding: "utf8", cwd, env: GIT_ENV });
    return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

const NOW = Math.floor(Date.now() / 1000) * 1000;
function setMtime(file, hoursAgo) {
    const t = new Date(NOW - hoursAgo * 3600 * 1000);
    fs.utimesSync(file, t, t);
}

function writeSnapshot(cwd, snap) {
    writeJson(path.join(cwd, ".claude", "compact-snapshot.json"), snap);
}

function withRepo(fn, branch) {
    const tmp = makeRepo(branch);
    try {
        return fn(tmp);
    } finally {
        rmDir(tmp);
    }
}

test("session-prime: clean repo -> branch + clean, no skills/rules/commits", () => withRepo((tmp) => {
    const r = runHook(tmp);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /^Branch: feature\/x/);
    assert.match(r.stdout, /Working tree is clean\./);
    assert.doesNotMatch(r.stdout, /Skills Available|HOPLA Skills|MUST use|Project rules|Recent commits/);
    assert.ok(r.stdout.length < 200, r.stdout);
}));

test("session-prime: no rules excerpt even with AGENTS.md / CLAUDE.md", () => withRepo((tmp) => {
    writeText(path.join(tmp, "AGENTS.md"), "# Rules\n\nUNIQUE-RULES-MARKER-7\n\n---\n\nmore\n");
    writeText(path.join(tmp, "CLAUDE.md"), "@AGENTS.md\n");
    git(tmp, "add", ".");
    git(tmp, "commit", "-q", "-m", "rules");
    const r = runHook(tmp);
    assert.doesNotMatch(r.stdout, /UNIQUE-RULES-MARKER-7|Project rules/);
}));

test("session-prime: 80 dirty files -> bounded output with 5 sample lines", () => withRepo((tmp) => {
    for (let i = 0; i < 60; i++) writeText(path.join(tmp, `t${i}.txt`), "x\n");
    git(tmp, "add", ".");
    git(tmp, "commit", "-q", "-m", "many");
    for (let i = 0; i < 60; i++) writeText(path.join(tmp, `t${i}.txt`), "changed\n");
    for (let i = 0; i < 20; i++) writeText(path.join(tmp, `u${i}.txt`), "new\n");
    const r = runHook(tmp);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.length <= 1000, String(r.stdout.length));
    assert.match(r.stdout, /Uncommitted: 80 \(60 tracked, 20 untracked\)/);
    assert.match(r.stdout, /… \+75 more/);
    const sample = r.stdout.split("\n").filter((l) => /^( M|\?\?) /.test(l));
    assert.equal(sample.length, 5);
}));

test("session-prime: 3 dirty files -> all printed, no tail, leading space kept", () => withRepo((tmp) => {
    writeText(path.join(tmp, "a.txt"), "changed\n");
    writeText(path.join(tmp, "n1.txt"), "x\n");
    writeText(path.join(tmp, "n2.txt"), "x\n");
    const r = runHook(tmp);
    assert.match(r.stdout, /Uncommitted: 3 \(1 tracked, 2 untracked\)/);
    assert.match(r.stdout, /^ M a\.txt$/m);
    assert.doesNotMatch(r.stdout, /… \+/);
}));

test("session-prime: active plan by mtime excludes drafts and done/", () => withRepo((tmp) => {
    const d = path.join(tmp, ".agents", "plans");
    writeText(path.join(d, "old.md"), "x"); setMtime(path.join(d, "old.md"), 3);
    writeText(path.join(d, "newest.md"), "x"); setMtime(path.join(d, "newest.md"), 1);
    writeText(path.join(d, "newer.draft.md"), "x"); setMtime(path.join(d, "newer.draft.md"), 0);
    writeText(path.join(d, "done", "archived.md"), "x");
    const r = runHook(tmp);
    assert.match(r.stdout, /Active plan: \.agents\/plans\/newest\.md/);
    assert.doesNotMatch(r.stdout, /draft|archived/);
}));

test("session-prime: no plans dir / only drafts -> no Active plan line", () => withRepo((tmp) => {
    assert.doesNotMatch(runHook(tmp).stdout, /Active plan/);
    writeText(path.join(tmp, ".agents", "plans", "x.draft.md"), "x");
    writeText(path.join(tmp, ".agents", "plans", "done", "y.md"), "x");
    assert.doesNotMatch(runHook(tmp).stdout, /Active plan/);
}));

test("session-prime: pointer -> Active plan with step", () => withRepo((tmp) => {
    writeText(path.join(tmp, "AGENTS.md"), "## HOPLA\n- Plans: docs/plans/\n");
    writeText(path.join(tmp, "docs", "plans", "x.md"), "x");
    writeJson(path.join(tmp, ".agents", "hopla-active-plan.json"),
        { plan: "docs/plans/x.md", step: "Task 3", status: "executing" });
    assert.match(runHook(tmp).stdout, /^Active plan: docs\/plans\/x\.md — step: Task 3$/m);
}));

test("session-prime: docs/plans declaration -> Active plan from that dir", () => withRepo((tmp) => {
    writeText(path.join(tmp, "AGENTS.md"), "## HOPLA\n- Plans: docs/plans/\n");
    writeText(path.join(tmp, "docs", "plans", "x.md"), "x");
    assert.match(runHook(tmp).stdout, /Active plan: docs\/plans\/x\.md/);
}));

test("session-prime: non-git dir without plans or snapshot -> empty output", () => {
    const tmp = makeTempDir("hopla-sp-nogit-");
    try {
        const r = runHook(tmp);
        assert.equal(r.status, 0);
        assert.equal(r.stdout, "");
    } finally {
        rmDir(tmp);
    }
});

test("session-prime: snapshot replay (branch differs, worktree, plan, uncommitted)", () => withRepo((tmp) => {
    writeSnapshot(tmp, {
        timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
        branch: "other-branch", inWorktree: true,
        activePlan: "foo.md", plansDir: ".agents/plans", uncommitted: "?? x.txt",
    });
    const r = runHook(tmp);
    assert.match(r.stdout, /Resuming from pre-compact snapshot \(10 min ago\):/);
    assert.match(r.stdout, /- branch: other-branch \(worktree\)/);
    assert.match(r.stdout, /- active plan: \.agents\/plans\/foo\.md — re-read this plan before continuing/);
    assert.match(r.stdout, /- uncommitted at snapshot:\n\?\? x\.txt/);
}));

test("session-prime: snapshot always repeats the plan (with step) even when equal to live", () => withRepo((tmp) => {
    writeText(path.join(tmp, "docs", "plans", "x.md"), "x");
    writeText(path.join(tmp, "AGENTS.md"), "## HOPLA\n- Plans: docs/plans\n");
    writeSnapshot(tmp, {
        timestamp: new Date().toISOString(), branch: "feature/x", inWorktree: false,
        activePlan: "x.md", activePlanPath: "docs/plans/x.md", step: "Task 2", plansDir: "docs/plans",
    });
    const r = runHook(tmp);
    assert.match(r.stdout, /Resuming from pre-compact snapshot/);
    assert.doesNotMatch(r.stdout, /- branch:/);
    assert.match(r.stdout, /- active plan: docs\/plans\/x\.md \(step: Task 2\) — re-read this plan before continuing/);
}));

test("session-prime: legacy 2.1.1 snapshot (basename only) -> .agents/plans prefix", () => withRepo((tmp) => {
    writeSnapshot(tmp, { timestamp: new Date().toISOString(), branch: "feature/x", activePlan: "foo.md" });
    assert.match(runHook(tmp).stdout, /- active plan: \.agents\/plans\/foo\.md/);
}));

test("session-prime: stale snapshot boundaries (119 min replays, 121 min does not)", () => withRepo((tmp) => {
    writeSnapshot(tmp, { timestamp: new Date(Date.now() - 119 * 60000).toISOString(), branch: "b" });
    assert.match(runHook(tmp).stdout, /Resuming/);
    writeSnapshot(tmp, { timestamp: new Date(Date.now() - 121 * 60000).toISOString(), branch: "b" });
    assert.doesNotMatch(runHook(tmp).stdout, /Resuming/);
    writeSnapshot(tmp, { timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), branch: "b" });
    assert.doesNotMatch(runHook(tmp).stdout, /Resuming/);
}));

test("session-prime: malformed snapshot / bad timestamp -> ignored, branch still printed", () => withRepo((tmp) => {
    writeText(path.join(tmp, ".claude", "compact-snapshot.json"), "{ not json");
    let r = runHook(tmp);
    assert.equal(r.status, 0);
    assert.doesNotMatch(r.stdout, /Resuming/);
    assert.match(r.stdout, /Branch: feature\/x/);
    writeSnapshot(tmp, { timestamp: "nope", branch: "b" });
    r = runHook(tmp);
    assert.doesNotMatch(r.stdout, /Resuming/);
    writeSnapshot(tmp, { branch: "b" });
    assert.doesNotMatch(runHook(tmp).stdout, /Resuming/);
}));

test("session-prime: huge snapshot uncommitted is capped", () => withRepo((tmp) => {
    const lines = Array.from({ length: 500 }, (_, i) => `?? f${i}.txt`).join("\n");
    writeSnapshot(tmp, { timestamp: new Date().toISOString(), branch: "feature/x", uncommitted: lines });
    const r = runHook(tmp);
    assert.ok(r.stdout.length <= 1000, String(r.stdout.length));
    assert.match(r.stdout, /… \+495 more/);
}));

test("session-prime: long lines clipped, total <= 1500", () => withRepo((tmp) => {
    const longName = "d".repeat(150) + "/" + "f".repeat(140) + ".txt";
    writeText(path.join(tmp, longName), "x");
    writeSnapshot(tmp, {
        timestamp: new Date().toISOString(), branch: "b".repeat(300), inWorktree: true,
        activePlan: "p".repeat(300) + ".md", step: "s".repeat(300), uncommitted: "?? " + "z".repeat(300),
    });
    const r = runHook(tmp);
    for (const line of r.stdout.split("\n")) assert.ok(line.length <= 101, `${line.length}: ${line.slice(0, 40)}`);
    assert.ok(r.stdout.length <= 1500);
    assert.match(r.stdout, /re-read this plan before continuing/);
}, "feature/" + "x".repeat(250)));

test("session-prime: output independent of stdin", () => withRepo((tmp) => {
    const a = runHook(tmp, '{"source":"startup"}');
    const b = runHook(tmp, "");
    const c = runHook(tmp, "{ bad");
    assert.equal(a.stdout, b.stdout);
    assert.equal(b.stdout, c.stdout);
    assert.equal(c.status, 0);
}));
