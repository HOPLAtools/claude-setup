// Tests for hooks/deprecation-notice.js (3.0): one notice per session per
// deprecated item, on UserPromptSubmit (/hopla:<item>) and PreToolUse
// (Skill / Agent / Task). It never blocks, never auto-approves a tool call and
// stays silent for everything else. Each test runs with its own TMPDIR so the
// per-session marker files never leak.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeTempDir, rmDir, readJson } from "../helpers/fixtures.js";

const REPO_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const HOOK = path.join(REPO_ROOT, "hooks", "deprecation-notice.js");

function run(tmp, input) {
    const raw = typeof input === "string" ? input : JSON.stringify(input);
    const res = spawnSync("node", [HOOK], { input: raw, encoding: "utf8", env: { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp } });
    return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}
const ups = (prompt, session_id = "s1") => ({ hook_event_name: "UserPromptSubmit", session_id, prompt });
const skill = (name, session_id = "s1") => ({ hook_event_name: "PreToolUse", session_id, tool_name: "Skill", tool_input: { skill: name } });
const agent = (type, tool_name = "Agent", session_id = "s1") =>
    ({ hook_event_name: "PreToolUse", session_id, tool_name, tool_input: { subagent_type: type, prompt: "x" } });

function withTmp(fn) {
    const tmp = makeTempDir("hopla-deprecation-");
    try {
        return fn(tmp);
    } finally {
        rmDir(tmp);
    }
}

function notice(res, event) {
    assert.equal(res.status, 0, res.stderr);
    assert.equal(res.stderr, "");
    const out = JSON.parse(res.stdout);
    assert.equal(out.hookSpecificOutput.hookEventName, event);
    assert.equal(out.systemMessage, out.hookSpecificOutput.additionalContext);
    assert.ok(!("permissionDecision" in out.hookSpecificOutput), "must never auto-approve");
    assert.ok(!("decision" in out), "must never block");
    assert.match(out.systemMessage, /deprecated since 3\.0\.0 and will be removed in 4\.0\.0/);
    return out.systemMessage;
}
function silent(res) {
    assert.equal(res.status, 0, res.stderr);
    assert.equal(res.stdout, "");
    assert.equal(res.stderr, "");
}

const REPLACEMENTS = [
    ["refactoring", /\/simplify/],
    ["code-review-fix", /\/code-review --fix/],
    ["parallel-dispatch", /Workflows/],
    ["subagent-execution", /Workflows/],
];

for (const [item, replacement] of REPLACEMENTS) {
    test(`deprecation-notice: /hopla:${item} -> notice naming the replacement`, () => withTmp((tmp) => {
        const msg = notice(run(tmp, ups(`/hopla:${item}`)), "UserPromptSubmit");
        assert.match(msg, new RegExp(item));
        assert.match(msg, replacement);
    }));
}

test("deprecation-notice: once per session per item; other sessions and items still notified", () => withTmp((tmp) => {
    notice(run(tmp, ups("/hopla:refactoring")), "UserPromptSubmit");
    silent(run(tmp, ups("/hopla:refactoring src/a.js")));
    silent(run(tmp, skill("hopla:refactoring")));
    notice(run(tmp, ups("/hopla:refactoring", "s2")), "UserPromptSubmit");
    notice(run(tmp, ups("/hopla:code-review-fix")), "UserPromptSubmit");
}));

test("deprecation-notice: leading spaces, arguments and a newline after the name still match", () => withTmp((tmp) => {
    notice(run(tmp, ups("  /hopla:refactoring src/a.js")), "UserPromptSubmit");
    notice(run(tmp, ups("/hopla:code-review-fix\nsecurity only")), "UserPromptSubmit");
}));

for (const prompt of ["/hopla:refactoring-x", "/hopla:execute plan.md", "please refactor this", "/refactoring",
    "see /hopla:refactoring later", ""]) {
    test(`deprecation-notice: silent for ${JSON.stringify(prompt)}`, () => withTmp((tmp) => silent(run(tmp, ups(prompt)))));
}

test("deprecation-notice: Skill tool with a deprecated hopla skill -> notice", () => withTmp((tmp) => {
    const msg = notice(run(tmp, skill("hopla:parallel-dispatch")), "PreToolUse");
    assert.match(msg, /Workflows/);
}));

test("deprecation-notice: Skill tool without the hopla: prefix or with a current skill -> silent", () => withTmp((tmp) => {
    silent(run(tmp, skill("refactoring")));
    silent(run(tmp, skill("hopla:execute")));
}));

for (const tool of ["Agent", "Task"]) {
    test(`deprecation-notice: ${tool} tool with hopla:code-reviewer -> notice naming the code-review skill`, () => withTmp((tmp) => {
        const msg = notice(run(tmp, agent("hopla:code-reviewer", tool)), "PreToolUse");
        assert.match(msg, /code-review skill/);
    }));
}

test("deprecation-notice: hopla:system-reviewer -> notice naming /hopla:system-review", () => withTmp((tmp) => {
    assert.match(notice(run(tmp, agent("hopla:system-reviewer")), "PreToolUse"), /\/hopla:system-review/);
}));

test("deprecation-notice: current agents and other tools -> silent", () => withTmp((tmp) => {
    silent(run(tmp, agent("hopla:codebase-researcher")));
    silent(run(tmp, agent("code-reviewer")));
    silent(run(tmp, { hook_event_name: "PreToolUse", session_id: "s1", tool_name: "Bash", tool_input: { command: "ls" } }));
}));

test("deprecation-notice: missing session_id -> notice every time, no marker written", () => withTmp((tmp) => {
    const noSession = { hook_event_name: "UserPromptSubmit", prompt: "/hopla:refactoring" };
    notice(run(tmp, noSession), "UserPromptSubmit");
    notice(run(tmp, noSession), "UserPromptSubmit");
    assert.deepEqual(fs.readdirSync(tmp).filter((f) => f.startsWith("hopla-deprecations-")), []);
}));

test("deprecation-notice: unsafe session_id -> notice, nothing written outside TMPDIR", () => withTmp((tmp) => {
    const parent = path.dirname(tmp);
    const before = fs.readdirSync(parent).filter((f) => f.startsWith("hopla-deprecations-"));
    notice(run(tmp, ups("/hopla:refactoring", "../escape")), "UserPromptSubmit");
    notice(run(tmp, ups("/hopla:refactoring", "../escape")), "UserPromptSubmit");
    const after = fs.readdirSync(parent).filter((f) => f.startsWith("hopla-deprecations-"));
    assert.deepEqual(after, before);
    assert.deepEqual(fs.readdirSync(tmp).filter((f) => f.startsWith("hopla-deprecations-")), []);
}));

test("deprecation-notice: unwritable marker dir -> still a notice, exit 0", () => withTmp((tmp) => {
    const missing = path.join(tmp, "does-not-exist");
    notice(run(missing, ups("/hopla:refactoring")), "UserPromptSubmit");
}));

test("deprecation-notice: malformed JSON / empty stdin -> silent", () => withTmp((tmp) => {
    silent(run(tmp, "{ not json"));
    silent(run(tmp, ""));
}));

test("deprecation-notice: registered for UserPromptSubmit and PreToolUse Skill|Agent|Task; prompt-route.js is gone", () => {
    const hooks = readJson(path.join(REPO_ROOT, "hooks", "hooks.json")).hooks;
    assert.match(hooks.UserPromptSubmit[0].hooks[0].command, /hooks\/deprecation-notice\.js/);
    const pre = hooks.PreToolUse.find((h) => /deprecation-notice\.js/.test(h.hooks[0].command));
    assert.ok(pre, "PreToolUse entry missing");
    assert.equal(pre.matcher, "Skill|Agent|Task");
    assert.ok(!fs.existsSync(path.join(REPO_ROOT, "hooks", "prompt-route.js")));
});
