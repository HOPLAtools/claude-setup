#!/usr/bin/env node
// SessionStart hook: minimal project context (~1K chars typical, hard cap 1,500).
// Emits: branch, uncommitted summary (max 5 sample lines), active plan (+ step,
// from .agents/hopla-active-plan.json or newest non-draft plan with tasks) and the
// pre-compact snapshot replay. No skills list, no rules excerpt, no commits —
// Claude Code already loads CLAUDE.md and lists skills natively.
// The snapshot is replayed only after /compact or on resume (stdin `source`);
// with no payload (manual run, TTY) the source is unknown and it is replayed.
// Always exits 0.

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getActivePlan } from "./lib/plans.js";

const MAX_STATUS_LINES = 5;
const MAX_LINE = 100;
const MAX_CHARS = 1500;
const SNAPSHOT_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const REREAD = " — re-read this plan before continuing";

function run(cmd) {
    try {
        return execSync(cmd, { cwd: process.cwd(), stdio: ["ignore", "pipe", "ignore"] }).toString().trimEnd();
    } catch {
        return null;
    }
}

const REPLAY_SOURCES = new Set(["compact", "resume"]);

// Clips at the last word boundary before `max` (hard cut only when the last
// space is too far back), then appends "…".
function clip(s, max = MAX_LINE) {
    if (s.length <= max) return s;
    const cut = s.slice(0, max);
    const space = cut.lastIndexOf(" ");
    return (space >= max * 0.6 ? cut.slice(0, space) : cut).trimEnd() + "…";
}

// SessionStart `source` from stdin, or null when unknown. Never blocks on a TTY.
function readSource() {
    if (process.stdin.isTTY) return null;
    try {
        const payload = JSON.parse(fs.readFileSync(0, "utf8"));
        return payload && typeof payload.source === "string" ? payload.source : null;
    } catch {
        return null;
    }
}

// First `max` lines plus a "… +K more" tail.
function capLines(text, max) {
    const lines = text.split("\n").filter((l) => l.length > 0);
    const shown = lines.slice(0, max);
    if (lines.length > max) shown.push(`… +${lines.length - max} more`);
    return shown;
}

function readSnapshot(cwd) {
    try {
        const snap = JSON.parse(fs.readFileSync(path.join(cwd, ".claude", "compact-snapshot.json"), "utf8"));
        const ageMs = Date.now() - Date.parse(snap.timestamp);
        if (!Number.isFinite(ageMs) || ageMs >= SNAPSHOT_MAX_AGE_MS) return null;
        return { snap, minutes: Math.max(0, Math.round(ageMs / 60000)) };
    } catch {
        return null; // missing or malformed
    }
}

function main() {
    const cwd = process.cwd();
    const lines = [];

    const branch = run("git branch --show-current");
    const status = run("git status --short");
    if (branch) lines.push(clip(`Branch: ${branch}`));
    if (status !== null) {
        const all = status.split("\n").filter((l) => l.length > 0);
        if (all.length === 0) {
            lines.push("Working tree is clean.");
        } else {
            const untracked = all.filter((l) => l.startsWith("??")).length;
            lines.push(`Uncommitted: ${all.length} (${all.length - untracked} tracked, ${untracked} untracked)`);
            for (const l of capLines(status, MAX_STATUS_LINES)) lines.push(clip(l));
        }
    }

    let active = null;
    try {
        active = getActivePlan(cwd);
    } catch {
        active = null;
    }
    if (active) lines.push(clip(`Active plan: ${active.path}${active.step ? ` — step: ${active.step}` : ""}`));

    const source = readSource();
    const replay = source === null || REPLAY_SOURCES.has(source) ? readSnapshot(cwd) : null;
    if (replay) {
        const { snap, minutes } = replay;
        lines.push(`Resuming from pre-compact snapshot (${minutes} min ago):`);
        if (typeof snap.branch === "string" && (snap.branch !== branch || snap.inWorktree)) {
            lines.push(clip(`- branch: ${snap.branch}${snap.inWorktree ? " (worktree)" : ""}`));
        }
        const planPath = typeof snap.activePlanPath === "string" && snap.activePlanPath
            ? snap.activePlanPath
            : typeof snap.activePlan === "string" && snap.activePlan
                ? path.posix.join(typeof snap.plansDir === "string" && snap.plansDir ? snap.plansDir : ".agents/plans", snap.activePlan)
                : null;
        if (planPath) {
            const step = typeof snap.step === "string" && snap.step ? ` (step: ${snap.step})` : "";
            // Clip the variable part so the re-read instruction always survives.
            lines.push(clip(`- active plan: ${planPath.split(path.sep).join("/")}${step}`, MAX_LINE - REREAD.length) + REREAD);
        }
        if (typeof snap.uncommitted === "string" && snap.uncommitted.trim()) {
            lines.push("- uncommitted at snapshot:");
            for (const l of capLines(snap.uncommitted, MAX_STATUS_LINES)) lines.push(clip(l));
        }
    }

    if (lines.length === 0) return;
    let out = lines.join("\n");
    if (out.length > MAX_CHARS) out = out.slice(0, MAX_CHARS - 1) + "…";
    process.stdout.write(out);
}

try {
    main();
} catch {
    // Never fail session start (exit code stays 0).
}
