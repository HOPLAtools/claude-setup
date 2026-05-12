// Shared helpers for the test suite. No external dependencies.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Creates a fresh tempdir scoped to a single test. Returns the absolute path.
// Cleanup is the caller's responsibility (use `t.after` or `afterEach`).
export function makeTempDir(prefix = "hopla-test-") {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Writes a JSON file. Creates parent dirs as needed.
export function writeJson(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n");
}

// Reads a JSON file, returns null on any error (mirrors parseSettingsFile semantics).
export function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
        return null;
    }
}

// Removes a directory recursively, swallowing errors (cleanup helper).
export function rmDir(dir) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch {
        // ignore
    }
}
