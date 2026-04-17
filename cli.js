#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";

const FORCE = process.argv.includes("--force");
const UNINSTALL = process.argv.includes("--uninstall");
const MIGRATE = process.argv.includes("--migrate");
const VERSION = process.argv.includes("--version") || process.argv.includes("-v");
const DRY_RUN = process.argv.includes("--dry-run");

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
const PLUGINS_DIR = path.join(CLAUDE_DIR, "plugins");
const MARKETPLACE_CACHE = path.join(PLUGINS_DIR, "marketplaces", "hopla-marketplace");
const SETTINGS_FILES = [
    path.join(CLAUDE_DIR, "settings.json"),
    path.join(CLAUDE_DIR, "settings.local.json"),
];
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

function dryTag() {
    return DRY_RUN ? ` ${CYAN}[dry-run]${RESET}` : "";
}

function safeRm(target, opts = {}) {
    if (DRY_RUN) return;
    fs.rmSync(target, opts);
}

function safeWrite(target, content) {
    if (DRY_RUN) return;
    fs.writeFileSync(target, content);
}

function safeCopy(src, dest) {
    if (DRY_RUN) return;
    fs.copyFileSync(src, dest);
}

function safeMkdir(dir, opts) {
    if (DRY_RUN) return;
    fs.mkdirSync(dir, opts);
}

function logRemoved(label) {
    const verb = DRY_RUN ? "Would remove" : "Removed";
    log(`  ${RED}✕${RESET}  ${verb}: ${label}`);
}

function logInstalled(label, exists) {
    const verb = DRY_RUN
        ? (exists ? "Would update" : "Would install")
        : (exists ? "Updated" : "Installed");
    log(`  ${GREEN}✓${RESET}  ${verb}: ${label}`);
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

    safeCopy(src, dest);
    logInstalled(label, exists);
}

// Hooks installed by previous CLI versions (v1.4.0 through v1.11.x)
const LEGACY_HOOK_COMMANDS = [
    "tsc-check.js",
    "env-protect.js",
    "session-prime.js",
];

// Agents installed directly by v1.11.0 and v1.12.0 (no hopla- prefix)
// Must be cleaned up so the plugin-provided versions are the only source of truth
const LEGACY_AGENT_FILES = [
    "code-reviewer.md",
    "codebase-researcher.md",
    "system-reviewer.md",
];

// Permissions added by the current CLI
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

// Permissions from older CLI versions (e.g. PLANNING_PERMISSIONS from v1.11.0)
// Included in cleanup so settings.json does not accumulate obsolete entries
const LEGACY_PERMISSIONS = [
    "Bash(git branch*)",
    "Bash(git log*)",
    "Bash(git status*)",
];

const ALL_HOPLA_PERMISSIONS = new Set([...HOPLA_PERMISSIONS, ...LEGACY_PERMISSIONS]);

function removeLegacyFiles() {
    let removed = [];

    // hopla-* commands
    if (fs.existsSync(COMMANDS_DIR)) {
        for (const file of fs.readdirSync(COMMANDS_DIR)) {
            const filePath = path.join(COMMANDS_DIR, file);
            if (file.startsWith("hopla-") && fs.statSync(filePath).isFile()) {
                safeRm(filePath);
                removed.push(`~/.claude/commands/${file}`);
            }
        }
    }

    // hopla-* skills
    if (fs.existsSync(SKILLS_DIR)) {
        for (const entry of fs.readdirSync(SKILLS_DIR)) {
            const entryPath = path.join(SKILLS_DIR, entry);
            if (entry.startsWith("hopla-") && fs.statSync(entryPath).isDirectory()) {
                safeRm(entryPath, { recursive: true });
                removed.push(`~/.claude/skills/${entry}/`);
            }
        }
    }

    // hopla hook files
    if (fs.existsSync(HOOKS_DIR)) {
        for (const hookFile of LEGACY_HOOK_COMMANDS) {
            const hookPath = path.join(HOOKS_DIR, hookFile);
            if (fs.existsSync(hookPath)) {
                safeRm(hookPath);
                removed.push(`~/.claude/hooks/${hookFile}`);
            }
        }
        if (!DRY_RUN) {
            try {
                const remaining = fs.readdirSync(HOOKS_DIR);
                if (remaining.length === 0) fs.rmSync(HOOKS_DIR, { recursive: true });
            } catch { /* ignore */ }
        }
    }

    // Legacy agents (v1.11.0 / v1.12.0 installed these directly)
    if (fs.existsSync(AGENTS_DIR)) {
        for (const agentFile of LEGACY_AGENT_FILES) {
            const agentPath = path.join(AGENTS_DIR, agentFile);
            if (fs.existsSync(agentPath)) {
                safeRm(agentPath);
                removed.push(`~/.claude/agents/${agentFile}`);
            }
        }
        if (!DRY_RUN) {
            try {
                const remaining = fs.readdirSync(AGENTS_DIR);
                if (remaining.length === 0) fs.rmSync(AGENTS_DIR, { recursive: true });
            } catch { /* ignore */ }
        }
    }

    // hopla hook entries from settings.json AND settings.local.json
    for (const settingsPath of SETTINGS_FILES) {
        if (!fs.existsSync(settingsPath)) continue;
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
            let changed = false;

            if (settings.hooks) {
                for (const [event, matchers] of Object.entries(settings.hooks)) {
                    if (!Array.isArray(matchers)) continue;
                    const filtered = matchers.filter((m) => {
                        if (!m.hooks || !Array.isArray(m.hooks)) return true;
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
                safeWrite(settingsPath, JSON.stringify(settings, null, 2) + "\n");
                removed.push(`hooks from ${path.basename(settingsPath)}`);
            }
        } catch { /* ignore parse errors */ }
    }

    return removed;
}

function removeHoplaPermissions() {
    const removed = [];
    for (const settingsPath of SETTINGS_FILES) {
        if (!fs.existsSync(settingsPath)) continue;
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
            if (!settings.permissions || !Array.isArray(settings.permissions.allow)) continue;
            const before = settings.permissions.allow.length;
            settings.permissions.allow = settings.permissions.allow.filter(
                (p) => !ALL_HOPLA_PERMISSIONS.has(p)
            );
            if (settings.permissions.allow.length !== before) {
                safeWrite(settingsPath, JSON.stringify(settings, null, 2) + "\n");
                removed.push(`permissions from ${path.basename(settingsPath)}`);
            }
        } catch { /* ignore */ }
    }
    return removed;
}

function detectPlugin() {
    for (const settingsPath of SETTINGS_FILES) {
        if (!fs.existsSync(settingsPath)) continue;
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
            const plugins = settings.enabledPlugins || {};
            if (Object.keys(plugins).some((key) => key.startsWith("hopla@"))) return true;
        } catch { /* ignore */ }
    }
    return false;
}

async function migrate() {
    log(`\n${BOLD}@hopla/claude-setup${RESET} — Migrate (remove legacy CLI duplicates)${dryTag()}\n`);

    const removed = removeLegacyFiles();

    if (removed.length === 0) {
        log(`${GREEN}✓${RESET}  No legacy files found. Nothing to clean up.\n`);
        return;
    }

    log(`${CYAN}${DRY_RUN ? "Would remove" : "Removed"} legacy CLI files:${RESET}`);
    for (const item of removed) {
        logRemoved(item);
    }
    log(`\n${GREEN}${BOLD}Done!${RESET} ${DRY_RUN ? "Dry-run complete — no files were changed." : "Legacy duplicates removed. The plugin now handles commands, skills, agents, and hooks."}\n`);
}

async function uninstall() {
    log(`\n${BOLD}@hopla/claude-setup${RESET} — Uninstall${dryTag()}\n`);

    const itemsToRemove = [];

    if (fs.existsSync(path.join(CLAUDE_DIR, "CLAUDE.md"))) {
        itemsToRemove.push({ path: path.join(CLAUDE_DIR, "CLAUDE.md"), label: "~/.claude/CLAUDE.md", isDir: false });
    }

    const pluginActive = detectPlugin();
    const hasMarketplaceCache = fs.existsSync(MARKETPLACE_CACHE);

    log(`The following will be removed:`);
    for (const { label } of itemsToRemove) {
        log(`  ${RED}✕${RESET}  ${label}`);
    }
    log(`  ${YELLOW}+${RESET}  Legacy hopla-* commands, skills, hooks, agents (if any)`);
    log(`  ${YELLOW}+${RESET}  Hopla permissions from settings.json and settings.local.json`);

    if (pluginActive || hasMarketplaceCache) {
        log(`\n${YELLOW}⚠${RESET}  Claude Code plugin artifacts detected — this CLI cannot remove them:`);
        if (pluginActive) {
            log(`   • Plugin ${BOLD}hopla@hopla-marketplace${RESET} is enabled.`);
            log(`     Run inside Claude Code: ${CYAN}/plugin uninstall hopla@hopla-marketplace${RESET}`);
        }
        if (hasMarketplaceCache) {
            log(`   • Marketplace cache: ${CYAN}${MARKETPLACE_CACHE}${RESET}`);
            log(`     Remove manually: ${CYAN}rm -rf "${MARKETPLACE_CACHE}"${RESET}`);
        }
    }

    const ok = await confirm(`\nContinue? (y/N) `);
    if (!ok) {
        log(`\nAborted.\n`);
        return;
    }

    log("");

    for (const { path: itemPath, label, isDir } of itemsToRemove) {
        if (fs.existsSync(itemPath)) {
            safeRm(itemPath, { recursive: isDir });
            logRemoved(label);
        }
    }

    const removed = removeLegacyFiles();
    for (const item of removed) {
        logRemoved(item);
    }

    const permsRemoved = removeHoplaPermissions();
    for (const item of permsRemoved) {
        logRemoved(item);
    }

    log(`\n${GREEN}${BOLD}Done!${RESET} ${DRY_RUN ? "Dry-run complete — no files were changed." : "CLI-managed files removed."}\n`);

    if (pluginActive) {
        log(`${YELLOW}⚠${RESET}  Reminder: the plugin is still active. Run ${CYAN}/plugin uninstall hopla@hopla-marketplace${RESET} inside Claude Code to finish the uninstall.\n`);
    }
    if (hasMarketplaceCache) {
        log(`${YELLOW}⚠${RESET}  Marketplace cache remains at: ${CYAN}${MARKETPLACE_CACHE}${RESET}`);
        log(`   Remove with: ${CYAN}rm -rf "${MARKETPLACE_CACHE}"${RESET}\n`);
    }
}

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
    safeWrite(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    log(`  ${GREEN}✓${RESET}  Permissions configured.\n`);
}

async function install() {
    log(`\n${BOLD}@hopla/claude-setup${RESET} — Global Rules Setup${dryTag()}\n`);

    if (detectPlugin()) {
        log(`${CYAN}ℹ${RESET}  Plugin detected — commands, skills, agents, and hooks are managed by the plugin.`);
        log(`   This CLI only installs global rules (~/.claude/CLAUDE.md) and permissions.\n`);
    }

    const legacyRemoved = removeLegacyFiles();
    if (legacyRemoved.length > 0) {
        log(`${CYAN}${DRY_RUN ? "Would clean up" : "Cleaned up"} legacy CLI files:${RESET}`);
        for (const item of legacyRemoved) {
            log(`  ${YELLOW}↷${RESET}  ${DRY_RUN ? "Would remove" : "Removed"}: ${item}`);
        }
        log("");
    }

    safeMkdir(CLAUDE_DIR, { recursive: true });

    log(`${CYAN}Installing global rules...${RESET}`);
    await installFile(
        path.join(REPO_ROOT, "global-rules.md"),
        path.join(CLAUDE_DIR, "CLAUDE.md"),
        "~/.claude/CLAUDE.md"
    );

    log(`\n${GREEN}${BOLD}Done!${RESET} ${DRY_RUN ? "Dry-run complete — no files were changed." : "Global rules installed."}\n`);

    await setupPermissions();
}

const run = UNINSTALL ? uninstall : (MIGRATE ? migrate : install);
run().catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
});
