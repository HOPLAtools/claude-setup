#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";

const FORCE = process.argv.includes("--force");
const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const COMMANDS_DIR = path.join(CLAUDE_DIR, "commands");
const FILES_DIR = path.join(import.meta.dirname, "files");

const GREEN = "\x1b[32m";
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

async function main() {
    log(`\n${BOLD}@hopla/claude-setup${RESET} — Agentic Coding System\n`);

    // Create directories if needed
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
    fs.mkdirSync(COMMANDS_DIR, { recursive: true });

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

main().catch((err) => {
    console.error("Installation failed:", err.message);
    process.exit(1);
});
