// Guard test for /hopla:execution-report (4.1.3): the report names its plan
// by slug and gives both locations, so it stays correct after /hopla:archive
// moves the plan to done/ (cited a stale path in 4.1.0, 4.1.1 and 4.1.2).

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const structure = fs.readFileSync(path.join(ROOT, "skills", "execution-report", "report-structure.md"), "utf8");

test("execution-report: the report names its plan by slug, with the path before and after archive", () => {
    const meta = structure.slice(structure.indexOf("## Meta Information"), structure.indexOf("## Validation Results"));
    assert.match(meta, /\*\*Plan:\*\*[^\n]*slug/i);
    assert.match(meta, /<plans-dir>\/<slug>\.md/);
    assert.match(meta, /<plans-dir>\/done\/<slug>\.md/);
    assert.match(meta, /archive/i);
    assert.doesNotMatch(meta, /\*\*Plan file:\*\* \[path to the plan/);
});
