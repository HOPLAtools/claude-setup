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

function excerptClaudeMd(content) {
    const lines = content.split("\n");
    // Prefer the first `---` separator after the opening heading and first section
    for (let i = 5; i < Math.min(lines.length, 120); i++) {
        if (lines[i].trim() === "---") {
            return lines.slice(0, i).join("\n").trimEnd();
        }
    }
    // No separator within a reasonable window — cap at 60 lines
    return lines.slice(0, Math.min(lines.length, 60)).join("\n").trimEnd();
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

    // Re-inject pre-compact snapshot if recent (< 2 hours old)
    const snapshotPath = path.join(process.cwd(), ".claude", "compact-snapshot.json");
    if (fs.existsSync(snapshotPath)) {
        try {
            const snap = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
            const ageMs = Date.now() - Date.parse(snap.timestamp);
            if (Number.isFinite(ageMs) && ageMs < 2 * 60 * 60 * 1000) {
                const parts = [
                    `Resuming from pre-compact snapshot (${Math.round(ageMs / 60000)} min ago):`,
                ];
                if (snap.branch) parts.push(`- branch: ${snap.branch}${snap.inWorktree ? " (worktree)" : ""}`);
                if (snap.activePlan) parts.push(`- active plan: .agents/plans/${snap.activePlan}`);
                if (snap.uncommitted) parts.push(`- uncommitted at snapshot:\n${snap.uncommitted}`);
                lines.push(parts.join("\n"));
            }
        } catch {
            // Ignore malformed snapshot
        }
    }

    // Project rules excerpt — prefer canonical AGENTS.md; fall back to CLAUDE.md.
    // Both paths reuse the same excerpt helper since the format is identical Markdown.
    const agentsMdPath = path.join(process.cwd(), "AGENTS.md");
    const claudeMdPath = path.join(process.cwd(), "CLAUDE.md");
    let rulesPath = null;
    if (fs.existsSync(agentsMdPath)) {
        rulesPath = { path: agentsMdPath, label: "AGENTS.md" };
    } else if (fs.existsSync(claudeMdPath)) {
        rulesPath = { path: claudeMdPath, label: "CLAUDE.md" };
    }
    if (rulesPath) {
        const excerpt = excerptClaudeMd(fs.readFileSync(rulesPath.path, "utf8"));
        lines.push(`Project rules (${rulesPath.label} excerpt):\n${excerpt}`);
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
