#!/usr/bin/env node
// PostToolUse hook: runs tsc --noEmit after file edits and feeds errors back to Claude

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }

    // If no tsconfig.json in cwd, exit silently (non-TS project)
    const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
    if (!fs.existsSync(tsconfigPath)) {
        process.exit(0);
    }

    let result;
    try {
        execSync("tsc --noEmit", { cwd: process.cwd(), stdio: "pipe" });
        // No errors — exit silently
        process.exit(0);
    } catch (err) {
        const output = (err.stdout || "").toString() + (err.stderr || "").toString();
        if (output.trim()) {
            process.stdout.write("TypeScript errors detected:\n" + output + "\n");
        }
        // Exit 0: PostToolUse hooks cannot block, but stdout is fed back to Claude
        process.exit(0);
    }
}

main();
