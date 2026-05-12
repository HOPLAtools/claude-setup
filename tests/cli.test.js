// Unit tests for cli.js helpers. Covers the pure functions exposed for testing:
//   - parseSettingsFile: missing/valid/malformed JSON
//   - safeWrite: atomic write + dry-run respect
//
// Integration tests for the CLI subcommands (setup-statusline, uninstall,
// migrate) run the script with a fake $HOME to verify side effects on disk.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseSettingsFile, safeWrite } from "../cli.js";
import { makeTempDir, writeJson, readJson, rmDir } from "./helpers/fixtures.js";

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLI = path.join(REPO_ROOT, "cli.js");

// Run cli.js with a fake $HOME and the given args. Returns { status, stdout, stderr }.
function runCli(args, { home }) {
    return spawnSync("node", [CLI, ...args], {
        encoding: "utf8",
        env: { ...process.env, HOME: home, CLAUDE_DRY_RUN: undefined },
    });
}

test("parseSettingsFile: missing file returns null", () => {
    const result = parseSettingsFile("/nonexistent/path/to/settings.json");
    assert.equal(result, null);
});

test("parseSettingsFile: valid JSON parses correctly", () => {
    const tmp = makeTempDir();
    try {
        const filePath = path.join(tmp, "settings.json");
        writeJson(filePath, { permissions: { allow: ["Bash(git *)"] } });
        const parsed = parseSettingsFile(filePath);
        assert.deepEqual(parsed, { permissions: { allow: ["Bash(git *)"] } });
    } finally {
        rmDir(tmp);
    }
});

test("parseSettingsFile: malformed JSON returns null (does not throw)", () => {
    const tmp = makeTempDir();
    try {
        const filePath = path.join(tmp, "settings.json");
        fs.writeFileSync(filePath, "{ invalid json");
        const parsed = parseSettingsFile(filePath);
        assert.equal(parsed, null);
    } finally {
        rmDir(tmp);
    }
});

test("safeWrite: writes file atomically when dryRun=false", () => {
    const tmp = makeTempDir();
    try {
        const target = path.join(tmp, "out.json");
        safeWrite(target, '{"hello":"world"}\n', { dryRun: false });
        assert.equal(fs.readFileSync(target, "utf8"), '{"hello":"world"}\n');
    } finally {
        rmDir(tmp);
    }
});

test("safeWrite: dryRun=true does NOT write the file", () => {
    const tmp = makeTempDir();
    try {
        const target = path.join(tmp, "out.json");
        safeWrite(target, "should not exist", { dryRun: true });
        assert.equal(fs.existsSync(target), false);
    } finally {
        rmDir(tmp);
    }
});

test("safeWrite: leaves no .tmp.* leftovers after a successful write", () => {
    const tmp = makeTempDir();
    try {
        const target = path.join(tmp, "out.json");
        safeWrite(target, "ok", { dryRun: false });
        const entries = fs.readdirSync(tmp);
        const leftovers = entries.filter((f) => f.includes(".tmp."));
        assert.deepEqual(leftovers, []);
    } finally {
        rmDir(tmp);
    }
});

// === Integration tests (spawn the CLI with fake $HOME) =================

test("CLI --version prints the package version", () => {
    const tmp = makeTempDir();
    try {
        const res = runCli(["--version"], { home: tmp });
        assert.equal(res.status, 0);
        assert.match(res.stdout, /^@hopla\/claude-setup v\d+\.\d+\.\d+/);
    } finally {
        rmDir(tmp);
    }
});

test("CLI --dry-run --force install does not touch the fake HOME", () => {
    const tmp = makeTempDir();
    try {
        const res = runCli(["--dry-run", "--force"], { home: tmp });
        assert.equal(res.status, 0);
        // Dry-run must not create ~/.claude/CLAUDE.md
        const claudeFile = path.join(tmp, ".claude", "CLAUDE.md");
        assert.equal(fs.existsSync(claudeFile), false);
    } finally {
        rmDir(tmp);
    }
});

test("CLI --setup-statusline aborts when plugin is not installed (path missing)", () => {
    const tmp = makeTempDir();
    try {
        const res = runCli(["--setup-statusline"], { home: tmp });
        assert.equal(res.status, 1);
        assert.match(res.stdout, /Plugin not detected/);
    } finally {
        rmDir(tmp);
    }
});

test("CLI --remove-statusline is a no-op when settings.json has no Hopla statusLine", () => {
    const tmp = makeTempDir();
    try {
        const settingsPath = path.join(tmp, ".claude", "settings.json");
        writeJson(settingsPath, {
            statusLine: { type: "command", command: "/usr/local/bin/my-own-statusline" },
        });
        const res = runCli(["--remove-statusline"], { home: tmp });
        assert.equal(res.status, 0);
        assert.match(res.stdout, /No Hopla statusline found/);
        const after = readJson(settingsPath);
        assert.deepEqual(after.statusLine, {
            type: "command",
            command: "/usr/local/bin/my-own-statusline",
        });
    } finally {
        rmDir(tmp);
    }
});

test("CLI --migrate removes legacy guides from ~/.claude/commands/guides/", () => {
    const tmp = makeTempDir();
    try {
        const guidesDir = path.join(tmp, ".claude", "commands", "guides");
        fs.mkdirSync(guidesDir, { recursive: true });
        // Two plugin-shipped guides + one custom user guide
        fs.writeFileSync(path.join(guidesDir, "hooks-reference.md"), "# Hooks Reference Guide");
        fs.writeFileSync(path.join(guidesDir, "data-audit.md"), "# Guide: Data Audit");
        fs.writeFileSync(path.join(guidesDir, "my-custom-guide.md"), "# My personal guide");

        const res = runCli(["--migrate"], { home: tmp });
        assert.equal(res.status, 0);
        // Plugin guides removed
        assert.equal(fs.existsSync(path.join(guidesDir, "hooks-reference.md")), false);
        assert.equal(fs.existsSync(path.join(guidesDir, "data-audit.md")), false);
        // Custom user guide preserved
        assert.equal(fs.existsSync(path.join(guidesDir, "my-custom-guide.md")), true);
        // Directory still exists because it has the custom guide
        assert.equal(fs.existsSync(guidesDir), true);
    } finally {
        rmDir(tmp);
    }
});

test("CLI --migrate removes the legacy guides/ directory entirely when no custom files remain", () => {
    const tmp = makeTempDir();
    try {
        const guidesDir = path.join(tmp, ".claude", "commands", "guides");
        fs.mkdirSync(guidesDir, { recursive: true });
        fs.writeFileSync(path.join(guidesDir, "write-skill.md"), "# Writing Skills Guide");
        fs.writeFileSync(path.join(guidesDir, "mcp-integration.md"), "# MCP Integration Guide");

        const res = runCli(["--migrate"], { home: tmp });
        assert.equal(res.status, 0);
        // All plugin guides removed
        assert.equal(fs.existsSync(path.join(guidesDir, "write-skill.md")), false);
        assert.equal(fs.existsSync(path.join(guidesDir, "mcp-integration.md")), false);
        // Now-empty directory cleaned up
        assert.equal(fs.existsSync(guidesDir), false);
    } finally {
        rmDir(tmp);
    }
});

test("CLI --remove-statusline removes only a Hopla-marked statusLine", () => {
    const tmp = makeTempDir();
    try {
        const settingsPath = path.join(tmp, ".claude", "settings.json");
        writeJson(settingsPath, {
            statusLine: {
                type: "command",
                command: "node /fake/.claude/plugins/marketplaces/hopla-marketplace/hooks/statusline.js",
            },
            otherKey: "preserved",
        });
        const res = runCli(["--remove-statusline"], { home: tmp });
        assert.equal(res.status, 0);
        assert.match(res.stdout, /statusLine from settings\.json/);
        const after = readJson(settingsPath);
        assert.equal(after.statusLine, undefined);
        assert.equal(after.otherKey, "preserved");
    } finally {
        rmDir(tmp);
    }
});
