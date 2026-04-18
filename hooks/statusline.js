#!/usr/bin/env node
// Hopla statusline: branch · worktree indicator · uncommitted count · active plan.
// Wire it up by adding to ~/.claude/settings.json:
//   "statusLine": {
//     "type": "command",
//     "command": "node ~/.claude/plugins/marketplaces/hopla-marketplace/hooks/statusline.js"
//   }

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function run(cmd, cwd) {
    try {
        return execSync(cmd, { cwd, stdio: "pipe" }).toString().trim();
    } catch {
        return null;
    }
}

function findActivePlan(cwd) {
    const plansDir = path.join(cwd, ".agents", "plans");
    if (!fs.existsSync(plansDir)) return null;
    try {
        const files = fs
            .readdirSync(plansDir)
            .filter((f) => f.endsWith(".md") && !f.startsWith("."))
            .map((f) => ({ name: f, mtime: fs.statSync(path.join(plansDir, f)).mtimeMs }))
            .sort((a, b) => b.mtime - a.mtime);
        return files[0]?.name.replace(/\.md$/, "") || null;
    } catch {
        return null;
    }
}

async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);

    let input = {};
    try {
        input = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
        // Malformed payload — render nothing
        process.exit(0);
    }

    const cwd = input.workspace?.current_dir || input.cwd || process.cwd();
    const parts = [];

    const branch = run("git branch --show-current", cwd);
    if (branch) {
        const gitDir = run("git rev-parse --git-dir", cwd);
        const commonDir = run("git rev-parse --git-common-dir", cwd);
        const isWorktree =
            gitDir && commonDir && path.resolve(cwd, gitDir) !== path.resolve(cwd, commonDir);
        parts.push(`${CYAN}${isWorktree ? "⎇ " : " "}${branch}${RESET}`);
    }

    const status = run("git status --short", cwd);
    if (status) {
        const count = status.split("\n").length;
        parts.push(`${YELLOW}${count}M${RESET}`);
    }

    const plan = findActivePlan(cwd);
    if (plan) {
        parts.push(`${MAGENTA}📋 ${plan}${RESET}`);
    }

    if (parts.length === 0) process.exit(0);

    process.stdout.write(parts.join(` ${DIM}·${RESET} `));
    process.exit(0);
}

main();
