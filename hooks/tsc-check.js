#!/usr/bin/env node
// PostToolUse hook: runs tsc --noEmit after file edits and feeds errors back to Claude.
// Prefers the project-local tsc (node_modules/.bin/tsc) over a global install so
// the hook reports real results even when the user does not have tsc on PATH.

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const TS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"];

// Pulls every file_path the hook payload references. Covers Write/Edit (single
// file_path) and MultiEdit (edits[]). Returns null when no payload was available
// — callers treat null as "can't tell, run tsc to be safe".
function extractFilePaths(payload) {
    const input = payload?.tool_input;
    if (!input) return null;
    const collected = new Set();
    if (typeof input.file_path === "string") collected.add(input.file_path);
    if (typeof input.path === "string") collected.add(input.path);
    if (Array.isArray(input.edits)) {
        for (const edit of input.edits) {
            if (edit && typeof edit.file_path === "string") collected.add(edit.file_path);
        }
    }
    return collected.size > 0 ? [...collected] : null;
}

function resolveTscCommand(cwd) {
    const localBin = path.join(cwd, "node_modules", ".bin", "tsc");
    if (fs.existsSync(localBin)) return `"${localBin}"`;
    // Fall back to npx --no-install so we never trigger a network install;
    // if tsc is not available anywhere, npx exits non-zero with a clear error.
    return "npx --no-install tsc";
}

async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);

    let payload = null;
    if (chunks.length > 0) {
        try {
            payload = JSON.parse(Buffer.concat(chunks).toString());
        } catch {
            // Malformed payload — fall through; treat as "can't tell"
        }
    }

    // Filter: if every touched file is non-TS/JS, skip invoking tsc.
    // When the payload is missing or unparseable we default to running tsc
    // (safe behavior — matches the pre-filter implementation).
    const touched = extractFilePaths(payload);
    if (touched !== null) {
        const hasCompilable = touched.some((f) => {
            const ext = path.extname(f).toLowerCase();
            return TS_EXTENSIONS.includes(ext);
        });
        if (!hasCompilable) process.exit(0);
    }

    const cwd = process.cwd();
    const tsconfigPath = path.join(cwd, "tsconfig.json");
    if (!fs.existsSync(tsconfigPath)) {
        // Not a TypeScript project — skip silently
        process.exit(0);
    }

    const tsc = resolveTscCommand(cwd);

    try {
        execSync(`${tsc} --noEmit`, { cwd, stdio: "pipe" });
        process.exit(0);
    } catch (err) {
        const output = (err.stdout || "").toString() + (err.stderr || "").toString();
        if (output.trim()) {
            process.stdout.write("TypeScript errors detected:\n" + output + "\n");
        }
        process.exit(0);
    }
}

main();
