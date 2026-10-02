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

test("code-reviewer agent returns its report for the caller to save", () => {
    const body = read("agents/code-reviewer.md");
    assert.match(body, /final message/i);
    assert.match(body, /\.agents\/code-reviews\//);
});

test("execute: Level 5 passes only when the review file exists, also when delegated to the agent", () => {
    const body = read("commands/execute.md");
    assert.ok(body.includes(REVIEW_PATH), "execute.md must name the review file");
    assert.match(body, /hopla:code-reviewer/);
    assert.match(body, /Level 5 Code Review: ✅ `\.agents\/code-reviews\/<plan-slug>\.md`/);
});

test("validation pyramid and code-review skill save the review even when clean", () => {
    assert.ok(read("commands/guides/validation-pyramid.md").includes(REVIEW_PATH));
    const skill = read("skills/code-review/SKILL.md");
    assert.ok(skill.includes(REVIEW_PATH));
    assert.match(skill, /even when (it passes|no issues)/i);
});
