// Guard test for /hopla:init-project (3.3): existing code goes through the native
// /init and becomes AGENTS.md + CLAUDE.md alias; no code keeps the PRD + stack
// path with a short AGENTS.md; existing rules files are never overwritten.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const body = fs.readFileSync(path.join(ROOT, "skills", "init-project", "SKILL.md"), "utf8");

for (const [label, re] of [
    ["invokes the native /init through the Skill tool", /Skill tool[\s\S]{0,80}`init`/],
    ["moves what /init wrote into AGENTS.md", /into `AGENTS\.md`/],
    ["keeps the CLAUDE.md alias", /@AGENTS\.md/],
    ["no-code path keeps the stack recommendation", /no code[\s\S]{0,400}stack/i],
    ["short AGENTS.md for new projects", /short `AGENTS\.md`/i],
    ["never overwrites existing rules files without approval", /never overwrite/i],
    ["shows /init's suggestions and asks", /suggestions[\s\S]{0,120}(approv|ask)/i],
    ["keeps the ## HOPLA section", /## HOPLA/],
    ["keeps the .agents/ scaffolding", /\.agents\//],
]) {
    test(`init-project: ${label}`, () => assert.match(body, re));
}

test("init-project: no longer creates .claude/commands/", () => {
    assert.doesNotMatch(body, /Create `?\.claude\/commands\/`?/);
});

test("init-project: under 300 lines", () => {
    assert.ok(body.split("\n").length < 300, String(body.split("\n").length));
});
