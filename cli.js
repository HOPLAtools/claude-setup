#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";

const FORCE = process.argv.includes("--force");
const UNINSTALL = process.argv.includes("--uninstall");
const PLANNING = process.argv.includes("--planning");
const VERSION = process.argv.includes("--version") || process.argv.includes("-v");

if (VERSION) {
    const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"));
    console.log(`@hopla/claude-setup v${pkg.version}`);
    process.exit(0);
}
const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const COMMANDS_DIR = path.join(CLAUDE_DIR, "commands");
const SKILLS_DIR = path.join(CLAUDE_DIR, "skills");
const HOOKS_DIR = path.join(CLAUDE_DIR, "hooks");
const AGENTS_DIR = path.join(CLAUDE_DIR, "agents");
const REPO_ROOT = import.meta.dirname;

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function log(msg) {
    console.log(msg);
}

async function confirm(question) {
    if (FORCE) return true;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
        });
    });
}

async function installFile(src, dest, label) {
    const exists = fs.existsSync(dest);

    if (exists && !FORCE) {
        const overwrite = await confirm(
            `  ${YELLOW}⚠${RESET}  ${label} already exists. Overwrite? (y/N) `
        );
        if (!overwrite) {
            log(`  ${YELLOW}↷${RESET}  Skipped: ${label}`);
            return;
        }
    }

    fs.copyFileSync(src, dest);
    log(`  ${GREEN}✓${RESET}  ${exists ? "Updated" : "Installed"}: ${label}`);
}

function removeFile(dest, label) {
    if (fs.existsSync(dest)) {
        fs.rmSync(dest);
        log(`  ${RED}✕${RESET}  Removed: ${label}`);
    } else {
        log(`  ${YELLOW}↷${RESET}  Not found: ${label}`);
    }
}

async function uninstall() {
    log(`\n${BOLD}@hopla/claude-setup${RESET} — Uninstall\n`);

    const srcEntries = fs.readdirSync(path.join(REPO_ROOT, "commands"));
    const srcFiles = srcEntries.filter((f) =>
        fs.statSync(path.join(REPO_ROOT, "commands", f)).isFile()
    );
    const srcDirs = srcEntries.filter((f) =>
        fs.statSync(path.join(REPO_ROOT, "commands", f)).isDirectory()
    );

    // Also include any hopla-* files in ~/.claude/commands/ not in current source
    // (leftovers from previous versions)
    const installedHoplaFiles = fs.existsSync(COMMANDS_DIR)
        ? fs.readdirSync(COMMANDS_DIR).filter((f) =>
            f.startsWith("hopla-") && fs.statSync(path.join(COMMANDS_DIR, f)).isFile() && !srcFiles.includes(f)
        )
        : [];

    const itemsToRemove = [
        { dest: path.join(CLAUDE_DIR, "CLAUDE.md"), label: "~/.claude/CLAUDE.md", isDir: false },
        ...srcFiles.map((file) => ({
            dest: path.join(COMMANDS_DIR, file),
            label: `~/.claude/commands/${file}`,
            isDir: false,
        })),
        ...installedHoplaFiles.map((file) => ({
            dest: path.join(COMMANDS_DIR, file),
            label: `~/.claude/commands/${file}`,
            isDir: false,
        })),
        ...srcDirs.map((dir) => ({
            dest: path.join(COMMANDS_DIR, dir),
            label: `~/.claude/commands/${dir}/`,
            isDir: true,
        })),
    ];

    // Also remove skills, agents, and hooks installed by hopla
    if (fs.existsSync(SKILLS_DIR)) {
        itemsToRemove.push({ dest: SKILLS_DIR, label: "~/.claude/skills/", isDir: true });
    }
    if (fs.existsSync(AGENTS_DIR)) {
        itemsToRemove.push({ dest: AGENTS_DIR, label: "~/.claude/agents/", isDir: true });
    }
    if (fs.existsSync(HOOKS_DIR)) {
        itemsToRemove.push({ dest: HOOKS_DIR, label: "~/.claude/hooks/", isDir: true });
    }

    log(`The following will be removed:`);
    for (const { label } of itemsToRemove) {
        log(`  ${RED}✕${RESET}  ${label}`);
    }

    const ok = await confirm(`\nContinue? (y/N) `);
    if (!ok) {
        log(`\nAborted.\n`);
        return;
    }

    log("");
    for (const { dest, label, isDir } of itemsToRemove) {
        if (fs.existsSync(dest)) {
            fs.rmSync(dest, { recursive: isDir });
            log(`  ${RED}✕${RESET}  Removed: ${label}`);
        } else {
            log(`  ${YELLOW}↷${RESET}  Not found: ${label}`);
        }
    }

    log(`\n${GREEN}${BOLD}Done!${RESET} Files removed.\n`);
}

function removeStaleCommands(currentCommandFiles) {
    if (!fs.existsSync(COMMANDS_DIR)) return;
    const currentSet = new Set(currentCommandFiles);
    const removed = [];
    for (const file of fs.readdirSync(COMMANDS_DIR)) {
        const filePath = path.join(COMMANDS_DIR, file);
        if (!fs.statSync(filePath).isFile()) continue;
        if (file.startsWith("hopla-") && !currentSet.has(file)) {
            fs.rmSync(filePath);
            removed.push(file);
        }
    }
    if (removed.length > 0) {
        log(`${CYAN}Removing stale commands from previous versions...${RESET}`);
        for (const file of removed) {
            log(`  ${YELLOW}↷${RESET}  Removed: ~/.claude/commands/${file}`);
        }
        log("");
    }
}

const PLANNING_COMMANDS = [
    "hopla-init-project.md",
    "hopla-create-prd.md",
    "hopla-plan-feature.md",
    "hopla-review-plan.md",
    "hopla-git-commit.md",
    "hopla-git-pr.md",
    "hopla-guide.md",
];

async function install() {
    const modeLabel = PLANNING ? "Planning Mode (Robert)" : "Full Install";
    log(`\n${BOLD}@hopla/claude-setup${RESET} — Agentic Coding System ${CYAN}[${modeLabel}]${RESET}\n`);

    // Create directories if needed
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
    fs.mkdirSync(COMMANDS_DIR, { recursive: true });

    // Determine which command files will be installed
    const allCommandEntries = fs.readdirSync(path.join(REPO_ROOT, "commands"));
    const allCommandFiles = allCommandEntries.filter((f) => {
        if (f.startsWith(".")) return false;
        const stat = fs.statSync(path.join(REPO_ROOT, "commands", f));
        return stat.isFile();
    });
    const allCommandDirs = allCommandEntries.filter((f) => {
        const stat = fs.statSync(path.join(REPO_ROOT, "commands", f));
        return stat.isDirectory();
    });
    const commandFiles = PLANNING
        ? allCommandFiles.filter((f) => PLANNING_COMMANDS.includes(f))
        : allCommandFiles;

    // Remove stale hopla-* commands not in the current version
    removeStaleCommands(commandFiles);

    log(`${CYAN}Installing global rules...${RESET}`);
    await installFile(
        path.join(REPO_ROOT, "global-rules.md"),
        path.join(CLAUDE_DIR, "CLAUDE.md"),
        "~/.claude/CLAUDE.md"
    );

    log(`\n${CYAN}Installing commands...${RESET}`);
    for (const file of commandFiles.sort()) {
        await installFile(
            path.join(REPO_ROOT, "commands", file),
            path.join(COMMANDS_DIR, file),
            `~/.claude/commands/${file}`
        );
    }
    // Install subdirectories (e.g. guides/)
    for (const dir of allCommandDirs.sort()) {
        const srcDir = path.join(REPO_ROOT, "commands", dir);
        const destDir = path.join(COMMANDS_DIR, dir);
        fs.mkdirSync(destDir, { recursive: true });
        for (const file of fs.readdirSync(srcDir).sort()) {
            await installFile(
                path.join(srcDir, file),
                path.join(destDir, file),
                `~/.claude/commands/${dir}/${file}`
            );
        }
    }

    log(`\n${GREEN}${BOLD}Done!${RESET} Commands available in any Claude Code session:\n`);
    for (const file of commandFiles.sort()) {
        const name = file.replace(".md", "");
        log(`  ${CYAN}/${name}${RESET}`);
    }
    if (PLANNING) {
        log(`\n${YELLOW}Planning mode:${RESET} Only planning commands installed. Run without ${BOLD}--planning${RESET} for the full set.\n`);
    } else {
        log(`\nRun with ${BOLD}--force${RESET} to overwrite all files without prompting.\n`);
    }

    await setupPermissions();
    await installSkills();
    await installAgents();
    await installHooks();
}

// Skills to install in planning mode (subset)
const PLANNING_SKILLS = ["hopla-prime", "hopla-brainstorm"];

async function installSkills() {
    const skillsSrcDir = path.join(REPO_ROOT, "skills");
    if (!fs.existsSync(skillsSrcDir)) return;

    fs.mkdirSync(SKILLS_DIR, { recursive: true });

    const skillDirs = fs.readdirSync(skillsSrcDir).filter((entry) => {
        return fs.statSync(path.join(skillsSrcDir, entry)).isDirectory();
    });

    const skillsToInstall = PLANNING
        ? skillDirs.filter((d) => PLANNING_SKILLS.includes(d))
        : skillDirs;

    if (skillsToInstall.length === 0) return;

    log(`\n${CYAN}Installing skills...${RESET}`);
    for (const skillName of skillsToInstall.sort()) {
        const srcDir = path.join(skillsSrcDir, skillName);
        const destDir = path.join(SKILLS_DIR, skillName);
        fs.mkdirSync(destDir, { recursive: true });
        for (const file of fs.readdirSync(srcDir).sort()) {
            await installFile(
                path.join(srcDir, file),
                path.join(destDir, file),
                `~/.claude/skills/${skillName}/${file}`
            );
        }
    }

    log(`\n${GREEN}${BOLD}Skills installed!${RESET} Auto-activate without a slash command:\n`);
    for (const skillName of skillsToInstall.sort()) {
        log(`  ${CYAN}${skillName}${RESET}`);
    }
}

async function installAgents() {
    const agentsSrcDir = path.join(REPO_ROOT, "agents");
    if (!fs.existsSync(agentsSrcDir)) return;

    fs.mkdirSync(AGENTS_DIR, { recursive: true });

    const agentFiles = fs.readdirSync(agentsSrcDir).filter((f) => f.endsWith(".md"));
    if (agentFiles.length === 0) return;

    log(`\n${CYAN}Installing agents...${RESET}`);
    for (const file of agentFiles.sort()) {
        await installFile(
            path.join(agentsSrcDir, file),
            path.join(AGENTS_DIR, file),
            `~/.claude/agents/${file}`
        );
    }

    log(`\n${GREEN}${BOLD}Agents installed!${RESET} Available for use:\n`);
    for (const file of agentFiles.sort()) {
        const name = file.replace(".md", "");
        log(`  ${CYAN}${name}${RESET}`);
    }
}

async function installHooks() {
    const hooksSrcDir = path.join(REPO_ROOT, "hooks");
    if (!fs.existsSync(hooksSrcDir)) return;

    const hookFiles = fs.readdirSync(hooksSrcDir).filter((f) => f.endsWith(".js"));
    if (hookFiles.length === 0) return;

    const settingsPath = path.join(CLAUDE_DIR, "settings.json");

    // Read existing settings
    let settings = {};
    if (fs.existsSync(settingsPath)) {
        try {
            settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        } catch {
            // keep defaults
        }
    }

    const existingHooks = settings.hooks || {};
    const tscHookCmd = `${HOOKS_DIR}/tsc-check.js`;
    const envHookCmd = `${HOOKS_DIR}/env-protect.js`;
    const sessionHookCmd = `${HOOKS_DIR}/session-prime.js`;

    // Check what's already configured
    const postToolUseHooks = existingHooks.PostToolUse || [];
    const preToolUseHooks = existingHooks.PreToolUse || [];
    const sessionStartHooks = existingHooks.SessionStart || [];

    const hasTsc = postToolUseHooks.some((h) =>
        h.hooks?.some((hh) => hh.command === tscHookCmd)
    );
    const hasEnv = preToolUseHooks.some((h) =>
        h.hooks?.some((hh) => hh.command === envHookCmd)
    );
    const hasSession = sessionStartHooks.some((h) =>
        h.hooks?.some((hh) => hh.command === sessionHookCmd)
    );

    const toAdd = [];
    if (!hasTsc) toAdd.push(`PostToolUse(Write|Edit|MultiEdit) → tsc-check.js`);
    if (!hasEnv) toAdd.push(`PreToolUse(Read|Grep) → env-protect.js`);

    log(`\n${CYAN}Configuring hooks...${RESET}`);

    if (toAdd.length === 0 && hasSession) {
        log(`${GREEN}✓${RESET}  Hooks already configured.\n`);
        return;
    }

    if (toAdd.length > 0) {
        log(`  The following hooks will be added to ~/.claude/settings.json:\n`);
        for (const h of toAdd) {
            log(`  ${CYAN}+${RESET}  ${h}`);
        }
    }

    // Ask about session-prime separately (opt-in)
    let installSessionPrime = false;
    if (!hasSession) {
        log(`\n  ${YELLOW}Optional:${RESET} session-prime.js auto-loads project context on session start.`);
        installSessionPrime = await confirm(`  Enable session-prime hook? (y/N) `);
    }

    if (toAdd.length === 0 && !installSessionPrime) {
        log(`  ${YELLOW}↷${RESET}  Skipped hooks — you can configure ~/.claude/settings.json manually\n`);
        return;
    }

    const ok = toAdd.length > 0
        ? await confirm(`\n  Install these hooks? (y/N) `)
        : true;

    if (!ok) {
        log(`  ${YELLOW}↷${RESET}  Skipped hooks — you can configure ~/.claude/settings.json manually\n`);
        return;
    }

    // Copy hook files
    fs.mkdirSync(HOOKS_DIR, { recursive: true });
    for (const file of hookFiles) {
        await installFile(
            path.join(hooksSrcDir, file),
            path.join(HOOKS_DIR, file),
            `~/.claude/hooks/${file}`
        );
        // Make executable
        try {
            fs.chmodSync(path.join(HOOKS_DIR, file), 0o755);
        } catch {
            // Non-critical
        }
    }

    // Build updated hooks config
    if (!settings.hooks) settings.hooks = {};

    if (!hasTsc) {
        if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];
        settings.hooks.PostToolUse.push({
            matcher: "Write|Edit|MultiEdit",
            hooks: [{ type: "command", command: tscHookCmd }],
        });
    }
    if (!hasEnv) {
        if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];
        settings.hooks.PreToolUse.push({
            matcher: "Read|Grep",
            hooks: [{ type: "command", command: envHookCmd }],
        });
    }
    if (installSessionPrime && !hasSession) {
        if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];
        settings.hooks.SessionStart.push({
            matcher: "startup",
            hooks: [{ type: "command", command: sessionHookCmd }],
        });
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    log(`  ${GREEN}✓${RESET}  Hooks configured.\n`);
}

const HOPLA_PERMISSIONS = [
    "Bash(git *)",
    "Bash(cd *)",
    "Bash(ls *)",
    "Bash(find *)",
    "Bash(cat *)",
    "Bash(head *)",
    "Bash(tail *)",
    "Bash(echo *)",
];

const PLANNING_PERMISSIONS = [
    "Bash(git branch*)",
    "Bash(git log*)",
    "Bash(git status*)",
];

const ALL_HOPLA_PERMISSIONS = new Set([...HOPLA_PERMISSIONS, ...PLANNING_PERMISSIONS]);

async function setupPermissions() {
    const settingsPath = path.join(CLAUDE_DIR, "settings.json");

    // Read existing settings
    let settings = { permissions: { allow: [] } };
    if (fs.existsSync(settingsPath)) {
        try {
            settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        } catch {
            // If parsing fails, keep defaults
        }
    }
    if (!settings.permissions) settings.permissions = {};
    if (!settings.permissions.allow) settings.permissions.allow = [];

    const targetPermissions = PLANNING ? PLANNING_PERMISSIONS : HOPLA_PERMISSIONS;

    if (PLANNING) {
        // Replace: remove all hopla-owned permissions, then add planning-only ones
        const cleaned = settings.permissions.allow.filter((p) => !ALL_HOPLA_PERMISSIONS.has(p));
        const toAdd = targetPermissions.filter((p) => !cleaned.includes(p));
        const toRemove = settings.permissions.allow.filter((p) => ALL_HOPLA_PERMISSIONS.has(p) && !targetPermissions.includes(p));

        if (toAdd.length === 0 && toRemove.length === 0) {
            log(`${GREEN}✓${RESET}  Permissions already configured.\n`);
            return;
        }

        log(`${CYAN}Configuring permissions (planning mode)...${RESET}`);
        log(`  The following changes will be made to ~/.claude/settings.json:\n`);
        for (const p of toRemove) {
            log(`  ${RED}-${RESET}  ${p}`);
        }
        for (const p of toAdd) {
            log(`  ${CYAN}+${RESET}  ${p}`);
        }

        const ok = await confirm(`\n  Apply these permission changes? (y/N) `);
        if (!ok) {
            log(`  ${YELLOW}↷${RESET}  Skipped — you can edit ~/.claude/settings.json manually\n`);
            return;
        }

        settings.permissions.allow = [...cleaned, ...targetPermissions];
    } else {
        // Merge: add missing ones
        const existing = new Set(settings.permissions.allow);
        const toAdd = targetPermissions.filter((p) => !existing.has(p));

        if (toAdd.length === 0) {
            log(`${GREEN}✓${RESET}  Permissions already configured.\n`);
            return;
        }

        log(`${CYAN}Configuring permissions...${RESET}`);
        log(`  The following will be added to ~/.claude/settings.json:\n`);
        for (const p of toAdd) {
            log(`  ${CYAN}+${RESET}  ${p}`);
        }

        const ok = await confirm(`\n  Add these permissions? (y/N) `);
        if (!ok) {
            log(`  ${YELLOW}↷${RESET}  Skipped — you can add them manually to ~/.claude/settings.json\n`);
            return;
        }

        settings.permissions.allow = [...settings.permissions.allow, ...toAdd];
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    log(`  ${GREEN}✓${RESET}  Permissions configured.\n`);
}

const run = UNINSTALL ? uninstall : install;
run().catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
});
