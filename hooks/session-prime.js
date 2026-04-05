#!/usr/bin/env node
// SessionStart hook: provides initial project context when a session begins

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

function discoverSkills() {
    // Try plugin context first: ../skills/ relative to this script
    const hookDir = import.meta.dirname;
    const skillsDir = path.join(hookDir, "..", "skills");

    if (!fs.existsSync(skillsDir)) {
        return null;
    }

    const skills = [];
    for (const entry of fs.readdirSync(skillsDir).sort()) {
        const skillDir = path.join(skillsDir, entry);
        if (!fs.statSync(skillDir).isDirectory()) continue;

        const skillFile = path.join(skillDir, "SKILL.md");
        if (!fs.existsSync(skillFile)) continue;

        // Extract description from SKILL.md frontmatter
        const content = fs.readFileSync(skillFile, "utf8");
        const descMatch = content.match(/^description:\s*"?(.+?)"?\s*$/m);
        if (descMatch) {
            // Truncate to first sentence for brevity
            const desc = descMatch[1].split(".")[0];
            skills.push(`- ${entry}: ${desc}`);
        } else {
            skills.push(`- ${entry}`);
        }
    }

    return skills.length > 0 ? skills : null;
}

async function main() {
    const lines = [];

    // Git context
    const branch = run("git branch --show-current");
    const log = run("git log --oneline -5");
    const status = run("git status --short");

    if (branch) {
        lines.push(`Current branch: ${branch}`);
    }
    if (log) {
        lines.push(`Recent commits:\n${log}`);
    }
    if (status) {
        lines.push(`Uncommitted changes:\n${status}`);
    } else if (branch) {
        lines.push("Working tree is clean.");
    }

    // CLAUDE.md summary (first 20 lines)
    const claudeMdPath = path.join(process.cwd(), "CLAUDE.md");
    if (fs.existsSync(claudeMdPath)) {
        const content = fs.readFileSync(claudeMdPath, "utf8").split("\n").slice(0, 20).join("\n");
        lines.push(`Project rules (CLAUDE.md excerpt):\n${content}`);
    }

    // Auto-discover available skills
    const skills = discoverSkills();
    if (skills) {
        lines.push(`📦 HOPLA Skills Available:\n${skills.join("\n")}\n\n⚠️ If a skill applies to the current task, you MUST use it.`);
    } else {
        lines.push(`📦 HOPLA skills are available. Check your session's skill list for details.\n\n⚠️ If a skill applies to the current task, you MUST use it.`);
    }

    if (lines.length > 0) {
        process.stdout.write(lines.join("\n\n"));
    }

    process.exit(0);
}

main();
