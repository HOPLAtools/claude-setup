// Guard test: a code review always leaves a file at
// .agents/code-reviews/<plan-slug>.md. It was lost twice (2.2, 2.4): the
// hopla:code-reviewer agent was told to save a file it cannot write (no Write
// tool), and /hopla:execute never checked that the file existed.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFrontmatter } from "./helpers/fixtures.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const REVIEW_PATH = ".agents/code-reviews/<plan-slug>.md";

test("agents without a Write tool are never told to save a file", () => {
    for (const f of fs.readdirSync(path.join(ROOT, "agents")).filter((n) => n.endsWith(".md"))) {
        const file = path.join(ROOT, "agents", f);
        const tools = String(readFrontmatter(file)?.tools ?? "");
        if (!tools || /\b(Write|Edit)\b/.test(tools)) continue;
        assert.doesNotMatch(fs.readFileSync(file, "utf8"), /\bsave\b[^\n]*\bto `?\.agents\//i, `agents/${f}`);
    }
});

test("execute: Level 5 passes only when the review file exists, also when a subagent did the review", () => {
    const body = read("skills/execute/SKILL.md");
    assert.ok(body.includes(REVIEW_PATH), "execute.md must name the review file");
    assert.match(body, /subagent/i);
    assert.match(body, /Level 5 Code Review: ✅ `\.agents\/code-reviews\/<plan-slug>\.md`/);
});

test("validation pyramid and code-review skill save the review even when clean", () => {
    assert.ok(read("skills/guides-validation-pyramid/SKILL.md").includes(REVIEW_PATH));
    const skill = read("skills/code-review/SKILL.md");
    assert.ok(skill.includes(REVIEW_PATH));
    assert.match(skill, /even when (it passes|no issues)/i);
});

// 3.1: the code-review skill wraps the native /code-review.
const WRAPPER = () => read("skills/code-review/SKILL.md");

test("code-review wrapper: runs the native review through the Skill tool with effort and --fix", () => {
    const body = WRAPPER();
    assert.match(body, /Skill tool/);
    assert.match(body, /skill `code-review`/);
    assert.match(body, /--fix/);
    assert.match(body, /\bmedium\b/, "default effort");
    assert.match(body, /never `low`/i);
    assert.match(body, /never invoke `hopla:code-review`/i, "no recursion");
});

test("code-review wrapper: checklist pass with the HOPLA and project checklists, duplicates dropped", () => {
    const body = WRAPPER();
    assert.match(body, /checklist\.md/);
    assert.match(body, /\.agents\/guides\/review-checklist\.md/);
    assert.match(body, /duplicate/i);
});

test("code-review wrapper: 0-100 confidence, threshold 80, dropped findings listed", () => {
    const body = WRAPPER();
    assert.match(body, /0[–-]100/);
    assert.match(body, /\b80\b/);
    assert.match(body, /Dropped \(low confidence\)/);
    assert.match(body, /^confidence: /m);
    assert.match(body, /^source: native \| checklist/m);
    assert.match(body, /^outcome: /m);
});

test("code-review wrapper: passes a review target (branch, PR number or path) through to the native review", () => {
    const body = WRAPPER();
    assert.match(body, /target/i);
    assert.match(body, /branch, PR number or path/i);
    assert.match(body, /committed/i, "explains why a phased plan needs a target");
});

test("code-review wrapper: native findings come from ReportFindings when available, else from its text", () => {
    const body = WRAPPER();
    assert.match(body, /ReportFindings.*when .*available/i);
    assert.match(body, /as text/i);
});
