// Guard test for /hopla:review-plan: before execution, the summary flags the
// plan gaps that caused plan-incompleteness in 04c, 2.2, 2.4 and 3.0.0.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const body = fs.readFileSync(path.join(ROOT, "skills", "review-plan", "SKILL.md"), "utf8");

test("review-plan: has a completeness check before the approval step", () => {
    const i = body.indexOf("### Completeness check");
    assert.ok(i !== -1, "missing ### Completeness check");
    assert.ok(i < body.indexOf("## Step 3"), "must come before Step 3");
});

for (const [label, re] of [
    ["dependents and old names", /dependents.*old names/i],
    ["platform claims spiked", /platform claim.*(spike|Task 0)/i],
    ["tests per commit", /tests? (per|in each) commit/i],
    ["[Unreleased] merged", /\[Unreleased\]/],
    ["human check states what ships unobserved", /human check[\s\S]{0,200}ships unobserved/i],
    ["human check names who runs it and when", /human check[\s\S]{0,300}who runs it and when/i],
    ["requirements coverage", /Requirements coverage[\s\S]{0,200}(task|test)/i],
]) {
    test(`review-plan: completeness check covers ${label}`, () => assert.match(body, re));
}

test("review-plan: gaps go to Watch out for, one line each, nothing when complete", () => {
    assert.match(body, /one line per gap/i);
    assert.match(body, /Nothing flagged/);
});

// 4.2: the approval is a reply button when the host offers one, and an
// approval invokes the execute skill instead of asking the user to type it.
test("review-plan Step 3: approval question with buttons, text fallback", () => {
    const s = body.slice(body.indexOf("## Step 3"));
    assert.match(s, /reply buttons[\s\S]{0,300}"Yes, execute"[\s\S]{0,200}"Not yet"/);
    assert.match(s, /never start with `\/`/);
    assert.match(s, /Without them:\*\* ask in text/);
});

test("review-plan Step 3: an explicit approval invokes hopla:execute with the plan, only from the user", () => {
    const s = body.slice(body.indexOf("**Review loop:**"));
    assert.match(s, /explicitly approves[\s\S]{0,200}invoke the `hopla:execute` skill[\s\S]{0,60}\$plan/);
    assert.match(s, /another session, an agent or a hook is never approval/);
    assert.match(s, /run `\/hopla:execute \$plan`/);
    assert.match(s, /declines[\s\S]{0,40}stop/);
});
