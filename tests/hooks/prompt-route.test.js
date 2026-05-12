// Integration tests for hooks/prompt-route.js. Verifies the hybrid matcher:
// auto-derive from name + quoted phrases in description, plus literal
// `triggers:` override.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const HOOK = path.join(REPO_ROOT, "hooks", "prompt-route.js");

function runHook(prompt) {
    const res = spawnSync("node", [HOOK], {
        input: JSON.stringify({ prompt }),
        encoding: "utf8",
    });
    return { status: res.status, stdout: res.stdout };
}

test("prompt-route: empty prompt → exit 0 no output", () => {
    const res = runHook("");
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
});

test("prompt-route: 'migration' matches the migration skill (literal name)", () => {
    const res = runHook("plan a migration to Postgres");
    assert.equal(res.status, 0);
    assert.match(res.stdout, /`migration`/);
});

test("prompt-route: 'hook-audit' matches via name (hyphenated)", () => {
    const res = runHook("audit hook src/hooks/useFoo.ts");
    assert.equal(res.status, 0);
    assert.match(res.stdout, /`hook-audit`/);
});

test("prompt-route: 'refactor' matches refactoring via quoted phrase in description", () => {
    const res = runHook("refactor this function");
    assert.equal(res.status, 0);
    assert.match(res.stdout, /`refactoring`/);
});

test("prompt-route: 'commit' matches git via quoted phrase", () => {
    const res = runHook("please commit my work");
    assert.equal(res.status, 0);
    assert.match(res.stdout, /`git`/);
});

test("prompt-route: 'review my code' matches code-review via triggers override", () => {
    const res = runHook("please review my code");
    assert.equal(res.status, 0);
    assert.match(res.stdout, /`code-review`/);
});

test("prompt-route: 'broken' matches debug via quoted phrase in description", () => {
    const res = runHook("this is broken, help");
    assert.equal(res.status, 0);
    assert.match(res.stdout, /`debug`/);
});

test("prompt-route: prompt with no skill keywords → exit 0 no hint", () => {
    const res = runHook("hello world how are you today");
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
});

test("prompt-route: malformed JSON input → exit 0 silently (no block)", () => {
    const res = spawnSync("node", [HOOK], {
        input: "{ not json",
        encoding: "utf8",
    });
    assert.equal(res.status, 0);
});

test("prompt-route: prompt longer than 4000 chars is truncated but still matches early keywords", () => {
    const head = "let's commit this work. ";
    const tail = "x".repeat(5000);
    const res = runHook(head + tail);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /`git`/);
});
