#!/usr/bin/env node
// Hopla statusline: model (Fable in red) · effort · ultracode setting · fast ·
// prompt cache · branch · worktree indicator · uncommitted count · active plan.
// Every payload field is optional. Ultracode is read from the settings files
// (`"ultracode": true`); a per-session `/effort ultracode` is not in the payload.
// Wire it up by running:
//   hopla-claude-setup --setup-statusline
// Remove with: hopla-claude-setup --remove-statusline

import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { getActivePlan } from "./lib/plans.js";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const BOLD = "\x1b[1m";
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

// Active plan basename (without .md) plus a short step label when available.
function activePlanLabel(cwd) {
    try {
        const active = getActivePlan(cwd);
        if (!active) return null;
        const name = path.posix.basename(active.path).replace(/\.md$/, "");
        const step = active.step ? active.step.split(":")[0].trim() : "";
        return step && step.length <= 20 ? `${name} · ${step}` : name;
    } catch {
        return null;
    }
}

// Last boolean `ultracode` found in user → project → project-local settings.
function ultracodeSetting(projectDir) {
    const files = [
        path.join(os.homedir(), ".claude", "settings.json"),
        path.join(projectDir, ".claude", "settings.json"),
        path.join(projectDir, ".claude", "settings.local.json"),
    ];
    let value = false;
    for (const file of files) {
        try {
            const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
            if (typeof parsed?.ultracode === "boolean") value = parsed.ultracode;
        } catch {
            // missing or invalid settings file — ignore
        }
    }
    return value;
}

// Model, effort, ultracode, fast mode and prompt cache, from the payload.
function sessionSegments(input, projectDir) {
    const parts = [];
    const model = input.model?.display_name || input.model?.id;
    if (model) {
        const fable = /fable/i.test(`${input.model?.id || ""} ${input.model?.display_name || ""}`);
        parts.push(fable ? `${RED}${BOLD}${model}${RESET}` : model);
    }

    const effort = input.effort?.level;
    if (typeof effort === "string" && effort) {
        parts.push(effort === "xhigh" || effort === "max" ? `${YELLOW}effort:${effort}${RESET}` : `effort:${effort}`);
    }

    if (ultracodeSetting(projectDir)) parts.push(`${RED}⚡ultracode${RESET}`);

    if (input.fast_mode === true) parts.push("fast");

    const cache = input.prompt_cache;
    if (cache?.warm === true) {
        let label = `cache ${cache.ttl || ""} ✓`.replace("  ", " ");
        if (typeof cache.expires_at === "number") {
            const t = new Date(cache.expires_at * 1000);
            label += ` ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
        }
        parts.push(`${GREEN}${label}${RESET}`);
    } else if (cache && cache.caching_observed === true) {
        parts.push(`${YELLOW}cache cold${RESET}`);
    }
    return parts;
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
    if (!input || typeof input !== "object") process.exit(0);

    const cwd = input.workspace?.current_dir || input.cwd || process.cwd();
    const projectDir = input.workspace?.project_dir || cwd;
    const parts = sessionSegments(input, projectDir);

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

    const plan = activePlanLabel(cwd);
    if (plan) {
        parts.push(`${MAGENTA}📋 ${plan}${RESET}`);
    }

    if (parts.length === 0) process.exit(0);

    process.stdout.write(parts.join(` ${DIM}·${RESET} `));
    process.exit(0);
}

main();
