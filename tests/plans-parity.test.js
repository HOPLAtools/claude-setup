// Parity tests: cli.js keeps its own copy of the plans helpers (single-file
// rule, CLAUDE.md §4) while hooks import hooks/lib/plans.js. Both copies must
// return identical results. Also covers findActivePlan edge cases.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import * as cli from "../cli.js";
import * as lib from "../hooks/lib/plans.js";
import { makeTempDir, rmDir, writeText } from "./helpers/fixtures.js";

const FNS = ["parsePlansDeclaration", "resolvePlansDir", "findActivePlan",
    "readActivePlanPointer", "getActivePlan"];

test("both copies export the five plans helpers", () => {
    for (const fn of FNS) {
        assert.equal(typeof cli[fn], "function", `cli.js missing ${fn}`);
        assert.equal(typeof lib[fn], "function", `hooks/lib/plans.js missing ${fn}`);
    }
});

const DECLARATIONS = [
    "## HOPLA\n- Plans: docs/plans/\n",
    "## HOPLA\n- Plans: `docs/plans`\n",
    "## hopla\n* plans:   docs/plans  \n",
    "## Other\n- Plans: docs/plans\n",
    "## HOPLA\n- Foo: bar\n## Next\n- Plans: docs/plans\n",
    "## HOPLA\n### Paths\n- Plans: docs/plans\n",
    "```markdown\n## HOPLA\n- Plans: docs/plans/\n```\n",
    "## HOPLA\n```\n- Plans: bad\n```\n- Plans: good\n",
    "## HOPLA\r\n- Plans: docs/plans/\r\n",
    "## HOPLA\n- Plans: docs\\plans\n",
    "## HOPLA\n- Plans: `docs/my plans/` (x)\n",
    "## HOPLA\n- Plans: ../outside\n",
    "## HOPLA\n- Plans: ~/plans\n",
    "## HOPLA\n- Plans: $HOME/plans\n",
    "## HOPLA\n- Plans: C:\\plans\n",
    "## HOPLA\n- Plans:\n",
    "",
];

for (const md of DECLARATIONS) {
    test(`parity parsePlansDeclaration ${JSON.stringify(md)}`, () => {
        assert.deepEqual(cli.parsePlansDeclaration(md), lib.parsePlansDeclaration(md));
    });
}

function withTmp(fn) {
    const tmp = makeTempDir("hopla-parity-");
    try {
        return fn(tmp);
    } finally {
        rmDir(tmp);
    }
}

// Fixed reference so "equal mtimes" fixtures really are equal.
const NOW = Math.floor(Date.now() / 1000) * 1000;
function setMtime(file, hoursAgo) {
    const t = new Date(NOW - hoursAgo * 3600 * 1000);
    fs.utimesSync(file, t, t);
}

// The mtime fallback only picks files that look like plans.
const PLAN = "# p\n\n## Implementation Tasks\n\n### Task 1: x\n";

function baseProject(tmp) {
    writeText(path.join(tmp, "AGENTS.md"), "## HOPLA\n- Plans: docs/plans\n");
    writeText(path.join(tmp, "docs", "plans", "a.md"), PLAN);
    writeText(path.join(tmp, "docs", "plans", "done", "old.md"), "# old\n");
}

const POINTERS = [
    ["none", null],
    ["valid", { plan: "docs/plans/a.md", step: "Task 2", status: "executing" }],
    ["valid no step", { plan: "docs/plans/a.md", status: "planned" }],
    ["missing file", { plan: "docs/plans/zzz.md", status: "executing" }],
    ["done dir", { plan: "docs/plans/done/old.md", status: "executing" }],
    ["status done", { plan: "docs/plans/a.md", status: "done" }],
    ["malformed", "{ nope"],
    ["unsafe", { plan: "../x.md", status: "executing" }],
    ["backslashes", { plan: "docs\\plans\\a.md", status: "executing" }],
    ["multiline step", { plan: "docs/plans/a.md", step: "Task 3:\n\tdo\u0007 it", status: "executing" }],
    ["long step", { plan: "docs/plans/a.md", step: "Task 9: " + "word ".repeat(40), status: "executing" }],
    ["blank step", { plan: "docs/plans/a.md", step: " \n\t ", status: "executing" }],
];

for (const [label, ptr] of POINTERS) {
    test(`parity pointer/resolve/getActivePlan (${label})`, () => withTmp((tmp) => {
        baseProject(tmp);
        if (ptr !== null) {
            writeText(path.join(tmp, ".agents", "hopla-active-plan.json"),
                typeof ptr === "string" ? ptr : JSON.stringify(ptr));
        }
        assert.deepEqual(cli.resolvePlansDir(tmp), lib.resolvePlansDir(tmp));
        assert.deepEqual(cli.readActivePlanPointer(tmp), lib.readActivePlanPointer(tmp));
        assert.deepEqual(cli.getActivePlan(tmp), lib.getActivePlan(tmp));
    }));
}

test("getActivePlan: valid pointer -> source pointer", () => withTmp((tmp) => {
    baseProject(tmp);
    writeText(path.join(tmp, ".agents", "hopla-active-plan.json"),
        JSON.stringify({ plan: "docs/plans/a.md", step: "Task 2", status: "executing" }));
    assert.deepEqual(lib.getActivePlan(tmp), { path: "docs/plans/a.md", step: "Task 2", source: "pointer" });
}));

test("readActivePlanPointer: step is a single sanitized line of at most 80 chars", () => withTmp((tmp) => {
    baseProject(tmp);
    const ptr = path.join(tmp, ".agents", "hopla-active-plan.json");
    writeText(ptr, JSON.stringify({ plan: "docs/plans/a.md", step: "Task 3:\n\tdo\u0007 it", status: "executing" }));
    assert.equal(lib.readActivePlanPointer(tmp).step, "Task 3: do it");
    writeText(ptr, JSON.stringify({ plan: "docs/plans/a.md", step: "Task 9: " + "word ".repeat(40), status: "executing" }));
    const step = lib.readActivePlanPointer(tmp).step;
    assert.ok(step.length <= 80, String(step.length));
    assert.ok(step.endsWith("…"));
}));

test("getActivePlan: no pointer -> newest by mtime", () => withTmp((tmp) => {
    baseProject(tmp);
    assert.deepEqual(lib.getActivePlan(tmp), { path: "docs/plans/a.md", step: null, source: "mtime" });
}));

test("getActivePlan: empty project -> null", () => withTmp((tmp) => {
    assert.equal(lib.getActivePlan(tmp), null);
}));

// --- findActivePlan fixtures ---------------------------------------------

const FIND_CASES = [
    ["missing dir", () => {}, null],
    ["empty dir", (d) => fs.mkdirSync(d, { recursive: true }), null],
    ["drafts only", (d) => { writeText(path.join(d, "x.draft.md"), PLAN); }, null],
    ["mixed", (d) => {
        writeText(path.join(d, "old.md"), PLAN); setMtime(path.join(d, "old.md"), 3);
        writeText(path.join(d, "newest.md"), PLAN); setMtime(path.join(d, "newest.md"), 1);
        writeText(path.join(d, "newer.draft.md"), PLAN); setMtime(path.join(d, "newer.draft.md"), 0);
    }, "newest.md"],
    ["done and backlog ignored", (d) => {
        writeText(path.join(d, "p.md"), PLAN); setMtime(path.join(d, "p.md"), 5);
        writeText(path.join(d, "done", "z.md"), PLAN);
        writeText(path.join(d, "backlog", "y.md"), PLAN);
    }, "p.md"],
    ["dotfiles ignored", (d) => {
        writeText(path.join(d, ".hidden.md"), PLAN);
        writeText(path.join(d, "p.md"), PLAN); setMtime(path.join(d, "p.md"), 5);
    }, "p.md"],
    ["directory named x.md ignored", (d) => {
        fs.mkdirSync(path.join(d, "x.md"), { recursive: true });
        writeText(path.join(d, "p.md"), PLAN); setMtime(path.join(d, "p.md"), 5);
    }, "p.md"],
    ["equal mtimes -> name desc", (d) => {
        writeText(path.join(d, "a.md"), PLAN); setMtime(path.join(d, "a.md"), 2);
        writeText(path.join(d, "b.md"), PLAN); setMtime(path.join(d, "b.md"), 2);
    }, "b.md"],
    ["newer notes file without tasks skipped", (d) => {
        writeText(path.join(d, "plan.md"), PLAN); setMtime(path.join(d, "plan.md"), 3);
        writeText(path.join(d, "notes.md"), "# Notes\n\n## Ideas\n- tasks later\n"); setMtime(path.join(d, "notes.md"), 1);
    }, "plan.md"],
    ["### Task heading alone is enough", (d) => {
        writeText(path.join(d, "t.md"), "# t\n\n### Task 1: do it\n");
    }, "t.md"],
    ["## Implementation Tasks alone is enough (CRLF)", (d) => {
        writeText(path.join(d, "c.md"), "# c\r\n\r\n## Implementation Tasks\r\n");
    }, "c.md"],
    ["heading text inside a line does not count", (d) => {
        writeText(path.join(d, "n.md"), "# n\nSee ## Implementation Tasks and ### Task 1 in the plan.\n");
    }, null],
    ["only notes files -> null", (d) => {
        writeText(path.join(d, "notes.md"), "# Notes\n");
        writeText(path.join(d, "research.md"), "## Findings\n### Taskforce\n");
    }, null],
];

for (const [label, setup, expected] of FIND_CASES) {
    test(`findActivePlan: ${label}`, () => withTmp((tmp) => {
        const dir = path.join(tmp, "plans");
        setup(dir);
        assert.equal(lib.findActivePlan(dir), expected);
        assert.equal(cli.findActivePlan(dir), expected);
    }));
}
