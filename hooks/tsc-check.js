#!/usr/bin/env node
// Type check once per turn on the nearest tsconfig.json. One script, two modes
// (chosen by payload.hook_event_name):
//
//   PostToolUse — cheap recorder: appends the absolute paths of edited TS/JS
//                 files to <os tmp>/hopla-tsc-<session_id>.json. No tsc, no output.
//   Stop        — for the recorded files, walks up to the nearest tsconfig.json
//                 (stops at the git root or /), runs
//                 `tsc -p <tsconfig> --noEmit --pretty false` once per project
//                 (max 3) and blocks (exit 2 + stderr) ONLY for errors in files
//                 edited this turn: first 30 + totals + full log path. Errors in
//                 other files never block (one-line systemMessage instead).
//                 Loop guard: at most 2 blocks per turn, never twice for the
//                 same error set.
//
// No payload at all (manual run) → check <cwd>/tsconfig.json immediately.
// Per-edit diagnostics are left to the official typescript-lsp plugin.

import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const TS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"];
const MAX_SHOWN = 30;
const MAX_PROJECTS = 3;
const MAX_BLOCKS = 2;
const ERROR_RE = /^(.+?)\((\d+),(\d+)\): error TS\d+:/;
const TSC_TIMEOUT_MS = 50000; // total budget per Stop, split across projects

// Real path (symlinked checkouts, macOS /var -> /private/var). For a path that
// does not exist (yet), resolve its deepest existing ancestor and re-append the rest.
function real(p) {
    let head = path.resolve(p);
    const tail = [];
    for (;;) {
        try {
            return path.join(fs.realpathSync(head), ...tail);
        } catch {
            const parent = path.dirname(head);
            if (parent === head) return path.resolve(p);
            tail.unshift(path.basename(head));
            head = parent;
        }
    }
}

const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

// Pulls every file_path the hook payload references (Write/Edit/MultiEdit).
function extractFilePaths(payload) {
    const input = payload?.tool_input;
    if (!input) return [];
    const collected = new Set();
    if (typeof input.file_path === "string") collected.add(input.file_path);
    if (typeof input.path === "string") collected.add(input.path);
    if (Array.isArray(input.edits)) {
        for (const edit of input.edits) {
            if (edit && typeof edit.file_path === "string") collected.add(edit.file_path);
        }
    }
    return [...collected];
}

const isCompilable = (f) => TS_EXTENSIONS.includes(path.extname(f).toLowerCase());

function recordPath(payload, cwd) {
    const raw = typeof payload.session_id === "string" && payload.session_id
        ? payload.session_id
        : `cwd-${sha1(cwd).slice(0, 12)}`;
    return path.join(os.tmpdir(), `hopla-tsc-${raw.replace(/[^A-Za-z0-9_-]/g, "_")}.json`);
}

function readRecord(file) {
    try {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        if (!data || !Array.isArray(data.files)) return null;
        return { files: data.files, blocks: Number(data.blocks) || 0, lastSignature: data.lastSignature ?? null };
    } catch {
        return null;
    }
}

// Atomic replace so a concurrent reader never sees a half-written file. The
// temp file is created exclusively ("wx": never written through a symlink
// planted at that predictable name) with mode 0600; rename replaces a symlink at
// the record path itself instead of following it.
function writeRecord(file, record) {
    try {
        const tmp = `${file}.${process.pid}.tmp`;
        fs.rmSync(tmp, { force: true });
        fs.writeFileSync(tmp, JSON.stringify(record), { flag: "wx", mode: 0o600 });
        fs.renameSync(tmp, file);
    } catch {
        // best-effort
    }
}

const clearRecord = (file) => fs.rmSync(file, { force: true });

const hasGit = (dir) => fs.existsSync(path.join(dir, ".git"));

// Nearest dir containing tsconfig.json, walking up from `dir`; stops after the
// dir that contains .git, or at the filesystem root.
function findTsconfigDir(dir) {
    let cur = dir;
    for (;;) {
        if (fs.existsSync(path.join(cur, "tsconfig.json"))) return cur;
        const parent = path.dirname(cur);
        if (hasGit(cur) || parent === cur) return null;
        cur = parent;
    }
}

// Local tsc, walking up from the tsconfig dir (hoisted monorepos), else npx.
function resolveTsc(startDir) {
    let cur = startDir;
    for (;;) {
        const bin = path.join(cur, "node_modules", ".bin", "tsc");
        if (fs.existsSync(bin)) return { file: bin, pre: [] };
        const parent = path.dirname(cur);
        if (hasGit(cur) || parent === cur) break;
        cur = parent;
    }
    // --no-install: never trigger a network install.
    return { file: "npx", pre: ["--no-install", "tsc"] };
}

// No shell: paths are passed as argv, so names like `p$(cmd)` are never executed.
function runTsc(tsconfigDir, timeout = TSC_TIMEOUT_MS) {
    const { file, pre } = resolveTsc(tsconfigDir);
    const args = [...pre, "-p", path.join(tsconfigDir, "tsconfig.json"), "--noEmit", "--pretty", "false"];
    try {
        execFileSync(file, args, { cwd: tsconfigDir, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024, timeout });
        return { ok: true, output: "" };
    } catch (err) {
        const output = (err.stdout || "").toString() + (err.stderr || "").toString();
        return { ok: false, output };
    }
}

// A "solution" tsconfig only lists project references: its program has no root
// files, so `tsc -p` on it checks nothing. TypeScript itself resolves the
// effective config (`--showConfig`: extends chains, npm bases, JSONC), and the
// config counts as a solution only when that succeeds with references and no
// root files. `references` is never inherited, so files without it skip the spawn.
// Any failure counts as "not a solution" (tsc runs and reports it).
function isSolutionConfig(dir) {
    const file = path.join(dir, "tsconfig.json");
    try {
        if (!fs.readFileSync(file, "utf8").includes('"references"')) return false;
        const { file: bin, pre } = resolveTsc(dir);
        const out = execFileSync(bin, [...pre, "--showConfig", "-p", file], {
            cwd: dir, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024, timeout: 15000,
        });
        const cfg = JSON.parse(out.toString());
        const roots = Array.isArray(cfg.files) ? cfg.files : [];
        return Array.isArray(cfg.references) && cfg.references.length > 0 && roots.length === 0;
    } catch {
        return false;
    }
}

function writeLog(relDir, absDir, output) {
    const name = relDir === "." ? "root" : relDir.replace(/[^A-Za-z0-9_-]+/g, "_");
    const slug = `${name}-${sha1(absDir).slice(0, 8)}`;
    for (const base of ["/tmp", os.tmpdir()]) {
        const file = path.join(base, `hopla-tsc-${slug}.log`);
        try {
            fs.rmSync(file, { force: true }); // never write through a planted symlink
            fs.writeFileSync(file, output, { flag: "wx" });
            return file;
        } catch {
            // try the next location
        }
    }
    return "(log not written)";
}

// Runs tsc for each project and splits error lines into own (edited this turn) and other.
function checkProjects(projects, ownFiles, cwd) {
    const results = [];
    const own = new Set([...ownFiles].map(real));
    const budget = Math.floor(TSC_TIMEOUT_MS / Math.max(1, projects.length));
    for (const dir of projects) {
        const { ok, output } = runTsc(dir, budget);
        const realDir = real(dir);
        if (ok) continue;
        const relDir = path.relative(cwd, dir).split(path.sep).join("/") || ".";
        const log = writeLog(relDir, dir, output);
        const ownLines = [];
        let other = 0;
        let anyError = false;
        for (const line of output.split("\n")) {
            const m = line.match(ERROR_RE);
            if (!m) continue;
            anyError = true;
            // tsc prints paths relative to the real cwd.
            if (own.has(real(path.resolve(realDir, m[1])))) ownLines.push(line.trimEnd());
            else other++;
        }
        const failure = anyError ? null : output.split("\n").filter((l) => l.trim()).slice(0, MAX_SHOWN);
        results.push({ relDir, log, own: ownLines, other, failure });
    }
    return results;
}

function formatBlock(results, skipped) {
    const out = [];
    let budget = MAX_SHOWN;
    for (const r of results) {
        if (r.own.length === 0) continue;
        const shown = Math.min(budget, r.own.length);
        out.push(`TypeScript errors in files you edited (${r.relDir}: ${r.own.length} errors, showing first ${shown}):`);
        out.push(...r.own.slice(0, shown));
        budget -= shown;
        if (r.other > 0) out.push(`${r.other} errors in other files (not edited this turn), see log`);
        out.push(`Full log: ${r.log}`);
    }
    if (skipped > 0) out.push(`(${skipped} more tsconfig project(s) not checked this turn)`);
    return out.join("\n") + "\n";
}

function otherNotice(results) {
    const parts = [];
    for (const r of results) {
        if (r.failure) parts.push(`tsc could not run in ${r.relDir} (${(r.failure[0] || "unknown error").slice(0, 120)}), see ${r.log}`);
        else if (r.other > 0) parts.push(`tsc: ${r.other} errors in other files (not edited this turn), see ${r.log}`);
    }
    return parts.join("; ");
}

function onPostToolUse(payload, cwd) {
    const base = typeof payload.cwd === "string" && payload.cwd ? payload.cwd : cwd;
    const files = extractFilePaths(payload).filter(isCompilable).map((f) => path.resolve(base, f));
    if (files.length === 0) return 0;
    const file = recordPath(payload, base);
    const record = readRecord(file) || { files: [], blocks: 0, lastSignature: null };
    for (const f of files) if (!record.files.includes(f)) record.files.push(f);
    writeRecord(file, record);
    return 0;
}

function onStop(payload, cwd) {
    const base = typeof payload.cwd === "string" && payload.cwd ? payload.cwd : cwd;
    const file = recordPath(payload, base);
    const record = readRecord(file);
    if (!record || record.files.length === 0) return 0;
    // A Stop without stop_hook_active is the first stop attempt of a turn.
    if (!payload.stop_hook_active) record.blocks = 0;

    const projects = [];
    for (const f of record.files) {
        const dir = findTsconfigDir(path.dirname(f));
        if (dir && !projects.includes(dir)) projects.push(dir);
    }
    const solutions = projects.filter(isSolutionConfig);
    const solutionNote = solutions.length
        ? `tsc: skipped solution-style tsconfig (references only) in ${solutions
            .map((d) => path.relative(base, d).split(path.sep).join("/") || ".").join(", ")}; per-turn type check needs a tsconfig that includes the edited files`
        : "";
    const checked = projects.filter((d) => !solutions.includes(d)).slice(0, MAX_PROJECTS);
    // Files of projects beyond MAX_PROJECTS stay recorded for the next Stop.
    const leftover = record.files.filter((f) => {
        const dir = findTsconfigDir(path.dirname(f));
        return dir && !checked.includes(dir) && !solutions.includes(dir);
    });
    const finish = () => {
        if (leftover.length) writeRecord(file, { files: leftover, blocks: 0, lastSignature: null });
        else clearRecord(file);
    };
    const results = checkProjects(checked, new Set(record.files), base);
    const ownLines = results.flatMap((r) => r.own);

    if (ownLines.length === 0) {
        finish();
        const notice = [otherNotice(results), solutionNote].filter(Boolean).join("; ");
        if (notice) process.stdout.write(JSON.stringify({ systemMessage: notice }) + "\n");
        return 0;
    }

    const signature = sha1([...ownLines].sort().join("\n"));
    if (record.blocks >= MAX_BLOCKS || (payload.stop_hook_active && signature === record.lastSignature)) {
        finish(); // let Claude stop; the log keeps the details
        return 0;
    }
    record.blocks += 1;
    record.lastSignature = signature;
    writeRecord(file, record);
    process.stderr.write(formatBlock(results, projects.length - solutions.length - checked.length)
        + (solutionNote ? solutionNote + "\n" : ""));
    return 2;
}

// Manual run without a payload: today's behavior on <cwd>/tsconfig.json.
function onManual(cwd) {
    if (!fs.existsSync(path.join(cwd, "tsconfig.json"))) return 0;
    const { ok, output } = runTsc(cwd);
    if (ok || !output.trim()) return 0;
    const lines = output.split("\n").filter((l) => l.trim());
    const errors = lines.filter((l) => ERROR_RE.test(l));
    const shown = (errors.length ? errors : lines).slice(0, MAX_SHOWN);
    const log = writeLog(".", cwd, output);
    process.stderr.write(`TypeScript errors (${errors.length} errors, showing first ${shown.length}):\n${shown.join("\n")}\nFull log: ${log}\n`);
    return 2;
}

async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString().trim();
    let payload = null;
    if (raw) {
        try {
            payload = JSON.parse(raw);
        } catch {
            payload = {};
        }
    }
    const cwd = process.cwd();
    let code = 0;
    try {
        if (payload === null) code = onManual(cwd);
        else if (payload.hook_event_name === "Stop") code = onStop(payload, cwd);
        else if (payload.hook_event_name === "PostToolUse" || payload.tool_input) code = onPostToolUse(payload, cwd);
    } catch {
        code = 0; // never break the session because of the type check
    }
    process.exitCode = code;
}

main();
