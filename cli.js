#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";

const FORCE = process.argv.includes("--force");
const UNINSTALL = process.argv.includes("--uninstall");
const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const COMMANDS_DIR = path.join(CLAUDE_DIR, "commands");
const FILES_DIR = path.join(import.meta.dirname, "files");

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

    const commandFiles = fs.readdirSync(path.join(FILES_DIR, "commands"));
    const filesToRemove = [
        { dest: path.join(CLAUDE_DIR, "CLAUDE.md"), label: "~/.claude/CLAUDE.md" },
        ...commandFiles.map((file) => ({
            dest: path.join(COMMANDS_DIR, file),
            label: `~/.claude/commands/${file}`,
        })),
    ];

    log(`The following files will be removed:`);
    for (const { label } of filesToRemove) {
        log(`  ${RED}✕${RESET}  ${label}`);
    }

    const ok = await confirm(`\nContinue? (y/N) `);
    if (!ok) {
        log(`\nAborted.\n`);
        return;
    }

    log("");
    for (const { dest, label } of filesToRemove) {
        removeFile(dest, label);
    }

    log(`\n${GREEN}${BOLD}Done!${RESET} Files removed.\n`);
}

const LEGACY_FILES = [
    "code-review-fix.md",
    "code-review.md",
    "commit.md",
    "create-prd.md",
    "execute.md",
    "execution-report.md",
    "plan-feature.md",
    "prime.md",
    "system-review.md",
];

function removeLegacyFiles() {
    const removed = [];
    for (const file of LEGACY_FILES) {
        const dest = path.join(COMMANDS_DIR, file);
        if (fs.existsSync(dest)) {
            fs.rmSync(dest);
            removed.push(file);
        }
    }
    if (removed.length > 0) {
        log(`${CYAN}Cleaning up legacy commands...${RESET}`);
        for (const file of removed) {
            log(`  ${YELLOW}↷${RESET}  Removed legacy: ~/.claude/commands/${file}`);
        }
        log("");
    }
}

async function install() {
    log(`\n${BOLD}@hopla/claude-setup${RESET} — Agentic Coding System\n`);

    // Create directories if needed
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
    fs.mkdirSync(COMMANDS_DIR, { recursive: true });

    // Remove old non-prefixed commands from previous versions
    removeLegacyFiles();

    log(`${CYAN}Installing global rules...${RESET}`);
    await installFile(
        path.join(FILES_DIR, "CLAUDE.md"),
        path.join(CLAUDE_DIR, "CLAUDE.md"),
        "~/.claude/CLAUDE.md"
    );

    log(`\n${CYAN}Installing commands...${RESET}`);
    const commandFiles = fs.readdirSync(path.join(FILES_DIR, "commands"));
    for (const file of commandFiles.sort()) {
        await installFile(
            path.join(FILES_DIR, "commands", file),
            path.join(COMMANDS_DIR, file),
            `~/.claude/commands/${file}`
        );
    }

    log(`\n${GREEN}${BOLD}Done!${RESET} Commands available in any Claude Code session:\n`);
    for (const file of commandFiles.sort()) {
        const name = file.replace(".md", "");
        log(`  ${CYAN}/${name}${RESET}`);
    }
    log(`\nRun with ${BOLD}--force${RESET} to overwrite all files without prompting.\n`);
}

const run = UNINSTALL ? uninstall : install;
run().catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
});
