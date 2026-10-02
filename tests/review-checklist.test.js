// Guard test for this repo's own review checklist (.agents/guides/review-checklist.md),
// applied by the code-review skill's checklist pass. It encodes the patterns the
// system reviews found repeatedly (plan incompleteness: 6 occurrences by 3.2.0).

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const file = path.join(ROOT, ".agents", "guides", "review-checklist.md");

test("review-checklist: exists", () => assert.ok(fs.existsSync(file)));

for (const [label, re] of [
    ["dependents of a changed rule, incl. old names and docs naming a file", /old names[\s\S]*SECURITY\.md/i],
    ["placeholders in skill prose", /placeholder/i],
    ["version files and CHANGELOG [Unreleased]", /\[Unreleased\]/],
    ["hooks: execFileSync and tmp files with O_NOFOLLOW", /execFileSync[\s\S]*O_NOFOLLOW/],
    ["workflows: absolute project root", /absolute project root/i],
    ["deprecated items not recommended", /deprecated/i],
    ["plan fixtures are real plans", /PLAN_MD/],
]) {
    test(`review-checklist: covers ${label}`, () => assert.match(fs.readFileSync(file, "utf8"), re));
}

test("guides-review-checklist: no doubled article left from earlier rewrites", () => {
    const guide = fs.readFileSync(path.join(ROOT, "skills", "guides-review-checklist", "SKILL.md"), "utf8");
    assert.doesNotMatch(guide, /\b(The the|A the)\b/);
});
