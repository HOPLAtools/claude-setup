#!/usr/bin/env node
// PreCompact hook: snapshot the session's work state so it survives /compact.
// The SessionStart hook (session-prime.js) re-injects this when it exists and is recent.

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function run(cmd) {
    try {
        return execSync(cmd, { cwd: process.cwd(), stdio: "pipe" }).toString().trim();
    } catch {
        return null;
    }
}

function findActivePlan() {
    const plansDir = path.join(process.cwd(), ".agents", "plans");
    if (!fs.existsSync(plansDir)) return null;
    try {
        const files = fs
            .readdirSync(plansDir)
            .filter((f) => f.endsWith(".md") && !f.startsWith("."))
            .map((f) => ({ name: f, mtime: fs.statSync(path.join(plansDir, f)).mtimeMs }))
            .sort((a, b) => b.mtime - a.mtime);
        return files[0]?.name || null;
    } catch {
        return null;
    }
}

function detectWorktree() {
    const gitDir = run("git rev-parse --git-dir");
    const commonDir = run("git rev-parse --git-common-dir");
    if (!gitDir || !commonDir) return false;
    return path.resolve(gitDir) !== path.resolve(commonDir);
}

async function main() {
    // Drain stdin (hook contract)
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);

    const snapshot = {
        timestamp: new Date().toISOString(),
        branch: run("git branch --show-current"),
        uncommitted: run("git status --short"),
        activePlan: findActivePlan(),
        inWorktree: detectWorktree(),
    };

    const targetDir = path.join(process.cwd(), ".claude");
    try {
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(
            path.join(targetDir, "compact-snapshot.json"),
            JSON.stringify(snapshot, null, 2) + "\n"
        );
    } catch {
        // Best-effort — never block /compact
    }
    process.exit(0);
}

main();
