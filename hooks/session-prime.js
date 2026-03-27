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

    // Available skills reminder
    lines.push(`📦 HOPLA Skills Available:
- hopla-prime: Project orientation (trigger: "orient", "get context", "load project")
- hopla-git: Git operations (trigger: "commit", "PR", "push")
- hopla-code-review: Code review (trigger: "review code", "code review")
- hopla-execution-report: Post-implementation docs (trigger: "generate report")
- hopla-verify: Completion verification (trigger: any "done"/"listo"/"finished" claim)
- hopla-brainstorm: Design exploration (trigger: "new feature", "brainstorm", "explore options")
- hopla-debug: Systematic debugging (trigger: "bug", "error", "debug")
- hopla-tdd: Test-driven development (trigger: implementing with tests)

⚠️ If a skill applies to the current task, you MUST use it.`);

    if (lines.length > 0) {
        process.stdout.write(lines.join("\n\n"));
    }

    process.exit(0);
}

main();
