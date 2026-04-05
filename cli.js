#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";

const FORCE = process.argv.includes("--force");
const UNINSTALL = process.argv.includes("--uninstall");
const MIGRATE = process.argv.includes("--migrate");
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

// Known hopla hook commands installed by previous CLI versions
const LEGACY_HOOK_COMMANDS = [
    "tsc-check.js",
    "env-protect.js",
    "session-prime.js",
];

function removeLegacyFiles() {
    let removed = [];

    // Remove hopla-* commands from ~/.claude/commands/
    if (fs.existsSync(COMMANDS_DIR)) {
        for (const file of fs.readdirSync(COMMANDS_DIR)) {
            const filePath = path.join(COMMANDS_DIR, file);
            if (file.startsWith("hopla-") && fs.statSync(filePath).isFile()) {
                fs.rmSync(filePath);
                removed.push(`~/.claude/commands/${file}`);
            }
        }
    }

    // Remove hopla-* skills from ~/.claude/skills/
    if (fs.existsSync(SKILLS_DIR)) {
        for (const entry of fs.readdirSync(SKILLS_DIR)) {
            const entryPath = path.join(SKILLS_DIR, entry);
            if (entry.startsWith("hopla-") && fs.statSync(entryPath).isDirectory()) {
                fs.rmSync(entryPath, { recursive: true });
                removed.push(`~/.claude/skills/${entry}/`);
            }
        }
    }

    // Remove hopla hook files from ~/.claude/hooks/
    if (fs.existsSync(HOOKS_DIR)) {
        for (const hookFile of LEGACY_HOOK_COMMANDS) {
            const hookPath = path.join(HOOKS_DIR, hookFile);
            if (fs.existsSync(hookPath)) {
                fs.rmSync(hookPath);
                removed.push(`~/.claude/hooks/${hookFile}`);
            }
        }
        // Remove hooks dir if empty
        try {
            const remaining = fs.readdirSync(HOOKS_DIR);
            if (remaining.length === 0) {
                fs.rmSync(HOOKS_DIR, { recursive: true });
            }
        } catch { /* ignore */ }
    }

    // Remove hopla hook entries from settings.json
    const settingsPath = path.join(CLAUDE_DIR, "settings.json");
    if (fs.existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
            let changed = false;

            if (settings.hooks) {
                for (const [event, matchers] of Object.entries(settings.hooks)) {
                    if (!Array.isArray(matchers)) continue;
                    const filtered = matchers.filter((m) => {
                        if (!m.hooks || !Array.isArray(m.hooks)) return true;
                        // Remove entries where ALL hooks are hopla hooks
                        const isHopla = m.hooks.every((h) =>
                            LEGACY_HOOK_COMMANDS.some((cmd) => h.command && h.command.includes(cmd))
                        );
                        return !isHopla;
                    });
                    if (filtered.length !== matchers.length) {
                        settings.hooks[event] = filtered;
                        if (filtered.length === 0) delete settings.hooks[event];
                        changed = true;
                    }
                }
                if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
            }

            if (changed) {
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
                removed.push("hooks from ~/.claude/settings.json");
            }
        } catch { /* ignore parse errors */ }
    }

    return removed;
}

function detectPlugin() {
    const settingsPath = path.join(CLAUDE_DIR, "settings.json");
    if (!fs.existsSync(settingsPath)) return false;
    try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        const plugins = settings.enabledPlugins || {};
        return Object.keys(plugins).some((key) => key.startsWith("hopla@"));
    } catch {
        return false;
    }
}

async function migrate() {
    log(`\n${BOLD}@hopla/claude-setup${RESET} — Migrate (remove legacy CLI duplicates)\n`);

    const removed = removeLegacyFiles();

    if (removed.length === 0) {
        log(`${GREEN}✓${RESET}  No legacy files found. Nothing to clean up.\n`);
        return;
    }

    log(`${CYAN}Removed legacy CLI files:${RESET}`);
    for (const item of removed) {
        log(`  ${RED}✕${RESET}  ${item}`);
    }
    log(`\n${GREEN}${BOLD}Done!${RESET} Legacy duplicates removed. The plugin now handles commands, skills, and hooks.\n`);
}

async function uninstall() {
    log(`\n${BOLD}@hopla/claude-setup${RESET} — Uninstall\n`);

    const itemsToRemove = [];

    // Global rules
    if (fs.existsSync(path.join(CLAUDE_DIR, "CLAUDE.md"))) {
        itemsToRemove.push({ path: path.join(CLAUDE_DIR, "CLAUDE.md"), label: "~/.claude/CLAUDE.md", isDir: false });
    }

    log(`The following will be removed:`);
    for (const { label } of itemsToRemove) {
        log(`  ${RED}✕${RESET}  ${label}`);
    }
    log(`  ${YELLOW}+${RESET}  Legacy hopla-* commands, skills, hooks (if any)`);

    const ok = await confirm(`\nContinue? (y/N) `);
    if (!ok) {
        log(`\nAborted.\n`);
        return;
    }

    log("");

    // Remove listed items
    for (const { path: itemPath, label, isDir } of itemsToRemove) {
        if (fs.existsSync(itemPath)) {
            fs.rmSync(itemPath, { recursive: isDir });
            log(`  ${RED}✕${RESET}  Removed: ${label}`);
        }
    }

    // Remove legacy CLI files
    const removed = removeLegacyFiles();
    for (const item of removed) {
        log(`  ${RED}✕${RESET}  Removed: ${item}`);
    }

    // Remove hopla permissions from settings.json
    const settingsPath = path.join(CLAUDE_DIR, "settings.json");
    if (fs.existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
            if (settings.permissions && Array.isArray(settings.permissions.allow)) {
                const before = settings.permissions.allow.length;
                settings.permissions.allow = settings.permissions.allow.filter(
                    (p) => !HOPLA_PERMISSIONS.includes(p)
                );
                if (settings.permissions.allow.length !== before) {
                    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
                    log(`  ${RED}✕${RESET}  Removed: hopla permissions from settings.json`);
                }
            }
        } catch { /* ignore */ }
    }

    log(`\n${GREEN}${BOLD}Done!${RESET} Files removed.\n`);
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

async function setupPermissions() {
    const settingsPath = path.join(CLAUDE_DIR, "settings.json");

    let settings = { permissions: { allow: [] } };
    if (fs.existsSync(settingsPath)) {
        try {
            settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        } catch { /* keep defaults */ }
    }
    if (!settings.permissions) settings.permissions = {};
    if (!settings.permissions.allow) settings.permissions.allow = [];

    const existing = new Set(settings.permissions.allow);
    const toAdd = HOPLA_PERMISSIONS.filter((p) => !existing.has(p));

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
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    log(`  ${GREEN}✓${RESET}  Permissions configured.\n`);
}

async function install() {
    log(`\n${BOLD}@hopla/claude-setup${RESET} — Global Rules Setup\n`);

    // Detect plugin
    if (detectPlugin()) {
        log(`${CYAN}ℹ${RESET}  Plugin detected — commands, skills, and hooks are managed by the plugin.`);
        log(`   This CLI only installs global rules (~/.claude/CLAUDE.md) and permissions.\n`);
    }

    // Clean up legacy CLI files if present
    const legacyRemoved = removeLegacyFiles();
    if (legacyRemoved.length > 0) {
        log(`${CYAN}Cleaned up legacy CLI files:${RESET}`);
        for (const item of legacyRemoved) {
            log(`  ${YELLOW}↷${RESET}  Removed: ${item}`);
        }
        log("");
    }

    // Create directory if needed
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });

    // Install global rules
    log(`${CYAN}Installing global rules...${RESET}`);
    await installFile(
        path.join(REPO_ROOT, "global-rules.md"),
        path.join(CLAUDE_DIR, "CLAUDE.md"),
        "~/.claude/CLAUDE.md"
    );

    log(`\n${GREEN}${BOLD}Done!${RESET} Global rules installed.\n`);

    await setupPermissions();
}

const run = UNINSTALL ? uninstall : (MIGRATE ? migrate : install);
run().catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
});
