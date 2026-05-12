#!/usr/bin/env node
// UserPromptSubmit hook: scan the user's prompt for skill keywords and inject
// a short routing hint. Reads skill catalog from disk at runtime — no
// hardcoded skill list — so adding/removing/renaming a skill needs no edit here.
//
// Matching strategy (hybrid):
//   1. If a SKILL.md declares `triggers: [regex, ...]` in its frontmatter,
//      use those patterns literally.
//   2. Otherwise auto-derive patterns from the skill name (word-boundary,
//      case-insensitive) and the first significant words of the description.
//
// Skill discovery walks `../skills/` recursively so nested skills
// (e.g. skills/guides/<name>/SKILL.md) participate without code changes.

import fs from "fs";
import path from "path";

const SKILLS_DIR = path.join(import.meta.dirname, "..", "skills");
const STOPWORDS = new Set([
    "use", "when", "with", "that", "this", "from", "into", "your", "have",
    "also", "user", "only", "before", "after", "during", "than", "such",
    "more", "less", "most", "least", "some", "many", "much", "still", "just",
    "what", "which", "would", "could", "should", "needs", "need", "make",
    "made", "does", "done", "doing", "wants", "want", "next", "previous",
    "very", "really", "always", "never", "must", "may", "might", "shall",
    "trigger", "triggers", "phrase", "phrases", "skill", "skills", "do",
    "not", "the", "and", "for", "are", "was", "were", "but", "any", "all",
]);

// Walk skills/ recursively. Return [{ name, descriptors, triggers, path }].
// Each entry already exposes either a literal triggers list (from frontmatter)
// or a derived list (from name + description tokens).
function loadSkillCatalog(skillsRoot) {
    if (!fs.existsSync(skillsRoot)) return [];
    const catalog = [];

    function walk(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const candidate = path.join(fullPath, "SKILL.md");
                if (fs.existsSync(candidate)) {
                    const parsed = parseSkillFrontmatter(candidate);
                    if (parsed) catalog.push(parsed);
                }
                // Continue walking — skills may be nested under sub-directories.
                walk(fullPath);
            }
        }
    }

    walk(skillsRoot);
    return catalog;
}

// Extract `name`, `description`, optional `triggers` from a SKILL.md frontmatter.
// Tolerant parser — handles double/single-quoted scalars and YAML-style array
// `triggers: [...]` on a single line or with each item on its own line.
function parseSkillFrontmatter(filePath) {
    let content;
    try {
        content = fs.readFileSync(filePath, "utf8");
    } catch {
        return null;
    }
    if (!content.startsWith("---")) return null;
    const end = content.indexOf("\n---", 3);
    if (end === -1) return null;
    const block = content.slice(3, end);

    const data = {};
    const lines = block.split("\n");
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
        if (!m) { i++; continue; }
        const key = m[1];
        let rest = m[2];

        if (key === "triggers") {
            // Inline form: triggers: [a, b]   or block form across lines.
            const triggers = parseYamlArray(rest, lines, i);
            data.triggers = triggers.values;
            i = triggers.nextIndex;
            continue;
        }

        // Strip surrounding quotes if any.
        if ((rest.startsWith('"') && rest.endsWith('"')) ||
            (rest.startsWith("'") && rest.endsWith("'"))) {
            rest = rest.slice(1, -1);
        }
        data[key] = rest;
        i++;
    }

    if (!data.name) {
        // Fall back to the parent directory name when frontmatter omits it.
        data.name = path.basename(path.dirname(filePath));
    }

    return {
        name: data.name,
        description: data.description || "",
        triggers: Array.isArray(data.triggers) ? data.triggers : null,
        path: filePath,
    };
}

// Parses either `[a, b, c]` on the same line as `triggers:`, or a block form:
//   triggers:
//     - "regex one"
//     - "regex two"
// Returns { values, nextIndex } so the caller knows where to resume scanning.
function parseYamlArray(inlineRest, lines, currentIndex) {
    const inline = inlineRest.trim();
    if (inline.startsWith("[") && inline.endsWith("]")) {
        const body = inline.slice(1, -1).trim();
        if (!body) return { values: [], nextIndex: currentIndex + 1 };
        const values = splitYamlInlineList(body);
        return { values, nextIndex: currentIndex + 1 };
    }
    // Block form
    const values = [];
    let j = currentIndex + 1;
    while (j < lines.length) {
        const ln = lines[j];
        const m = ln.match(/^\s*-\s*(.*)$/);
        if (!m) break;
        let item = m[1].trim();
        if ((item.startsWith('"') && item.endsWith('"')) ||
            (item.startsWith("'") && item.endsWith("'"))) {
            item = item.slice(1, -1);
        }
        values.push(item);
        j++;
    }
    return { values, nextIndex: j };
}

// Splits `"a, b", c, "d"` respecting double-quoted strings so commas inside
// quotes don't break the split.
function splitYamlInlineList(body) {
    const out = [];
    let current = "";
    let inQuote = null;
    for (let k = 0; k < body.length; k++) {
        const ch = body[k];
        if (inQuote) {
            if (ch === inQuote) {
                inQuote = null;
                continue;
            }
            current += ch;
            continue;
        }
        if (ch === '"' || ch === "'") {
            inQuote = ch;
            continue;
        }
        if (ch === ",") {
            const item = current.trim();
            if (item) out.push(item);
            current = "";
            continue;
        }
        current += ch;
    }
    const tail = current.trim();
    if (tail) out.push(tail);
    return out;
}

// Build the regex list a skill matches against. When the SKILL.md provides
// `triggers:`, use those literal patterns. Otherwise auto-derive from:
//   1. The skill name (case-insensitive, word boundary).
//   2. Every single-quoted phrase in the description — descriptions in this
//      project document trigger phrases as `'commit', 'pull request', ...`,
//      so this captures idiomatic user wording the skill name alone misses.
//   3. The first 3 significant tokens of the description (length ≥ 4, not
//      a stopword) — a fallback when no quoted phrases exist.
function buildPatterns(skill) {
    if (skill.triggers && skill.triggers.length > 0) {
        return skill.triggers.map(toRegex).filter(Boolean);
    }
    const patterns = [];
    const description = skill.description || "";

    if (skill.name) {
        const escaped = skill.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        patterns.push(new RegExp(`\\b${escaped}\\b`, "i"));
    }

    // Extract single-quoted phrases like 'commit', 'pull request'. Limited to
    // 12 to bound the per-prompt regex work.
    const quoted = [...description.matchAll(/'([^']{2,60})'/g)].map((m) => m[1]);
    const seenPhrase = new Set();
    for (const phrase of quoted) {
        const norm = phrase.toLowerCase().trim();
        if (!norm || seenPhrase.has(norm)) continue;
        seenPhrase.add(norm);
        const escaped = norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        patterns.push(new RegExp(`\\b${escaped}\\b`, "i"));
        if (seenPhrase.size >= 12) break;
    }

    if (seenPhrase.size === 0) {
        // Fallback: significant tokens.
        const tokens = description
            .toLowerCase()
            .split(/[^a-z0-9-]+/)
            .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
        const seenTok = new Set();
        for (const tok of tokens) {
            if (seenTok.has(tok)) continue;
            seenTok.add(tok);
            const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            patterns.push(new RegExp(`\\b${escaped}\\b`, "i"));
            if (seenTok.size >= 3) break;
        }
    }
    return patterns;
}

function toRegex(source) {
    if (!source || typeof source !== "string") return null;
    try {
        return new RegExp(source, "i");
    } catch {
        return null;
    }
}

async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);

    let input;
    try {
        input = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
        // Malformed payload — skip silently so we never block legitimate prompts
        process.exit(0);
    }

    // Cap prompt length so regex matching stays cheap on large paste-ins
    const prompt = (input.prompt || "").slice(0, 4000);
    if (!prompt) process.exit(0);

    const catalog = loadSkillCatalog(SKILLS_DIR);
    if (catalog.length === 0) process.exit(0);

    const matched = [];
    for (const skill of catalog) {
        const patterns = buildPatterns(skill);
        if (patterns.length === 0) continue;
        if (patterns.some((p) => p.test(prompt))) matched.push(skill.name);
    }

    if (matched.length === 0) process.exit(0);

    const list = matched.map((s) => `\`${s}\``).join(", ");
    const plural = matched.length > 1;
    process.stdout.write(
        `📦 HOPLA routing hint: this prompt matches skill${plural ? "s" : ""} ${list}. ` +
        `Use ${plural ? "them" : "it"} if applicable to the current task.`
    );
    process.exit(0);
}

main();
