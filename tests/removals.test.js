// Guard test for the 4.0.0 removals: the items deprecated in 3.x and their
// notifier are gone, nothing recommends them any more (README's "Removed in
// 4.0.0" table and the CHANGELOG are the only places that name them), and the
// rules only they had live on in their survivors (code-review, tdd).

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const REMOVED_SKILLS = ["parallel-dispatch", "subagent-execution", "refactoring", "code-review-fix", "migration"];
const REMOVED_AGENTS = ["code-reviewer", "system-reviewer"];

test("removals: the deprecated skills and agents are gone; codebase-researcher stays", () => {
    for (const s of REMOVED_SKILLS) assert.ok(!fs.existsSync(path.join(ROOT, "skills", s)), `skills/${s}`);
    for (const a of REMOVED_AGENTS) assert.ok(!fs.existsSync(path.join(ROOT, "agents", `${a}.md`)), `agents/${a}.md`);
    assert.ok(fs.existsSync(path.join(ROOT, "agents", "codebase-researcher.md")));
});

test("removals: the deprecation notifier and its hook entries are gone", () => {
    assert.ok(!fs.existsSync(path.join(ROOT, "hooks", "deprecation-notice.js")));
    const hooks = read("hooks/hooks.json");
    assert.doesNotMatch(hooks, /deprecation-notice/);
    assert.ok(!("UserPromptSubmit" in JSON.parse(hooks).hooks));
});

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(md|js|json)$/.test(e.name)) out.push(p);
    }
    return out;
}

test("removals: no plugin file, doc or CLI recommends a removed skill or agent", () => {
    const names = [...REMOVED_SKILLS.map((s) => `hopla:${s}`), ...REMOVED_AGENTS.map((a) => `hopla:${a}`),
        ...REMOVED_SKILLS.map((s) => `skills/${s}/`)];
    const files = [...walk(path.join(ROOT, "skills")), ...walk(path.join(ROOT, "agents")), ...walk(path.join(ROOT, "hooks")),
        ...["cli.js", "global-rules.md", "SECURITY.md", "CLAUDE.md", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"].map((f) => path.join(ROOT, f))];
    const hits = [];
    for (const f of files) {
        fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
            if (names.some((n) => line.includes(n))) hits.push(`${path.relative(ROOT, f)}:${i + 1}`);
        });
    }
    assert.deepEqual(hits, []);
});

test("removals: README names the removed items only in its Removed in 4.0.0 table", () => {
    const readme = read("README.md");
    assert.match(readme, /\*\*Removed in 4\.0\.0\*\*/);
    const start = readme.indexOf("**Removed in 4.0.0**");
    const end = readme.indexOf("\n\n**", start + 1);
    const outside = readme.slice(0, start) + readme.slice(end);
    for (const n of [...REMOVED_SKILLS, ...REMOVED_AGENTS]) {
        assert.ok(!new RegExp("`(hopla:)?" + n + "`").test(outside), `README mentions ${n} outside the Removed table`);
    }
    assert.doesNotMatch(readme, /Deprecated in 3\.0\.0/);
    assert.doesNotMatch(readme, /deprecation-notice/);
});

test("removals: plugin descriptions no longer advertise subagent execution", () => {
    assert.doesNotMatch(read(".claude-plugin/plugin.json"), /subagent execution/i);
    assert.doesNotMatch(read(".claude-plugin/marketplace.json"), /subagent execution/i);
});

const section = (body, start) => {
    const i = body.indexOf(start);
    assert.ok(i !== -1, `missing ${start}`);
    const next = body.indexOf("\n## ", i + start.length);
    return body.slice(i, next === -1 ? undefined : next);
};

test("removals: code-review --fix verifies, pushes back, applies YAGNI and validates (from code-review-fix)", () => {
    const step5 = section(read("skills/code-review/SKILL.md"), "## Step 5");
    assert.match(step5, /verify/i);
    assert.match(step5, /false positive/i);
    assert.match(step5, /YAGNI/);
    assert.match(step5, /validation/i);
});

test("removals: code-review checks alignment with the plan (from the code-reviewer agent)", () => {
    const step3 = section(read("skills/code-review/SKILL.md"), "## Step 3");
    assert.match(step3, /deviations? from (it|the plan)/i);
});

test("removals: tdd keeps the refactoring discipline (from the refactoring skill)", () => {
    const refactoring = section(read("skills/tdd/SKILL.md"), "## Refactoring");
    for (const re of [/behavior/i, /green before and after/i, /characterization/i, /one refactor per commit/i]) {
        assert.match(refactoring, re, String(re));
    }
});
