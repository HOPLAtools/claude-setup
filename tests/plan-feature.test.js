// Guard test for /hopla:plan-feature prose: the two research rules added after
// the 2.2 / 2.4 system reviews (plan-incompleteness, 3 occurrences) must stay
// in Phase 3 and in the Phase 6 checklist.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const body = fs.readFileSync(path.join(ROOT, "skills", "plan-feature", "SKILL.md"), "utf8");

function section(start, end) {
    const i = body.indexOf(start);
    assert.ok(i !== -1, `missing ${start}`);
    const j = body.indexOf(end, i + start.length);
    return body.slice(i, j === -1 ? undefined : j);
}

test("plan-feature: Phase 3 requires a dependents grep for changed rules", () => {
    const phase3 = section("## Phase 3:", "## Phase 4:");
    assert.match(phase3, /### Dependents of a changed rule \(required\)/);
    assert.match(phase3, /fixtures/i);
    assert.match(phase3, /\[Unreleased\]/);
});

test("plan-feature: Phase 3 requires a verification spike for platform claims", () => {
    const phase3 = section("## Phase 3:", "## Phase 4:");
    assert.match(phase3, /### Verification spike for platform claims \(required\)/);
    assert.match(phase3, /bypass/i);
    assert.match(phase3, /Task 0/);
});

test("plan-feature: Phase 6 checklist covers both rules", () => {
    const phase6 = section("## Phase 6:", "## Phase 7:");
    assert.match(phase6, /\*\*Dependents listed:\*\*/);
    assert.match(phase6, /\*\*Platform claims spiked:\*\*/);
});

test("plan-feature: the dependents search also covers the old names of renamed or moved files", () => {
    const phase3 = section("## Phase 3:", "## Phase 4:");
    assert.match(phase3, /old names? of (every )?(renamed|moved)/i);
});

test("plan-feature: phased plans say which test file lands in which commit and never commit a RED test", () => {
    const size = section("### Plan Size Check", "## Phase 6:");
    assert.match(size, /which test files? lands? in/i);
    assert.match(size, /never commit a RED test/i);
    const phase6 = section("## Phase 6:", "## Phase 7:");
    assert.match(phase6, /\*\*Tests per commit:\*\*/);
});

test("plan-feature: the dependents search covers docs that describe a changed file by name", () => {
    const phase3 = section("## Phase 3:", "## Phase 4:");
    assert.match(phase3, /changes the behavior of a file/i);
    assert.match(phase3, /SECURITY\.md.*README.*CLAUDE\.md/s);
});

test("plan-feature: spikes check the positive side of a negative claim and run in the plan's real shape", () => {
    const phase3 = section("## Phase 3:", "## Phase 4:");
    assert.match(phase3, /negative/i);
    assert.match(phase3, /positive side/i);
    assert.match(phase3, /real shape/i);
    assert.match(phase3, /already committed/i);
});

test("plan-feature: spikes of agents or workflows that write files check where they write", () => {
    const phase3 = section("## Phase 3:", "## Phase 4:");
    assert.match(phase3, /where they write/i);
    assert.match(phase3, /absolute/i);
});

test("plan-feature: task Validate commands are task-scoped; the whole suite runs once at the end", () => {
    assert.match(body, /task-scoped/i);
    assert.match(body, /whole suite/i);
});
