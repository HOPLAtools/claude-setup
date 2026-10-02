// Guard test for the git skill prose: every "ask before commit / push / PR"
// step must honor a standing approval the user granted for that exact action
// (CLAUDE.md or ~/.claude/rules/). The team default stays "ask".

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// The rule each gated step must point to.
const RULE = /standing approval/i;

test("git skill: commit.md and pr.md define the standing-approval rule once, with its sources", () => {
    for (const file of ["skills/git/commit.md", "skills/git/pr.md"]) {
        const body = read(file);
        assert.match(body, /## Standing approvals/, `${file}: missing section`);
        assert.match(body, /CLAUDE\.md/, file);
        assert.match(body, /~\/\.claude\/rules\//, file);
        assert.match(body, /report/i, `${file}: approved actions must be reported`);
    }
});

test("git skill: every wait-for-approval line mentions the standing approval", () => {
    for (const file of ["skills/git/commit.md", "skills/git/pr.md"]) {
        const gated = read(file).split("\n")
            .filter((l) => /\b(wait for|never push)\b/i.test(l) && /\b(commit|push|creat)/i.test(l));
        assert.ok(gated.length > 0, `${file}: no gated lines found`);
        for (const line of gated) assert.match(line, RULE, `${file}: ${line}`);
    }
});

test("git skill: merging stays a human action; global-rules.md is unchanged", () => {
    assert.match(read("skills/git/pr.md"), /\*\*Never merge automatically\*\*/);
    assert.match(read("global-rules.md"), /Auto-commit or auto-push without explicit approval/);
});
