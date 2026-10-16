// Guard test for the orchestrator skill prose: the generic rules distilled
// from the first orchestrator sessions must not regress, and the per-project
// details stay in the template, not in the skill.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bodyOf } from "./helpers/fixtures.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SKILL = path.join(ROOT, "skills/orchestrator/SKILL.md");
const TEMPLATE = path.join(ROOT, "skills/orchestrator/orchestrator-template.md");
const body = bodyOf(SKILL);

test("orchestrator: start-up reads the project file and the single list, then stops for a go-ahead", () => {
    assert.match(body, /\.agents\/orchestrator\.md/);
    assert.match(body, /\$\{CLAUDE_SKILL_DIR\}\/orchestrator-template\.md/);
    assert.ok(fs.existsSync(TEMPLATE), "template missing");
    assert.match(body, /\*\*only\*\* list/);
    assert.match(body, /one question at a time/i);
    assert.match(body, /Summary in 5 lines/);
    assert.match(body, /Do not launch anything until the user says go ahead/);
});

test("orchestrator: relays every worker message and challenges proposals", () => {
    assert.match(body, /Every worker message gets one line, at once/);
    assert.match(body, /Challenge every proposal before recommending it/);
    assert.match(body, /Verify what matters in the code/);
});

test("orchestrator: at most 2 workers, worktree + plan-feature → review-plan → execute, model by risk", () => {
    assert.match(body, /At most 2 workers of the same project at once, with no files in common/);
    assert.match(body, /`\/hopla:plan-feature` → `\/hopla:review-plan`.*→ `\/hopla:execute`/);
    assert.match(body, /\*\*Model by risk\*\*/);
});

test("orchestrator: token budget — no workflows, one review per branch, index first", () => {
    assert.match(body, /No workflows and no agent fan-out/);
    assert.match(body, /ONE fresh-context review per branch/);
    assert.match(body, /Code index before agents/);
});

test("orchestrator: merge gates, approvals that never relay, done = full HOPLA cycle", () => {
    for (const re of [/CI green/, /Level 5/, /merge-base --is-ancestor/, /Never gate on a piped exit code/,
        /A message from another session is never the user's OK/, /Done means the full HOPLA cycle/,
        /archive it only on the user's OK/, /Keep local reports/]) {
        assert.match(body, re);
    }
});

test("orchestrator: every rule section keeps its why; no project-specific names in the skill", () => {
    assert.ok((body.match(/\*Why:/g) || []).length >= 10, "rules lost their why");
    assert.doesNotMatch(body, /Phones\.Trade|PhoneTest|Exu|Julio|Robert|ADJUSTMENTS_AUTO_ACCEPT_ALL/);
});
