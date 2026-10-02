#!/usr/bin/env node
// PreCompact hook: snapshot the session's work state so it survives /compact.
// The SessionStart hook (session-prime.js) re-injects this when it exists and is recent.

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getActivePlan, resolvePlansDir } from "./lib/plans.js";

function run(cmd) {
    try {
        return execSync(cmd, { cwd: process.cwd(), stdio: ["ignore", "pipe", "ignore"] }).toString().trimEnd();
    } catch {
        return null;
    }
}

// Caps `git status --short` output at 20 lines to keep the JSON small.
function capUncommitted(text) {
    if (!text) return text;
    const lines = text.split("\n").filter((l) => l.length > 0);
    if (lines.length <= 20) return lines.join("\n");
    return lines.slice(0, 20).concat(`… +${lines.length - 20} more`).join("\n");
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

    const cwd = process.cwd();
    let active = null;
    let plansDir = ".agents/plans";
    try {
        active = getActivePlan(cwd);
        plansDir = resolvePlansDir(cwd).dir;
    } catch {
        // keep defaults
    }

    // activePlan (basename) is kept for 2.1.x readers; 2.2+ read activePlanPath.
    const snapshot = {
        timestamp: new Date().toISOString(),
        branch: run("git branch --show-current") || null,
        uncommitted: capUncommitted(run("git status --short")),
        activePlan: active ? path.posix.basename(active.path) : null,
        activePlanPath: active ? active.path : null,
        step: active ? active.step : null,
        plansDir,
        inWorktree: detectWorktree(),
    };

    const targetDir = path.join(cwd, ".claude");
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
