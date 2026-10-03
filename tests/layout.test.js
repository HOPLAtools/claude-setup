// Guard test for the 3.0 plugin layout: every command and guide is a skill,
// nothing is nested (Claude Code does not load skills/<a>/<b>/SKILL.md), and no
// plugin file still points at the old commands/ paths.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const FORMER_COMMANDS = ["archive", "create-prd", "execute", "guide", "init-project",
    "plan-feature", "rca", "review-plan", "system-review", "validate"];
const GUIDES = ["ai-optimized-codebase", "data-audit", "hooks-reference", "mcp-integration", "remote-coding",
    "review-checklist", "scaling-beyond-engineering", "validation-pyramid", "write-skill"];

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(md|js|json)$/.test(e.name)) out.push(p);
    }
    return out;
}

test("layout: commands/ is gone", () => {
    assert.ok(!fs.existsSync(path.join(ROOT, "commands")));
});

test("layout: former commands and guides are skills at their new paths", () => {
    for (const c of FORMER_COMMANDS) {
        assert.ok(fs.existsSync(path.join(ROOT, "skills", c, "SKILL.md")), `skills/${c}/SKILL.md`);
    }
    for (const g of GUIDES) {
        assert.ok(fs.existsSync(path.join(ROOT, "skills", `guides-${g}`, "SKILL.md")), `skills/guides-${g}/SKILL.md`);
    }
});

test("layout: no nested skills (not loaded by Claude Code)", () => {
    const nested = [];
    for (const d of fs.readdirSync(path.join(ROOT, "skills"), { withFileTypes: true })) {
        if (!d.isDirectory()) continue;
        for (const e of fs.readdirSync(path.join(ROOT, "skills", d.name), { withFileTypes: true })) {
            if (e.isDirectory() && fs.existsSync(path.join(ROOT, "skills", d.name, e.name, "SKILL.md"))) {
                nested.push(`skills/${d.name}/${e.name}`);
            }
        }
    }
    assert.deepEqual(nested, []);
});

// `commands/` not preceded by `.claude/` (project-level `.claude/commands/` and the
// CLI's legacy `~/.claude/commands/` cleanup are still valid mentions).
const OLD_PATH = /(?<!\.claude\/)\bcommands\/(guides\/|[a-z-]+\.md)/;

test("layout: plugin files no longer reference the old commands/ paths", () => {
    const files = [
        ...walk(path.join(ROOT, "skills")), ...walk(path.join(ROOT, "agents")), ...walk(path.join(ROOT, "hooks")),
        path.join(ROOT, "cli.js"),
    ];
    const hits = [];
    for (const f of files) {
        fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
            if (OLD_PATH.test(line)) hits.push(`${path.relative(ROOT, f)}:${i + 1}: ${line.trim().slice(0, 100)}`);
        });
    }
    assert.deepEqual(hits, []);
});
