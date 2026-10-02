// Guard test for the 3.0 deprecations: each deprecated skill/agent opens with a
// banner naming its replacement and has an entry in the notifier, and no other
// HOPLA file keeps recommending it. Removal is planned for 4.0.0.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bodyOf } from "./helpers/fixtures.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const DEPRECATED = {
    "skills/parallel-dispatch/SKILL.md": /Workflows/,
    "skills/subagent-execution/SKILL.md": /Workflows/,
    "skills/refactoring/SKILL.md": /\/simplify/,
    "skills/code-review-fix/SKILL.md": /\/hopla:code-review --fix/,
    "agents/code-reviewer.md": /code-review/,
    "agents/system-reviewer.md": /\/hopla:system-review/,
};

test("deprecations: each deprecated item opens with a banner naming its replacement", () => {
    for (const [file, replacement] of Object.entries(DEPRECATED)) {
        const first = bodyOf(path.join(ROOT, file)).trim().split("\n")[0];
        assert.match(first, /^> ⚠️ \*\*Deprecated in 3\.0\.0, removed in 4\.0\.0\.\*\*/, file);
        assert.match(first, replacement, `${file}: ${first}`);
    }
});

test("deprecations: the notifier knows every deprecated item", () => {
    const hook = fs.readFileSync(path.join(ROOT, "hooks", "deprecation-notice.js"), "utf8");
    for (const file of Object.keys(DEPRECATED)) {
        const name = file.startsWith("agents/") ? path.basename(file, ".md") : path.basename(path.dirname(file));
        assert.ok(hook.includes(`"${name}"`), `deprecation-notice.js misses ${name}`);
    }
});

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(md|js)$/.test(e.name)) out.push(p);
    }
    return out;
}

test("deprecations: no plugin file recommends /hopla:code-review-fix or the hopla:code-reviewer agent", () => {
    const own = new Set(Object.keys(DEPRECATED).map((f) => path.join(ROOT, f)));
    own.add(path.join(ROOT, "hooks", "deprecation-notice.js"));
    const files = [...walk(path.join(ROOT, "skills")), ...walk(path.join(ROOT, "agents")), ...walk(path.join(ROOT, "hooks")),
        path.join(ROOT, "cli.js")].filter((f) => !own.has(f));
    const hits = [];
    for (const f of files) {
        fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
            if (/\/hopla:code-review-fix|hopla:code-reviewer\b/.test(line)) hits.push(`${path.relative(ROOT, f)}:${i + 1}`);
        });
    }
    assert.deepEqual(hits, []);
});

test("deprecations: code-review-fix is redirected to the HOPLA wrapper, not the bare native fix", () => {
    const files = [...walk(path.join(ROOT, "skills")), ...walk(path.join(ROOT, "hooks")), path.join(ROOT, "cli.js")];
    const hits = [];
    for (const f of files) {
        fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
            if (/native `?\/code-review --fix/.test(line)) hits.push(`${path.relative(ROOT, f)}:${i + 1}`);
        });
    }
    assert.deepEqual(hits, []);
});
