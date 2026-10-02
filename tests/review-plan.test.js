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
]) {
    test(`review-plan: completeness check covers ${label}`, () => assert.match(body, re));
}

test("review-plan: gaps go to Watch out for, one line each, nothing when complete", () => {
    assert.match(body, /one line per gap/i);
    assert.match(body, /Nothing flagged/);
});
