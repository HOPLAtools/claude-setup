#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";
import { execSync } from "child_process";

const FORCE = process.argv.includes("--force");
const UNINSTALL = process.argv.includes("--uninstall");
const MIGRATE = process.argv.includes("--migrate");
const VERSION = process.argv.includes("--version") || process.argv.includes("-v");
const DRY_RUN = process.argv.includes("--dry-run");
const STATUS = process.argv.includes("status");
const JSON_OUT = process.argv.includes("--json");
const SETUP_STATUSLINE = process.argv.includes("--setup-statusline");
const REMOVE_STATUSLINE = process.argv.includes("--remove-statusline");

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
const STATUSLINE_SCRIPT = path.join(MARKETPLACE_CACHE, "hooks", "statusline.js");
// Substring used to identify a statusLine block managed by this plugin.
// Survives manual renames of the marketplace as long as users keep "hopla" in the path.
const STATUSLINE_MARKER = "hopla-marketplace";
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

// Atomic write: stage to a tmp file and rename over the target.
// Protects ~/.claude/settings.json from corruption if the process crashes mid-write.
// Exported for testing — when imported as a library, callers can pass dryRun explicitly.
export function safeWrite(target, content, { dryRun = DRY_RUN } = {}) {
    if (dryRun) return;
    const tmp = `${target}.tmp.${process.pid}.${Date.now()}`;
    try {
        fs.writeFileSync(tmp, content);
        fs.renameSync(tmp, target);
    } catch (err) {
        try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
        throw err;
    }
}

// Atomic copy: copy to a tmp path and rename over the destination.
function safeCopy(src, dest) {
    if (DRY_RUN) return;
    const tmp = `${dest}.tmp.${process.pid}.${Date.now()}`;
    try {
        fs.copyFileSync(src, tmp);
        fs.renameSync(tmp, dest);
    } catch (err) {
        try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
        throw err;
    }
}

function safeMkdir(dir, opts) {
    if (DRY_RUN) return;
    fs.mkdirSync(dir, opts);
}

function logRemoved(label) {
    const verb = DRY_RUN ? "Would remove" : "Removed";
    log(`  ${RED}✕${RESET}  ${verb}: ${label}`);
}

// Safe parser for settings.json-style files. Returns null when the file is
// missing. Warns (and returns null) when the file exists but is not valid JSON
// — previously these failures were silently swallowed, causing cleanup and
// permission updates to skip with no signal to the user.
// Exported for unit testing.
export function parseSettingsFile(settingsPath) {
    if (!fs.existsSync(settingsPath)) return null;
    try {
        return JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    } catch (err) {
        log(`  ${YELLOW}⚠${RESET}  Could not parse ${settingsPath}: ${err.message}`);
        log(`     Skipping this file. Fix the JSON and re-run to apply changes.`);
        return null;
    }
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

// Guide files the pre-plugin CLI (≤ v1.11.x) copied to ~/.claude/commands/guides/.
// The plugin now ships them via commands/guides/, namespaced as /hopla:guides:<name>,
// so the user-level copies show up as duplicates in autocomplete (no "(hopla)" suffix).
// Cleanup removes only files whose name matches a plugin-shipped guide, leaving any
// custom user guides in ~/.claude/commands/guides/ untouched.
const LEGACY_GUIDE_FILES = [
    "ai-optimized-codebase.md",
    "data-audit.md",
    "hooks-reference.md",
    "mcp-integration.md",
    "remote-coding.md",
    "review-checklist.md",
    "scaling-beyond-engineering.md",
    "validation-pyramid.md",
    "write-skill.md",
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

    // Legacy guide duplicates in ~/.claude/commands/guides/ (pre-plugin CLI).
    // Only remove files matching a guide the plugin currently ships; preserve
    // any custom user-created guides in the same directory.
    const legacyGuidesDir = path.join(COMMANDS_DIR, "guides");
    if (fs.existsSync(legacyGuidesDir)) {
        for (const guideFile of LEGACY_GUIDE_FILES) {
            const guidePath = path.join(legacyGuidesDir, guideFile);
            if (fs.existsSync(guidePath)) {
                safeRm(guidePath);
                removed.push(`~/.claude/commands/guides/${guideFile}`);
            }
        }
        if (!DRY_RUN) {
            try {
                const remaining = fs.readdirSync(legacyGuidesDir);
                if (remaining.length === 0) fs.rmSync(legacyGuidesDir, { recursive: true });
            } catch { /* ignore */ }
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
        const settings = parseSettingsFile(settingsPath);
        if (!settings) continue;

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
    }

    return removed;
}

function removeHoplaPermissions() {
    const removed = [];
    for (const settingsPath of SETTINGS_FILES) {
        const settings = parseSettingsFile(settingsPath);
        if (!settings) continue;
        if (!settings.permissions || !Array.isArray(settings.permissions.allow)) continue;
        const before = settings.permissions.allow.length;
        settings.permissions.allow = settings.permissions.allow.filter(
            (p) => !ALL_HOPLA_PERMISSIONS.has(p)
        );
        if (settings.permissions.allow.length !== before) {
            safeWrite(settingsPath, JSON.stringify(settings, null, 2) + "\n");
            removed.push(`permissions from ${path.basename(settingsPath)}`);
        }
    }
    return removed;
}

function detectPlugin() {
    for (const settingsPath of SETTINGS_FILES) {
        const settings = parseSettingsFile(settingsPath);
        if (!settings) continue;
        const plugins = settings.enabledPlugins || {};
        if (Object.keys(plugins).some((key) => key.startsWith("hopla@"))) return true;
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

    const statuslineRemoved = removeStatuslineFromSettings();
    for (const item of statuslineRemoved) {
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

    // Use parseSettingsFile so malformed JSON is reported instead of silently
    // overwritten. When the file is missing we start from defaults.
    let settings = parseSettingsFile(settingsPath);
    if (!settings) {
        if (fs.existsSync(settingsPath)) {
            // Malformed JSON — do NOT overwrite (user needs to fix first)
            log(`  ${YELLOW}↷${RESET}  Skipped permissions setup — settings.json is not valid JSON.`);
            return;
        }
        settings = { permissions: { allow: [] } };
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

async function setupStatusline() {
    log(`\n${BOLD}@hopla/claude-setup${RESET} — Setup statusline${dryTag()}\n`);

    if (!fs.existsSync(STATUSLINE_SCRIPT)) {
        log(`${RED}✕${RESET}  Plugin not detected at ${STATUSLINE_SCRIPT}`);
        log(`   Install the plugin first inside Claude Code:`);
        log(`   ${CYAN}/plugin marketplace add HOPLAtools/claude-setup${RESET}`);
        log(`   ${CYAN}/plugin install hopla@hopla-marketplace${RESET}\n`);
        process.exit(1);
    }

    const settingsPath = path.join(CLAUDE_DIR, "settings.json");
    let settings = parseSettingsFile(settingsPath);
    if (!settings) {
        if (fs.existsSync(settingsPath)) {
            log(`  ${YELLOW}↷${RESET}  Skipped — settings.json is not valid JSON. Fix it and re-run.\n`);
            return;
        }
        settings = {};
    }

    const command = `node ${STATUSLINE_SCRIPT}`;
    const newBlock = { type: "command", command };

    const existing = settings.statusLine;
    if (existing && typeof existing === "object") {
        const isOurs = typeof existing.command === "string" && existing.command.includes(STATUSLINE_MARKER);
        if (isOurs && existing.command === command) {
            log(`${GREEN}✓${RESET}  Statusline already configured (idempotent — no changes).\n`);
            return;
        }
        if (!isOurs) {
            log(`  ${YELLOW}⚠${RESET}  Existing statusLine points elsewhere:`);
            log(`     ${existing.command || JSON.stringify(existing)}`);
            const ok = await confirm(`  Overwrite with Hopla statusline? (y/N) `);
            if (!ok) {
                log(`  ${YELLOW}↷${RESET}  Kept existing statusLine. No changes.\n`);
                return;
            }
        }
    }

    settings.statusLine = newBlock;
    safeWrite(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    log(`  ${GREEN}✓${RESET}  ${DRY_RUN ? "Would write" : "Wrote"} statusLine to ~/.claude/settings.json:`);
    log(`     ${CYAN}${command}${RESET}\n`);
}

function removeStatuslineFromSettings() {
    const removed = [];
    const settingsPath = path.join(CLAUDE_DIR, "settings.json");
    const settings = parseSettingsFile(settingsPath);
    if (!settings || !settings.statusLine) return removed;

    const cmd = settings.statusLine.command;
    if (typeof cmd === "string" && cmd.includes(STATUSLINE_MARKER)) {
        delete settings.statusLine;
        safeWrite(settingsPath, JSON.stringify(settings, null, 2) + "\n");
        removed.push(`statusLine from settings.json`);
    }
    return removed;
}

async function removeStatusline() {
    log(`\n${BOLD}@hopla/claude-setup${RESET} — Remove statusline${dryTag()}\n`);
    const removed = removeStatuslineFromSettings();
    if (removed.length === 0) {
        log(`${GREEN}✓${RESET}  No Hopla statusline found. Nothing to remove.\n`);
        return;
    }
    for (const item of removed) {
        logRemoved(item);
    }
    log("");
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

// =====================================================================
// status — read-only inspection of a project's .agents/ workflow state
// =====================================================================

// Lists *.md files (and *.draft.md) in a directory. Returns [] if missing
// or unreadable. Sorted alphabetically for stable output.
function listMarkdownFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    try {
        return fs.readdirSync(dir)
            .filter((f) => f.endsWith(".md") && !f.startsWith("."))
            .sort();
    } catch {
        return [];
    }
}

// Best-effort git inspection — silently degrades when git is unavailable
// or the cwd is not inside a repo. The status command must never fail
// because of git.
function readGitState(cwd) {
    const exec = (cmd) => {
        try {
            return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
        } catch {
            return null;
        }
    };
    const insideRepo = exec("git rev-parse --is-inside-work-tree");
    if (insideRepo !== "true") return { in_repo: false };
    const branch = exec("git rev-parse --abbrev-ref HEAD");
    const statusShort = exec("git status --short");
    const uncommitted = statusShort ? statusShort.split("\n").filter(Boolean).length : 0;
    return {
        in_repo: true,
        branch: branch || "(detached)",
        uncommitted,
    };
}

function readWorkflowState(cwd) {
    const agentsDir = path.join(cwd, ".agents");
    const present = fs.existsSync(agentsDir);

    const plansDir = path.join(agentsDir, "plans");
    const allPlanFiles = listMarkdownFiles(plansDir);
    const draft = allPlanFiles.filter((f) => f.endsWith(".draft.md"));
    const active = allPlanFiles.filter((f) => !f.endsWith(".draft.md"));

    return {
        agents_dir_present: present,
        plans: {
            draft,
            active,
            done: listMarkdownFiles(path.join(plansDir, "done")),
            backlog: listMarkdownFiles(path.join(plansDir, "backlog")),
        },
        specs: listMarkdownFiles(path.join(agentsDir, "specs")),
        code_reviews: listMarkdownFiles(path.join(agentsDir, "code-reviews")),
        execution_reports: listMarkdownFiles(path.join(agentsDir, "execution-reports")),
        system_reviews: listMarkdownFiles(path.join(agentsDir, "system-reviews")),
        rca: listMarkdownFiles(path.join(agentsDir, "rca")),
        audits: listMarkdownFiles(path.join(agentsDir, "audits")),
    };
}

function suggestNext(state) {
    if (!state.agents_dir_present) {
        return "No .agents/ found — run /hopla:init-project to scaffold the workflow.";
    }
    if (state.plans.draft.length > 0) {
        return `Plan in draft (${state.plans.draft[0]}) — run /hopla:review-plan or finalize it.`;
    }
    if (state.plans.active.length > 0) {
        const plan = state.plans.active[0];
        const baseName = plan.replace(/\.md$/, "");
        const hasReport = state.execution_reports.some((r) => r.includes(baseName));
        const hasReview = state.code_reviews.some((r) => r.includes(baseName));
        if (!hasReview) return `Active plan (${plan}) — execute it or run code-review skill on changes.`;
        if (!hasReport) return `Active plan (${plan}) reviewed — run execution-report skill.`;
        return `Active plan (${plan}) reviewed and reported — consider /hopla:archive or /hopla:system-review.`;
    }
    if (state.code_reviews.length > 0) {
        return `Pending code reviews — run /hopla:code-review-fix on them.`;
    }
    return "Workflow clean — start with /hopla:plan-feature.";
}

function status() {
    const cwd = process.cwd();
    const git = readGitState(cwd);
    const workflow = readWorkflowState(cwd);
    const next = suggestNext(workflow);

    if (JSON_OUT) {
        process.stdout.write(JSON.stringify({ cwd, git, ...workflow, next }, null, 2) + "\n");
        return;
    }

    log(`\n${BOLD}@hopla/claude-setup${RESET} — status (${cwd})\n`);

    if (git.in_repo) {
        log(`${CYAN}Git:${RESET}`);
        log(`  Branch:       ${git.branch}`);
        log(`  Uncommitted:  ${git.uncommitted} ${git.uncommitted === 1 ? "file" : "files"}`);
        log("");
    } else {
        log(`${YELLOW}Not inside a git repository.${RESET}\n`);
    }

    if (!workflow.agents_dir_present) {
        log(`${YELLOW}No .agents/ directory found.${RESET}`);
        log(`Run ${CYAN}/hopla:init-project${RESET} to scaffold it.\n`);
        log(`${BOLD}Suggested next:${RESET} ${next}\n`);
        return;
    }

    log(`${CYAN}Plans:${RESET}`);
    log(`  Draft (${workflow.plans.draft.length}):    ${workflow.plans.draft.join(", ") || "—"}`);
    log(`  Active (${workflow.plans.active.length}):   ${workflow.plans.active.join(", ") || "—"}`);
    log(`  Done (${workflow.plans.done.length}):     ${workflow.plans.done.join(", ") || "—"}`);
    log(`  Backlog (${workflow.plans.backlog.length}):  ${workflow.plans.backlog.join(", ") || "—"}`);
    log("");

    log(`${CYAN}Other artifacts:${RESET}`);
    log(`  Specs:               ${workflow.specs.length}`);
    log(`  Code reviews:        ${workflow.code_reviews.length}`);
    log(`  Execution reports:   ${workflow.execution_reports.length}`);
    log(`  System reviews:      ${workflow.system_reviews.length}`);
    log(`  RCAs:                ${workflow.rca.length}`);
    log(`  Audits:              ${workflow.audits.length}`);
    log("");

    log(`${BOLD}Suggested next:${RESET} ${next}\n`);
}

const run = STATUS
    ? async () => status()
    : SETUP_STATUSLINE
    ? setupStatusline
    : REMOVE_STATUSLINE
    ? removeStatusline
    : (UNINSTALL ? uninstall : (MIGRATE ? migrate : install));

// Only invoke the dispatcher when this file is executed directly (e.g. via
// `node cli.js` or the npm bin). When the file is imported as a library
// (tests), skip — tests call the exported helpers themselves.
import { pathToFileURL } from "url";
const isMainModule = process.argv[1]
    && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
    run().catch((err) => {
        console.error("Failed:", err.message);
        process.exit(1);
    });
}
