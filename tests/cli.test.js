// Unit tests for cli.js helpers. Covers the pure functions exposed for testing:
//   - parseSettingsFile: missing/valid/malformed JSON
//   - safeWrite: atomic write + dry-run respect
//
// Integration tests for the CLI subcommands (setup-statusline, uninstall,
// migrate) run the script with a fake $HOME to verify side effects on disk.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    parseSettingsFile,
    safeWrite,
    parsePlansDeclaration,
    resolvePlansDir,
    readWorkflowState,
} from "../cli.js";
import { makeTempDir, writeJson, readJson, rmDir, writeText } from "./helpers/fixtures.js";

// Plan fixture: the mtime fallback only picks files with a task heading.
const PLAN_MD = "# p\n\n## Implementation Tasks\n\n### Task 1: x\n";

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLI = path.join(REPO_ROOT, "cli.js");

// Run cli.js with a fake $HOME and the given args. Returns { status, stdout, stderr }.
// `cwd` is optional (defaults to the test runner's cwd).
function runCli(args, { home, cwd } = {}) {
    return spawnSync("node", [CLI, ...args], {
        encoding: "utf8",
        cwd,
        env: { ...process.env, HOME: home, CLAUDE_DRY_RUN: undefined },
    });
}

test("parseSettingsFile: missing file returns null", () => {
    const result = parseSettingsFile("/nonexistent/path/to/settings.json");
    assert.equal(result, null);
});

test("parseSettingsFile: valid JSON parses correctly", () => {
    const tmp = makeTempDir();
    try {
        const filePath = path.join(tmp, "settings.json");
        writeJson(filePath, { permissions: { allow: ["Bash(git *)"] } });
        const parsed = parseSettingsFile(filePath);
        assert.deepEqual(parsed, { permissions: { allow: ["Bash(git *)"] } });
    } finally {
        rmDir(tmp);
    }
});

test("parseSettingsFile: malformed JSON returns null (does not throw)", () => {
    const tmp = makeTempDir();
    try {
        const filePath = path.join(tmp, "settings.json");
        fs.writeFileSync(filePath, "{ invalid json");
        const parsed = parseSettingsFile(filePath);
        assert.equal(parsed, null);
    } finally {
        rmDir(tmp);
    }
});

test("safeWrite: writes file atomically when dryRun=false", () => {
    const tmp = makeTempDir();
    try {
        const target = path.join(tmp, "out.json");
        safeWrite(target, '{"hello":"world"}\n', { dryRun: false });
        assert.equal(fs.readFileSync(target, "utf8"), '{"hello":"world"}\n');
    } finally {
        rmDir(tmp);
    }
});

test("safeWrite: dryRun=true does NOT write the file", () => {
    const tmp = makeTempDir();
    try {
        const target = path.join(tmp, "out.json");
        safeWrite(target, "should not exist", { dryRun: true });
        assert.equal(fs.existsSync(target), false);
    } finally {
        rmDir(tmp);
    }
});

test("safeWrite: leaves no .tmp.* leftovers after a successful write", () => {
    const tmp = makeTempDir();
    try {
        const target = path.join(tmp, "out.json");
        safeWrite(target, "ok", { dryRun: false });
        const entries = fs.readdirSync(tmp);
        const leftovers = entries.filter((f) => f.includes(".tmp."));
        assert.deepEqual(leftovers, []);
    } finally {
        rmDir(tmp);
    }
});

// === Integration tests (spawn the CLI with fake $HOME) =================

test("CLI --version prints the package version", () => {
    const tmp = makeTempDir();
    try {
        const res = runCli(["--version"], { home: tmp });
        assert.equal(res.status, 0);
        assert.match(res.stdout, /^@hopla\/claude-setup v\d+\.\d+\.\d+/);
    } finally {
        rmDir(tmp);
    }
});

test("CLI --dry-run --force install does not touch the fake HOME", () => {
    const tmp = makeTempDir();
    try {
        const res = runCli(["--dry-run", "--force"], { home: tmp });
        assert.equal(res.status, 0);
        // Dry-run must not create ~/.claude/CLAUDE.md
        const claudeFile = path.join(tmp, ".claude", "CLAUDE.md");
        assert.equal(fs.existsSync(claudeFile), false);
    } finally {
        rmDir(tmp);
    }
});

test("CLI --setup-statusline aborts when plugin is not installed (path missing)", () => {
    const tmp = makeTempDir();
    try {
        const res = runCli(["--setup-statusline"], { home: tmp });
        assert.equal(res.status, 1);
        assert.match(res.stdout, /Plugin not detected/);
    } finally {
        rmDir(tmp);
    }
});

test("CLI --remove-statusline is a no-op when settings.json has no Hopla statusLine", () => {
    const tmp = makeTempDir();
    try {
        const settingsPath = path.join(tmp, ".claude", "settings.json");
        writeJson(settingsPath, {
            statusLine: { type: "command", command: "/usr/local/bin/my-own-statusline" },
        });
        const res = runCli(["--remove-statusline"], { home: tmp });
        assert.equal(res.status, 0);
        assert.match(res.stdout, /No Hopla statusline found/);
        const after = readJson(settingsPath);
        assert.deepEqual(after.statusLine, {
            type: "command",
            command: "/usr/local/bin/my-own-statusline",
        });
    } finally {
        rmDir(tmp);
    }
});

test("CLI --migrate removes legacy guides from ~/.claude/commands/guides/", () => {
    const tmp = makeTempDir();
    try {
        const guidesDir = path.join(tmp, ".claude", "commands", "guides");
        fs.mkdirSync(guidesDir, { recursive: true });
        // Two plugin-shipped guides + one custom user guide
        fs.writeFileSync(path.join(guidesDir, "hooks-reference.md"), "# Hooks Reference Guide");
        fs.writeFileSync(path.join(guidesDir, "data-audit.md"), "# Guide: Data Audit");
        fs.writeFileSync(path.join(guidesDir, "my-custom-guide.md"), "# My personal guide");

        const res = runCli(["--migrate"], { home: tmp });
        assert.equal(res.status, 0);
        // Plugin guides removed
        assert.equal(fs.existsSync(path.join(guidesDir, "hooks-reference.md")), false);
        assert.equal(fs.existsSync(path.join(guidesDir, "data-audit.md")), false);
        // Custom user guide preserved
        assert.equal(fs.existsSync(path.join(guidesDir, "my-custom-guide.md")), true);
        // Directory still exists because it has the custom guide
        assert.equal(fs.existsSync(guidesDir), true);
    } finally {
        rmDir(tmp);
    }
});

test("CLI --migrate removes the legacy guides/ directory entirely when no custom files remain", () => {
    const tmp = makeTempDir();
    try {
        const guidesDir = path.join(tmp, ".claude", "commands", "guides");
        fs.mkdirSync(guidesDir, { recursive: true });
        fs.writeFileSync(path.join(guidesDir, "write-skill.md"), "# Writing Skills Guide");
        fs.writeFileSync(path.join(guidesDir, "mcp-integration.md"), "# MCP Integration Guide");

        const res = runCli(["--migrate"], { home: tmp });
        assert.equal(res.status, 0);
        // All plugin guides removed
        assert.equal(fs.existsSync(path.join(guidesDir, "write-skill.md")), false);
        assert.equal(fs.existsSync(path.join(guidesDir, "mcp-integration.md")), false);
        // Now-empty directory cleaned up
        assert.equal(fs.existsSync(guidesDir), false);
    } finally {
        rmDir(tmp);
    }
});

test("CLI --remove-statusline removes only a Hopla-marked statusLine", () => {
    const tmp = makeTempDir();
    try {
        const settingsPath = path.join(tmp, ".claude", "settings.json");
        writeJson(settingsPath, {
            statusLine: {
                type: "command",
                command: "node /fake/.claude/plugins/marketplaces/hopla-marketplace/hooks/statusline.js",
            },
            otherKey: "preserved",
        });
        const res = runCli(["--remove-statusline"], { home: tmp });
        assert.equal(res.status, 0);
        assert.match(res.stdout, /statusLine from settings\.json/);
        const after = readJson(settingsPath);
        assert.equal(after.statusLine, undefined);
        assert.equal(after.otherKey, "preserved");
    } finally {
        rmDir(tmp);
    }
});

// === status / plans dir ================================================

const parseCases = [
    ["## HOPLA\n- Plans: docs/plans/\n", "docs/plans"],
    ["## HOPLA\n- Plans: `docs/plans`\n", "docs/plans"],
    ["# T\n## HOPLA\n- Other: x\n- Plans: docs/plans\n", "docs/plans"],
    ["## hopla\n* plans:   docs/plans  \n", "docs/plans"],
    ["## Other\n- Plans: docs/plans\n", null],
    ["## HOPLA\n- Foo: bar\n## Next\n- Plans: docs/plans\n", null],
    ["### HOPLA\n- Plans: docs/plans\n", null],
    ["## HOPLA\n### Paths\n- Plans: docs/plans\n", "docs/plans"],
    ["```markdown\n## HOPLA\n- Plans: docs/plans/\n```\n", null],
    ["## HOPLA\n```\n- Plans: bad\n```\n- Plans: good\n", "good"],
    ["## HOPLA\r\n- Plans: docs/plans/\r\n", "docs/plans"],
    ["## HOPLA\n- Plans: a/b\n- Plans: c/d\n", "a/b"],
    ["## HOPLA\n- Plans: ./docs/plans/\n", "docs/plans"],
    ["## HOPLA\n- Plans: docs\\plans\n", "docs/plans"],
    ["## HOPLA\n- Plans: .agent/plans\n", ".agent/plans"],
    ["## HOPLA\n- Plans: docs/plans/ (feature plans)\n", "docs/plans"],
    ["## HOPLA\n- Plans: `docs/my plans/` (x)\n", "docs/my plans"],
];

for (const [input, expected] of parseCases) {
    test(`parsePlansDeclaration: ${JSON.stringify(input)} -> ${expected}`, () => {
        const r = parsePlansDeclaration(input);
        assert.equal(r.dir, expected);
        assert.equal(r.warning, undefined);
    });
}

for (const raw of ["/etc/plans", "../outside", "docs/../../x", ".", "~/plans", "$HOME/plans", "C:\\plans"]) {
    test(`parsePlansDeclaration: unsafe value ${raw} is rejected with a warning`, () => {
        const r = parsePlansDeclaration(`## HOPLA\n- Plans: ${raw}\n`);
        assert.equal(r.dir, null);
        assert.match(r.warning, /unsafe/);
    });
}

test("parsePlansDeclaration: empty value -> null without warning", () => {
    const r = parsePlansDeclaration("## HOPLA\n- Plans:\n");
    assert.equal(r.dir, null);
    assert.equal(r.warning, undefined);
});

function withTmp(fn) {
    const tmp = makeTempDir();
    try {
        return fn(tmp);
    } finally {
        rmDir(tmp);
    }
}

test("resolvePlansDir: no AGENTS.md / CLAUDE.md -> default", () => withTmp((tmp) => {
    const r = resolvePlansDir(tmp);
    assert.equal(r.dir, ".agents/plans");
    assert.equal(r.source, "default");
    assert.equal(r.abs, path.join(tmp, ".agents", "plans"));
}));

test("resolvePlansDir: AGENTS.md declaration wins", () => withTmp((tmp) => {
    writeText(path.join(tmp, "AGENTS.md"), "# P\n\n## HOPLA\n- Plans: docs/plans/\n");
    const r = resolvePlansDir(tmp);
    assert.equal(r.dir, "docs/plans");
    assert.equal(r.source, "AGENTS.md");
    assert.equal(r.abs, path.join(tmp, "docs", "plans"));
}));

test("resolvePlansDir: only CLAUDE.md declares -> source CLAUDE.md", () => withTmp((tmp) => {
    writeText(path.join(tmp, "CLAUDE.md"), "## HOPLA\n- Plans: docs/plans\n");
    assert.equal(resolvePlansDir(tmp).source, "CLAUDE.md");
}));

test("resolvePlansDir: AGENTS.md without section falls back to CLAUDE.md", () => withTmp((tmp) => {
    writeText(path.join(tmp, "AGENTS.md"), "# Rules\n- nothing here\n");
    writeText(path.join(tmp, "CLAUDE.md"), "## HOPLA\n- Plans: docs/plans\n");
    const r = resolvePlansDir(tmp);
    assert.equal(r.dir, "docs/plans");
    assert.equal(r.source, "CLAUDE.md");
}));

test("resolvePlansDir: AGENTS.md beats CLAUDE.md", () => withTmp((tmp) => {
    writeText(path.join(tmp, "AGENTS.md"), "## HOPLA\n- Plans: a/b\n");
    writeText(path.join(tmp, "CLAUDE.md"), "## HOPLA\n- Plans: c/d\n");
    const r = resolvePlansDir(tmp);
    assert.equal(r.dir, "a/b");
    assert.equal(r.source, "AGENTS.md");
}));

test("resolvePlansDir: unsafe declaration -> default + warning", () => withTmp((tmp) => {
    writeText(path.join(tmp, "AGENTS.md"), "## HOPLA\n- Plans: ../x\n");
    const r = resolvePlansDir(tmp);
    assert.equal(r.dir, ".agents/plans");
    assert.equal(r.source, "default");
    assert.match(r.warning, /unsafe/);
}));

test("readWorkflowState: exposes plans_dir keys", () => withTmp((tmp) => {
    writeText(path.join(tmp, ".agents", "plans", "x.md"), PLAN_MD);
    const s = readWorkflowState(tmp);
    assert.equal(s.plans_dir, ".agents/plans");
    assert.equal(s.plans_dir_source, "default");
    assert.equal(s.plans_dir_present, true);
    assert.equal(s.plans_dir_warning, null);
    assert.deepEqual(s.plans.active, ["x.md"]);
}));

function statusJson(cwd) {
    const home = makeTempDir("hopla-home-");
    try {
        const r = runCli(["status", "--json"], { home, cwd });
        assert.equal(r.status, 0, r.stderr);
        return JSON.parse(r.stdout);
    } finally {
        rmDir(home);
    }
}

function statusText(cwd) {
    const home = makeTempDir("hopla-home-");
    try {
        const r = runCli(["status"], { home, cwd });
        assert.equal(r.status, 0, r.stderr);
        return r.stdout;
    } finally {
        rmDir(home);
    }
}

function makeDocsPlansProject(tmp) {
    writeText(path.join(tmp, "AGENTS.md"), "# P\n\n## HOPLA\n- Plans: docs/plans/\n");
    writeText(path.join(tmp, "docs", "plans", "add-auth.md"), PLAN_MD);
    writeText(path.join(tmp, "docs", "plans", "wip.draft.md"), PLAN_MD);
    writeText(path.join(tmp, "docs", "plans", "done", "old.md"), PLAN_MD);
    writeText(path.join(tmp, "docs", "plans", "backlog", "later.md"), PLAN_MD);
}

test("CLI status --json: docs/plans project without .agents/", () => withTmp((tmp) => {
    makeDocsPlansProject(tmp);
    const j = statusJson(tmp);
    assert.equal(j.git.in_repo, false);
    assert.deepEqual(j.plans.active, ["add-auth.md"]);
    assert.deepEqual(j.plans.draft, ["wip.draft.md"]);
    assert.deepEqual(j.plans.done, ["old.md"]);
    assert.deepEqual(j.plans.backlog, ["later.md"]);
    assert.equal(j.plans_dir, "docs/plans");
    assert.equal(j.plans_dir_source, "AGENTS.md");
    assert.equal(j.agents_dir_present, false);
    assert.equal(j.plans_dir_present, true);
    assert.match(j.next, /Active plan \(add-auth\.md\)/);
    assert.doesNotMatch(j.next, /^No \.agents\//);
    assert.equal(j.active_plan.path, "docs/plans/add-auth.md");
    assert.equal(j.active_plan.source, "mtime");
}));

test("CLI status --json: default project keeps every pre-existing key", () => withTmp((tmp) => {
    writeText(path.join(tmp, ".agents", "plans", "x.md"), PLAN_MD);
    const j = statusJson(tmp);
    for (const k of ["cwd", "git", "agents_dir_present", "plans", "specs", "code_reviews",
        "execution_reports", "system_reviews", "rca", "audits", "next",
        "plans_dir", "plans_dir_source", "plans_dir_present", "plans_dir_warning", "active_plan"]) {
        assert.ok(k in j, `missing key ${k}`);
    }
    assert.equal(j.plans_dir, ".agents/plans");
    assert.equal(j.plans_dir_source, "default");
    assert.deepEqual(j.plans.active, ["x.md"]);
}));

test("CLI status --json: declared dir missing -> no fallback to .agents/plans", () => withTmp((tmp) => {
    writeText(path.join(tmp, "AGENTS.md"), "## HOPLA\n- Plans: docs/plans\n");
    writeText(path.join(tmp, ".agents", "plans", "x.md"), PLAN_MD);
    const j = statusJson(tmp);
    assert.deepEqual(j.plans.active, []);
    assert.equal(j.plans_dir_present, false);
    assert.equal(j.active_plan, null);
}));

test("CLI status --json: ../escape declaration -> default + warning", () => withTmp((tmp) => {
    writeText(path.join(tmp, "AGENTS.md"), "## HOPLA\n- Plans: ../escape\n");
    const j = statusJson(tmp);
    assert.equal(j.plans_dir, ".agents/plans");
    assert.ok(typeof j.plans_dir_warning === "string" && j.plans_dir_warning.length > 0);
}));

test("CLI status (text): docs/plans project prints dir and source", () => withTmp((tmp) => {
    makeDocsPlansProject(tmp);
    const out = statusText(tmp);
    assert.match(out, /docs\/plans/);
    assert.match(out, /AGENTS\.md/);
}));

test("CLI status: empty dir still prints the No .agents/ guidance", () => withTmp((tmp) => {
    const j = statusJson(tmp);
    assert.match(j.next, /^No \.agents\//);
    assert.match(statusText(tmp), /No \.agents\//);
}));

// --- active-plan pointer ------------------------------------------------

function writePointer(tmp, obj) {
    writeText(path.join(tmp, ".agents", "hopla-active-plan.json"),
        typeof obj === "string" ? obj : JSON.stringify(obj));
}

test("CLI status --json: valid pointer wins over mtime", () => withTmp((tmp) => {
    makeDocsPlansProject(tmp);
    writeText(path.join(tmp, "docs", "plans", "x.md"), PLAN_MD);
    const old = new Date(Date.now() - 3 * 3600 * 1000);
    fs.utimesSync(path.join(tmp, "docs", "plans", "x.md"), old, old);
    writePointer(tmp, { plan: "docs/plans/x.md", step: "Task 3", status: "executing",
        updatedAt: new Date().toISOString(), by: "execute" });
    const j = statusJson(tmp);
    assert.deepEqual(j.active_plan, { path: "docs/plans/x.md", step: "Task 3", source: "pointer" });
    assert.match(j.next, /x\.md/);
}));

test("CLI status (text): pointer prints Active line with step", () => withTmp((tmp) => {
    makeDocsPlansProject(tmp);
    writePointer(tmp, { plan: "docs/plans/add-auth.md", step: "Task 2", status: "executing" });
    assert.match(statusText(tmp), /Active: docs\/plans\/add-auth\.md — step: Task 2 \(pointer\)/);
}));

const badPointers = [
    ["missing file", { plan: "docs/plans/nope.md", status: "executing" }],
    ["done/ file", { plan: "docs/plans/done/old.md", status: "executing" }],
    ["status done", { plan: "docs/plans/add-auth.md", status: "done" }],
    ["malformed JSON", "{ not json"],
    ["unsafe path", { plan: "../outside.md", status: "executing" }],
    ["absolute path", { plan: "/etc/hosts", status: "executing" }],
];

for (const [label, ptr] of badPointers) {
    test(`CLI status --json: pointer ignored (${label}) -> source mtime`, () => withTmp((tmp) => {
        makeDocsPlansProject(tmp);
        writePointer(tmp, ptr);
        const j = statusJson(tmp);
        assert.equal(j.active_plan.source, "mtime");
        assert.equal(j.active_plan.path, "docs/plans/add-auth.md");
    }));
}

// --- suggestNext matches artifacts by exact slug ----------------------------

test("CLI status --json: a review for another slug (oauth-refactor) does not count for plan auth", () => withTmp((tmp) => {
    writeText(path.join(tmp, ".agents", "plans", "auth.md"), PLAN_MD);
    writeText(path.join(tmp, ".agents", "code-reviews", "oauth-refactor.md"), "# r\n");
    assert.match(statusJson(tmp).next, /Active plan \(auth\.md\) — execute it/);
    writeText(path.join(tmp, ".agents", "code-reviews", "auth.md"), "# r\n");
    assert.match(statusJson(tmp).next, /Active plan \(auth\.md\) reviewed — run execution-report/);
    writeText(path.join(tmp, ".agents", "execution-reports", "auth-smokes.md"), "# s\n");
    assert.match(statusJson(tmp).next, /reviewed and reported/);
}));
