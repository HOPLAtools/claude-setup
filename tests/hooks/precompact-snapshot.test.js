// Integration tests for hooks/precompact-snapshot.js (PreCompact) and the
// round trip into session-prime.js.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeTempDir, rmDir, writeText, writeJson, readJson } from "../helpers/fixtures.js";

// Plan fixture: the mtime fallback only picks files with a task heading.
const PLAN_MD = "# p\n\n## Implementation Tasks\n\n### Task 1: x\n";

const REPO_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const HOOK = path.join(REPO_ROOT, "hooks", "precompact-snapshot.js");
const PRIME = path.join(REPO_ROOT, "hooks", "session-prime.js");

const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };

function git(cwd, ...args) {
    const r = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", ...args],
        { cwd, encoding: "utf8", env: GIT_ENV });
    assert.equal(r.status, 0, r.stderr);
}

function makeRepo(branch = "feature/x") {
    const tmp = makeTempDir("hopla-pc-");
    git(tmp, "init", "-q");
    writeText(path.join(tmp, "a.txt"), "a\n");
    git(tmp, "add", "a.txt");
    git(tmp, "commit", "-q", "-m", "init");
    git(tmp, "checkout", "-q", "-b", branch);
    return tmp;
}

function run(script, cwd) {
    return spawnSync("node", [script], {
        input: JSON.stringify({ hook_event_name: "PreCompact", trigger: "manual" }),
        encoding: "utf8", cwd, env: GIT_ENV,
    });
}

const snapOf = (cwd) => readJson(path.join(cwd, ".claude", "compact-snapshot.json"));

function withRepo(fn) {
    const tmp = makeRepo();
    try {
        return fn(tmp);
    } finally {
        rmDir(tmp);
    }
}

test("precompact: snapshot keys", () => withRepo((tmp) => {
    writeText(path.join(tmp, ".agents", "plans", "p.md"), PLAN_MD);
    writeText(path.join(tmp, "a.txt"), "dirty\n");
    const r = run(HOOK, tmp);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
    const s = snapOf(tmp);
    assert.equal(s.branch, "feature/x");
    assert.equal(s.activePlan, "p.md");
    assert.equal(s.activePlanPath, ".agents/plans/p.md");
    assert.equal(s.step, null);
    assert.equal(s.plansDir, ".agents/plans");
    assert.equal(s.inWorktree, false);
    assert.ok(Number.isFinite(Date.parse(s.timestamp)));
    assert.match(s.uncommitted, /a\.txt/);
}));

test("precompact: pointer preferred over mtime, step stored", () => withRepo((tmp) => {
    writeText(path.join(tmp, "AGENTS.md"), "## HOPLA\n- Plans: docs/plans\n");
    writeText(path.join(tmp, "docs", "plans", "a.md"), PLAN_MD);
    writeText(path.join(tmp, "docs", "plans", "b.md"), PLAN_MD);
    const old = new Date(Date.now() - 3600 * 1000);
    fs.utimesSync(path.join(tmp, "docs", "plans", "a.md"), old, old);
    writeJson(path.join(tmp, ".agents", "hopla-active-plan.json"),
        { plan: "docs/plans/a.md", step: "Task 2", status: "executing" });
    run(HOOK, tmp);
    const s = snapOf(tmp);
    assert.equal(s.activePlanPath, "docs/plans/a.md");
    assert.equal(s.activePlan, "a.md");
    assert.equal(s.step, "Task 2");
    assert.equal(s.plansDir, "docs/plans");
}));

test("precompact: drafts and done/ never chosen", () => withRepo((tmp) => {
    const d = path.join(tmp, ".agents", "plans");
    writeText(path.join(d, "x.draft.md"), PLAN_MD);
    writeText(path.join(d, "done", "z.md"), PLAN_MD);
    run(HOOK, tmp);
    assert.equal(snapOf(tmp).activePlan, null);
    writeText(path.join(d, "older.md"), PLAN_MD);
    const old = new Date(Date.now() - 3600 * 1000);
    fs.utimesSync(path.join(d, "older.md"), old, old);
    run(HOOK, tmp);
    assert.equal(snapOf(tmp).activePlan, "older.md");
}));

test("precompact: uncommitted capped at 20 lines", () => withRepo((tmp) => {
    for (let i = 0; i < 30; i++) writeText(path.join(tmp, `u${i}.txt`), "x");
    run(HOOK, tmp);
    const lines = snapOf(tmp).uncommitted.split("\n");
    assert.equal(lines.length, 21);
    assert.equal(lines[20], "… +10 more");
}));

test("precompact: non-git dir -> branch/uncommitted null; unwritable .claude -> exit 0", () => {
    const tmp = makeTempDir("hopla-pc-nogit-");
    try {
        assert.equal(run(HOOK, tmp).status, 0);
        const s = snapOf(tmp);
        assert.equal(s.branch, null);
        assert.equal(s.uncommitted, null);
        rmDir(path.join(tmp, ".claude"));
        writeText(path.join(tmp, ".claude"), "a regular file");
        const r = run(HOOK, tmp);
        assert.equal(r.status, 0);
        assert.equal(r.stderr, "");
    } finally {
        rmDir(tmp);
    }
});

test("precompact -> session-prime round trip", () => withRepo((tmp) => {
    writeText(path.join(tmp, ".agents", "plans", "p.md"), PLAN_MD);
    run(HOOK, tmp);
    const r = run(PRIME, tmp);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Resuming from pre-compact snapshot \((0|1) min ago\):/);
    assert.match(r.stdout, /- active plan: \.agents\/plans\/p\.md — re-read this plan before continuing/);
    assert.ok(r.stdout.length <= 1000);
}));
