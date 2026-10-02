// Guard test for /hopla:execute Step 4a (3.2): independent plan tasks run as
// a native Workflow (implement -> verify per task), the validation pyramid
// stays in the main session, and every unsafe case falls back to sequential.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const body = fs.readFileSync(path.join(ROOT, "skills", "execute", "SKILL.md"), "utf8");
const between = (a, b) => {
    const i = body.indexOf(a);
    assert.ok(i !== -1, `missing ${a}`);
    const j = body.indexOf(b, i + a.length);
    assert.ok(j !== -1, `missing ${b} after ${a}`);
    return body.slice(i, j);
};

test("execute: Step 4a sits right before the sequential Step 4", () => {
    const i = body.indexOf("## Step 4a:");
    assert.ok(i !== -1 && i < body.indexOf("## Step 4: Execute Tasks in Order"));
});

const step4a = () => between("## Step 4a:", "## Step 4: Execute Tasks in Order");

for (const [label, re] of [
    ["uses the Workflow tool with a pipeline", /Workflow tool[\s\S]*pipeline\(/],
    ["3 or more independent tasks", /3 or more independent tasks/i],
    ["disjoint File fields", /`File` fields are disjoint/i],
    ["at most 6 implement agents", /at most 6/i],
    ["the four task statuses", /DONE_WITH_CONCERNS[\s\S]*NEEDS_CONTEXT[\s\S]*BLOCKED/],
    ["verify on sonnet with low effort", /model: 'sonnet'[\s\S]*effort: 'low'/],
    ["Fable session runs sequentially", /Fable[\s\S]{0,120}sequential/i],
    ["declined dialog runs sequentially", /declined[\s\S]{0,160}sequential/i],
    ["agents never commit", /never commit/i],
    ["tasks passed through args", /\bargs\b/],
    ["ends the turn and resumes on the completion notification", /end (your|the) turn[\s\S]{0,200}notification/i],
    ["never for deploy, migrations, DNS or deletes", /deploy[\s\S]{0,80}migration[\s\S]{0,80}DNS/i],
    ["agents work under the absolute project root (they may start elsewhere)", /absolute path of the project root/i],
    ["verify checks each file exists under the root", /exists under/i],
    ["no need to load workflow-authoring", /workflow-authoring/],
]) {
    test(`execute Step 4a: ${label}`, () => assert.match(step4a(), re));
}

test("execute Step 3 announces which tasks run as a workflow", () => {
    assert.match(between("## Step 3:", "## Step 4a:"), /workflow/i);
});

test("execute Step 4a: a declined dialog stops the turn; the notice offers a \"sequential\" reply and execute waits for it", () => {
    const s = step4a();
    assert.match(s, /before calling the Workflow tool[\s\S]{0,300}"sequential"/i);
    assert.match(s, /declin[\s\S]{0,300}wait/i);
    assert.match(s, /refus[\s\S]{0,200}headless[\s\S]{0,200}Step 4/i);
});

test("execute Step 4a: implement agents create files with Write/Edit and use Bash only for Validation", () => {
    assert.match(step4a(), /Write and Edit tools; use Bash only to run the Validation command/);
});
