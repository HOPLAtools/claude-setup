// Regression tests for hooks/prompt-route.js — a silent UserPromptSubmit stub
// since 2.2.0 (skill selection uses native description / when_to_use). It must
// never print anything, never fail a prompt, and stay registered in hooks.json.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "../helpers/fixtures.js";

const REPO_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const HOOK = path.join(REPO_ROOT, "hooks", "prompt-route.js");

function runRaw(input) {
    const res = spawnSync("node", [HOOK], { input, encoding: "utf8" });
    return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}
const runHook = (prompt) => runRaw(JSON.stringify({ prompt }));

function assertSilent(res) {
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
    assert.equal(res.stderr, "");
}

test("prompt-route: empty prompt -> silent", () => assertSilent(runHook("")));

for (const prompt of [
    "plan a migration to Postgres",
    "please commit my work",
    "please review my code",
    "this is broken, help",
    "audit hook src/hooks/useFoo.ts",
    "refactor this function",
]) {
    test(`prompt-route: former hint prompt is silent (${prompt})`, () => assertSilent(runHook(prompt)));
}

test("prompt-route: malformed JSON -> silent", () => assertSilent(runRaw("{ not json")));

test("prompt-route: empty stdin -> silent", () => assertSilent(runRaw("")));

test("prompt-route: 5,000-char prompt -> silent", () => assertSilent(runHook("let's commit this work. " + "x".repeat(5000))));

test("prompt-route: stays registered in hooks.json", () => {
    const hooks = readJson(path.join(REPO_ROOT, "hooks", "hooks.json"));
    assert.ok(hooks);
    assert.match(hooks.hooks.UserPromptSubmit[0].hooks[0].command, /hooks\/prompt-route\.js/);
    assert.ok(fs.existsSync(HOOK));
});
