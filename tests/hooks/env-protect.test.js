// Integration tests for hooks/env-protect.js. Spawns the hook with JSON on
// stdin and asserts exit codes — exit 2 = block, exit 0 = allow.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const HOOK = path.join(REPO_ROOT, "hooks", "env-protect.js");

function runHook(payload) {
    const res = spawnSync("node", [HOOK], {
        input: JSON.stringify(payload),
        encoding: "utf8",
    });
    return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

test("env-protect: blocks Read of .env", () => {
    const res = runHook({
        tool_name: "Read",
        tool_input: { file_path: "/some/project/.env" },
    });
    assert.equal(res.status, 2);
});

test("env-protect: blocks Read of .env.local", () => {
    const res = runHook({
        tool_name: "Read",
        tool_input: { file_path: "/some/project/.env.local" },
    });
    assert.equal(res.status, 2);
});

test("env-protect: blocks Read of .env.production", () => {
    const res = runHook({
        tool_name: "Read",
        tool_input: { file_path: "/some/project/.env.production" },
    });
    assert.equal(res.status, 2);
});

test("env-protect: allows Read of normal file", () => {
    const res = runHook({
        tool_name: "Read",
        tool_input: { file_path: "/some/project/src/index.ts" },
    });
    assert.equal(res.status, 0);
});

test("env-protect: blocks Bash command that cats .env", () => {
    const res = runHook({
        tool_name: "Bash",
        tool_input: { command: "cat .env" },
    });
    assert.equal(res.status, 2);
});

test("env-protect: allows benign Bash command", () => {
    const res = runHook({
        tool_name: "Bash",
        tool_input: { command: "ls -la" },
    });
    assert.equal(res.status, 0);
});

test("env-protect: blocks Grep of .env files via pattern path", () => {
    const res = runHook({
        tool_name: "Grep",
        tool_input: { path: "./.env" },
    });
    assert.equal(res.status, 2);
});
