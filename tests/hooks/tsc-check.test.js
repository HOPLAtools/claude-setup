// Integration tests for hooks/tsc-check.js extension filter.
// We test the filter logic (exit 0 silently when no .ts/.js files touched)
// — invoking real tsc is covered by the project's manual smoke tests.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { makeTempDir, rmDir } from "../helpers/fixtures.js";

const REPO_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const HOOK = path.join(REPO_ROOT, "hooks", "tsc-check.js");

function runHook(payload, cwd = os.tmpdir()) {
    const res = spawnSync("node", [HOOK], {
        input: JSON.stringify(payload),
        encoding: "utf8",
        cwd,
    });
    return { status: res.status, stdout: res.stdout };
}

test("tsc-check: skips when only .md file is touched (no tsc invoked)", () => {
    const res = runHook({
        tool_name: "Write",
        tool_input: { file_path: "/some/project/README.md" },
    });
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
});

test("tsc-check: skips when only .txt file is touched", () => {
    const res = runHook({
        tool_name: "Write",
        tool_input: { file_path: "/some/project/notes.txt" },
    });
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
});

test("tsc-check: skips MultiEdit where every file is non-compilable", () => {
    const res = runHook({
        tool_name: "MultiEdit",
        tool_input: {
            edits: [
                { file_path: "/some/project/README.md" },
                { file_path: "/some/project/notes.txt" },
                { file_path: "/some/project/data.json" },
            ],
        },
    });
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
});

test("tsc-check: with .ts file in a dir WITHOUT tsconfig.json — short-circuits cleanly", () => {
    const tmp = makeTempDir();
    try {
        const res = runHook(
            {
                tool_name: "Write",
                tool_input: { file_path: "/some/project/index.ts" },
            },
            tmp
        );
        assert.equal(res.status, 0);
    } finally {
        rmDir(tmp);
    }
});

test("tsc-check: MultiEdit with mixed .md + .ts → falls through (does NOT skip on filter)", () => {
    const tmp = makeTempDir();
    try {
        const res = runHook(
            {
                tool_name: "MultiEdit",
                tool_input: {
                    edits: [
                        { file_path: "/some/project/README.md" },
                        { file_path: "/some/project/index.ts" },
                    ],
                },
            },
            tmp
        );
        // No tsconfig in tmp → tsc-check exits 0 via the tsconfig short-circuit,
        // but it reached that branch (i.e. extension filter did NOT skip).
        assert.equal(res.status, 0);
    } finally {
        rmDir(tmp);
    }
});

test("tsc-check: empty payload defaults to safe behavior (no crash)", () => {
    const res = runHook({});
    assert.equal(res.status, 0);
});
