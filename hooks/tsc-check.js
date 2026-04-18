#!/usr/bin/env node
// PostToolUse hook: runs tsc --noEmit after file edits and feeds errors back to Claude.
// Prefers the project-local tsc (node_modules/.bin/tsc) over a global install so
// the hook reports real results even when the user does not have tsc on PATH.

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function resolveTscCommand(cwd) {
    const localBin = path.join(cwd, "node_modules", ".bin", "tsc");
    if (fs.existsSync(localBin)) return `"${localBin}"`;
    // Fall back to npx --no-install so we never trigger a network install;
    // if tsc is not available anywhere, npx exits non-zero with a clear error.
    return "npx --no-install tsc";
}

async function main() {
    // Drain stdin (hook contract) but we don't need the payload for tsc --noEmit
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);

    const cwd = process.cwd();
    const tsconfigPath = path.join(cwd, "tsconfig.json");
    if (!fs.existsSync(tsconfigPath)) {
        // Not a TypeScript project — skip silently
        process.exit(0);
    }

    const tsc = resolveTscCommand(cwd);

    try {
        execSync(`${tsc} --noEmit`, { cwd, stdio: "pipe" });
        // Compile clean — exit silently
        process.exit(0);
    } catch (err) {
        const output = (err.stdout || "").toString() + (err.stderr || "").toString();
        if (output.trim()) {
            process.stdout.write("TypeScript errors detected:\n" + output + "\n");
        }
        // PostToolUse hooks cannot block; stdout is fed back to Claude
        process.exit(0);
    }
}

main();
