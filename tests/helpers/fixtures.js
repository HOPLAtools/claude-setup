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

// Writes a text file. Creates parent dirs as needed (mkdir -p).
export function writeText(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}

// Minimal YAML-frontmatter reader for skill/command/agent files. Returns an
// object of top-level `key: value` scalars (surrounding quotes stripped; block
// lists `- item` become arrays), or null when the file has no frontmatter.
// Flow lists such as `[plan, report]` stay as the raw string.
export function readFrontmatter(file) {
    const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    if (!text.startsWith("---\n")) return null;
    const end = text.indexOf("\n---", 4);
    if (end === -1) return null;
    const out = {};
    let lastKey = null;
    for (const line of text.slice(4, end).split("\n")) {
        if (!line.trim() || line.trim().startsWith("#")) continue;
        const item = line.match(/^\s+-\s+(.*)$/);
        if (item && lastKey) {
            if (!Array.isArray(out[lastKey])) out[lastKey] = [];
            out[lastKey].push(item[1].trim().replace(/^(["'])(.*)\1$/, "$2"));
            continue;
        }
        const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!m) continue;
        lastKey = m[1];
        out[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    }
    return out;
}

// Text after the closing frontmatter fence (whole text when there is none).
export function bodyOf(file) {
    const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    if (!text.startsWith("---\n")) return text;
    const end = text.indexOf("\n---", 4);
    return end === -1 ? text : text.slice(text.indexOf("\n", end + 1) + 1);
}
