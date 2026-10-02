// Shared plans helpers for the HOPLA hooks (session-prime, precompact-snapshot,
// statusline). ESM, Node built-ins only, no side effects at import.
//
// cli.js keeps an identical copy of these functions (single-file rule):
// keep both in sync — guarded by tests/plans-parity.test.js.
//
// Plans dir: declared in the project's AGENTS.md (fallback CLAUDE.md) as
//   ## HOPLA
//   - Plans: docs/plans/
// Default: .agents/plans. Unsafe values (absolute, `..`, `~`, `$`, drive
// letters) are rejected with a warning. Symlink escapes are NOT handled.
//
// Active plan: the pointer file .agents/hopla-active-plan.json (written by
// /hopla:plan-feature and /hopla:execute) when valid, else the newest
// non-draft *.md in the plans dir by mtime.

import fs from "node:fs";
import path from "node:path";

const DEFAULT_PLANS_DIR = ".agents/plans";
const POINTER_FILE = path.join(".agents", "hopla-active-plan.json");

// Normalizes a repo-relative path to POSIX form. Returns null when the value
// is empty or unsafe (absolute, drive letter, ~, $, escapes the project).
function normalizeRelPath(raw) {
    let v = String(raw).replace(/\\/g, "/").trim();
    if (!v) return null;
    if (v.startsWith("/") || /^[A-Za-z]:/.test(v) || v.startsWith("~") || v.startsWith("$")) return null;
    v = path.posix.normalize(v);
    while (v.length > 1 && v.endsWith("/")) v = v.slice(0, -1);
    if (!v || v === "." || v === ".." || v.startsWith("../")) return null;
    return v;
}

// The pointer's step reaches Claude's context: keep it to one short line of
// printable text (no newlines or control characters, at most 80 chars).
const MAX_STEP = 80;
function cleanStep(raw) {
    if (typeof raw !== "string") return null;
    const line = raw.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
    if (!line) return null;
    return line.length > MAX_STEP ? line.slice(0, MAX_STEP - 1).trimEnd() + "…" : line;
}

// True when `abs` is strictly inside `cwd`.
function isInside(cwd, abs) {
    const rel = path.relative(cwd, abs);
    return !!rel && rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel);
}

export function parsePlansDeclaration(markdown) {
    const lines = String(markdown ?? "").split(/\r?\n/);
    let inFence = false;
    let inSection = false;
    for (const line of lines) {
        if (/^\s*(```|~~~)/.test(line)) {
            inFence = !inFence;
            continue;
        }
        if (inFence) continue;
        if (/^#{1,2}\s/.test(line)) {
            inSection = /^##\s+HOPLA\s*#*\s*$/i.test(line);
            continue;
        }
        if (!inSection) continue;
        const m = line.match(/^\s*[-*+]\s+Plans\s*:\s*(.+?)\s*$/i);
        if (!m) continue;
        const rawValue = m[1];
        let value;
        if (rawValue.startsWith("`")) {
            const end = rawValue.indexOf("`", 1);
            value = end === -1 ? rawValue.slice(1) : rawValue.slice(1, end);
        } else {
            value = rawValue.replace(/^["'<]+/, "").split(/\s+/)[0].replace(/["'>]+$/, "");
        }
        const dir = normalizeRelPath(value);
        if (!dir) return { dir: null, warning: `unsafe plans dir: ${rawValue}` };
        return { dir };
    }
    return { dir: null };
}

export function resolvePlansDir(cwd = process.cwd()) {
    let warning = null;
    for (const source of ["AGENTS.md", "CLAUDE.md"]) {
        let text;
        try {
            text = fs.readFileSync(path.join(cwd, source), "utf8");
        } catch {
            continue;
        }
        const parsed = parsePlansDeclaration(text);
        if (parsed.warning && !warning) warning = parsed.warning;
        if (!parsed.dir) continue;
        const abs = path.resolve(cwd, parsed.dir);
        if (!isInside(cwd, abs)) {
            if (!warning) warning = `unsafe plans dir: ${parsed.dir}`;
            continue;
        }
        return { dir: parsed.dir, abs, source, warning };
    }
    return { dir: DEFAULT_PLANS_DIR, abs: path.resolve(cwd, DEFAULT_PLANS_DIR), source: "default", warning };
}

export function findActivePlan(plansAbs) {
    try {
        const candidates = fs.readdirSync(plansAbs, { withFileTypes: true })
            .filter((e) => e.isFile()
                && e.name.endsWith(".md")
                && !e.name.endsWith(".draft.md")
                && !e.name.startsWith("."))
            .map((e) => ({ name: e.name, mtime: fs.statSync(path.join(plansAbs, e.name)).mtimeMs }));
        candidates.sort((a, b) => (b.mtime - a.mtime) || (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
        return candidates.length ? candidates[0].name : null;
    } catch {
        return null;
    }
}

export function readActivePlanPointer(cwd = process.cwd()) {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(path.join(cwd, POINTER_FILE), "utf8"));
    } catch {
        return null;
    }
    if (!data || typeof data !== "object" || typeof data.plan !== "string") return null;
    if (data.status === "done") return null;
    const rel = normalizeRelPath(data.plan);
    if (!rel || rel.split("/").includes("done")) return null;
    const abs = path.resolve(cwd, rel);
    if (!isInside(cwd, abs)) return null;
    try {
        if (!fs.statSync(abs).isFile()) return null;
    } catch {
        return null;
    }
    const step = cleanStep(data.step);
    const status = typeof data.status === "string" ? data.status : null;
    return { path: rel, step, status };
}

export function getActivePlan(cwd = process.cwd()) {
    const pointer = readActivePlanPointer(cwd);
    if (pointer) return { path: pointer.path, step: pointer.step, source: "pointer" };
    const resolved = resolvePlansDir(cwd);
    const name = findActivePlan(resolved.abs);
    if (!name) return null;
    return { path: path.posix.join(resolved.dir, name), step: null, source: "mtime" };
}
