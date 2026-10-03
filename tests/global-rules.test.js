// Guard test for global-rules.md (installed to every CLI user's
// ~/.claude/CLAUDE.md): the 3.4 "Models, Effort & Cost" section exists once,
// stays short, keeps the cost rules, and does not duplicate the /clear rule
// that Context control already has.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const body = fs.readFileSync(path.join(ROOT, "global-rules.md"), "utf8");
const HEADING = "## 6. Models, Effort & Cost";

function section() {
    const i = body.indexOf(HEADING);
    assert.ok(i !== -1, `missing ${HEADING}`);
    const rest = body.slice(i + HEADING.length);
    const end = rest.search(/\n---\n|\n## /);
    return HEADING + (end === -1 ? rest : rest.slice(0, end));
}

test("global-rules: the Models, Effort & Cost section exists once and is short", () => {
    assert.equal(body.split(HEADING).length - 1, 1);
    assert.ok(section().trim().split("\n").length <= 15, `${section().trim().split("\n").length} lines`);
});

for (const [label, re] of [
    ["Opus by default at medium effort", /Opus[\s\S]{0,80}medium/],
    ["xhigh only for architecture", /xhigh[\s\S]{0,60}architecture/i],
    ["Fable only on purpose", /Fable[\s\S]{0,60}only[\s\S]{0,30}on purpose/i],
    ["Fable never in -p or background", /never in `(claude )?-p`[\s\S]{0,40}background/i],
    ["ultracode for audits, migrations and research", /ultracode[\s\S]{0,160}audits[\s\S]{0,40}migrations[\s\S]{0,60}research/i],
    ["1 h cache on a subscription, 5 min with an API key", /1 h[\s\S]{0,80}subscription[\s\S]{0,80}5 min/i],
]) {
    test(`global-rules: section covers ${label}`, () => assert.match(section(), re));
}

test("global-rules: /clear is not duplicated", () => {
    assert.equal(body.split("/clear").length - 1, 1);
});
