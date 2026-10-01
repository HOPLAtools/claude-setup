// Guard test for skill / command / guide / agent frontmatter. `claude plugin
// validate` does not catch unknown fields or wrong agent names, so this test
// pins the 2.2 rules. Expected sets are constants: adding a fork or a
// manual-only command must be a conscious edit here.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFrontmatter, bodyOf, readJson } from "./helpers/fixtures.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const list = (dir, pick) => fs.readdirSync(path.join(ROOT, dir)).map((f) => pick(path.join(ROOT, dir, f))).filter(Boolean);

const SKILLS = list("skills", (d) => (fs.existsSync(path.join(d, "SKILL.md")) ? path.join(d, "SKILL.md") : null));
const COMMANDS = list("commands", (f) => (f.endsWith(".md") ? f : null));
const GUIDES = list("commands/guides", (f) => (f.endsWith(".md") ? f : null));
const AGENTS = list("agents", (f) => (f.endsWith(".md") ? f : null));
const ALL = [...SKILLS, ...COMMANDS, ...GUIDES, ...AGENTS];
const SKILLS_AND_COMMANDS = [...SKILLS, ...COMMANDS];

const PLUGIN_NAME = readJson(path.join(ROOT, ".claude-plugin", "plugin.json")).name;

const FORKS = {
    "skills/prime/SKILL.md": { model: "haiku", agent: `${PLUGIN_NAME}:codebase-researcher` },
    "skills/hook-audit/SKILL.md": { model: "sonnet" },
    "commands/system-review.md": { model: "sonnet" },
};
const INHERIT = [
    "skills/git/SKILL.md", "skills/tdd/SKILL.md", "skills/verify/SKILL.md", "skills/worktree/SKILL.md",
    "skills/brainstorm/SKILL.md", "skills/debug/SKILL.md", "skills/execution-report/SKILL.md",
    "commands/review-plan.md", "commands/plan-feature.md", "commands/execute.md", "commands/rca.md",
    "commands/archive.md", "commands/code-review-fix.md", "commands/validate.md",
];
const MANUAL_ONLY = [
    "commands/guide.md", "commands/create-prd.md", "commands/init-project.md",
    "commands/execute.md", "commands/archive.md",
];
const WHEN_TO_USE_COMMANDS = ["plan-feature", "rca", "review-plan", "validate", "system-review"];
const NO_WHEN_TO_USE_COMMANDS = ["execute", "archive", "code-review-fix"];
const ARGUMENTS = {
    "commands/system-review.md": "[plan, report]",
    "commands/archive.md": "[plan]",
    "commands/review-plan.md": "[plan]",
    "commands/execute.md": "[plan]",
};

const fm = (file) => readFrontmatter(file);

test("frontmatter: every skill/command/guide/agent has a description", () => {
    for (const f of ALL) {
        const m = fm(f);
        assert.ok(m, `${rel(f)} has no frontmatter`);
        assert.ok(m.description && m.description.length > 0, `${rel(f)} has no description`);
    }
});

test("frontmatter: no `triggers` key anywhere", () => {
    const bad = ALL.filter((f) => "triggers" in (fm(f) || {})).map(rel);
    assert.deepEqual(bad, []);
});

test("frontmatter: every skill has name = dir and a when_to_use", () => {
    for (const f of SKILLS) {
        const m = fm(f);
        assert.equal(m.name, path.basename(path.dirname(f)), rel(f));
        assert.ok(m.when_to_use && m.when_to_use.length > 0, `${rel(f)} has no when_to_use`);
    }
});

test("frontmatter: description/when_to_use length budgets", () => {
    for (const f of SKILLS_AND_COMMANDS) {
        const m = fm(f);
        const combined = `${m.description} ${m.when_to_use || ""}`.trim();
        assert.ok(m.description.length <= 1024, `${rel(f)} description > 1024`);
        assert.ok(combined.length <= 1536, `${rel(f)} description + when_to_use > 1536`);
        assert.ok(combined.length <= 600, `${rel(f)} description + when_to_use = ${combined.length} > 600 (project target)`);
        for (const k of ["description", "when_to_use"]) {
            if (m[k]) assert.doesNotMatch(m[k], /["\\]/, `${rel(f)} ${k} contains a quote or backslash`);
        }
    }
});

test("frontmatter: model iff context: fork, only on the expected forks", () => {
    const forks = {};
    for (const f of SKILLS_AND_COMMANDS) {
        const m = fm(f);
        assert.equal("model" in m, m.context === "fork", `${rel(f)}: model must appear iff context: fork`);
        if (m.context === "fork") forks[rel(f)] = m;
    }
    assert.deepEqual(Object.keys(forks).sort(), Object.keys(FORKS).sort());
    for (const [file, want] of Object.entries(FORKS)) {
        const m = forks[file];
        assert.equal(m.model, want.model, `${file} model`);
        assert.equal(m.background, "false", `${file} needs background: false`);
        if (want.agent) assert.equal(m.agent, want.agent, `${file} agent`);
    }
});

test("frontmatter: inherit-model files have no model/context/agent/background", () => {
    for (const f of INHERIT) {
        const m = fm(path.join(ROOT, f));
        for (const k of ["model", "context", "agent", "background"]) {
            assert.ok(!(k in m), `${f} must not set ${k}`);
        }
    }
});

test("frontmatter: disable-model-invocation exactly on the manual-only commands", () => {
    const flagged = SKILLS_AND_COMMANDS.filter((f) => fm(f)["disable-model-invocation"] === "true").map(rel).sort();
    assert.deepEqual(flagged, [...MANUAL_ONLY].sort());
});

test("frontmatter: when_to_use on model-invocable commands, not on execute/archive/code-review-fix", () => {
    for (const c of WHEN_TO_USE_COMMANDS) {
        assert.ok(fm(path.join(ROOT, "commands", `${c}.md`)).when_to_use, `${c} needs when_to_use`);
    }
    for (const c of NO_WHEN_TO_USE_COMMANDS) {
        assert.ok(!("when_to_use" in fm(path.join(ROOT, "commands", `${c}.md`))), `${c} must not have when_to_use`);
    }
});

test("frontmatter: no positional $<digit> placeholder in skill or command bodies", () => {
    const bad = SKILLS_AND_COMMANDS.filter((f) => /\$[0-9]/.test(bodyOf(f))).map(rel);
    assert.deepEqual(bad, []);
});

test("frontmatter: named arguments", () => {
    for (const [file, args] of Object.entries(ARGUMENTS)) {
        const m = fm(path.join(ROOT, file));
        assert.equal(m.arguments, args, `${file} arguments`);
        const body = bodyOf(path.join(ROOT, file));
        for (const name of args.replace(/[[\]\s]/g, "").split(",")) {
            assert.ok(body.includes(`$${name}`), `${file} body must use $${name}`);
        }
    }
});

test("frontmatter: agent references are plugin-scoped; codebase-researcher runs on haiku", () => {
    for (const f of SKILLS_AND_COMMANDS) {
        const m = fm(f);
        if (!m.agent) continue;
        const [prefix, name] = m.agent.split(":");
        assert.equal(prefix, PLUGIN_NAME, `${rel(f)} agent must be ${PLUGIN_NAME}:<name>`);
        assert.ok(fs.existsSync(path.join(ROOT, "agents", `${name}.md`)), `${rel(f)} agent ${name} not found`);
    }
    const researcher = fm(path.join(ROOT, "agents", "codebase-researcher.md"));
    assert.equal(researcher.name, "codebase-researcher");
    assert.equal(researcher.model, "haiku");
});
