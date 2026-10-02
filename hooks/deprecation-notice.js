#!/usr/bin/env node
// Deprecation notifier (3.0): UserPromptSubmit + PreToolUse (Skill|Agent|Task).
// When a deprecated HOPLA skill or agent is used, show ONE line naming its
// replacement — once per session per item — to the user (systemMessage) and to
// Claude (additionalContext). It never blocks and never sets a permission
// decision, so the deprecated item still runs. Everything else: no output.
// Removal of these items is planned for 4.0.0; then this hook can go.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const WORKFLOWS = 'native Workflows (say "use a workflow")';
const DEPRECATED_SKILLS = {
    "parallel-dispatch": WORKFLOWS,
    "subagent-execution": WORKFLOWS,
    "refactoring": "the native /simplify",
    "code-review-fix": "the native /code-review --fix",
};
const DEPRECATED_AGENTS = {
    "code-reviewer": "the code-review skill",
    "system-reviewer": "/hopla:system-review",
};

const SESSION_ID = /^[A-Za-z0-9_-]{1,128}$/;

function readPayload() {
    if (process.stdin.isTTY) return null;
    try {
        const payload = JSON.parse(fs.readFileSync(0, "utf8"));
        return payload && typeof payload === "object" ? payload : null;
    } catch {
        return null;
    }
}

// Returns { item, replacement } for a deprecated use, else null.
function detect(payload) {
    const event = payload.hook_event_name;
    if (event === "UserPromptSubmit" && typeof payload.prompt === "string") {
        const m = payload.prompt.match(/^\s*\/hopla:([a-z0-9-]+)(?=\s|$)/);
        if (m && DEPRECATED_SKILLS[m[1]]) return { item: m[1], replacement: DEPRECATED_SKILLS[m[1]] };
        return null;
    }
    if (event === "PreToolUse") {
        const input = payload.tool_input || {};
        if (payload.tool_name === "Skill" && typeof input.skill === "string") {
            const m = input.skill.match(/^hopla:([a-z0-9-]+)$/);
            if (m && DEPRECATED_SKILLS[m[1]]) return { item: m[1], replacement: DEPRECATED_SKILLS[m[1]] };
        }
        if ((payload.tool_name === "Agent" || payload.tool_name === "Task") && typeof input.subagent_type === "string") {
            const m = input.subagent_type.match(/^hopla:([a-z0-9-]+)$/);
            if (m && DEPRECATED_AGENTS[m[1]]) return { item: `${m[1]} agent`, replacement: DEPRECATED_AGENTS[m[1]] };
        }
    }
    return null;
}

// Per-session marker in the temp dir. Without a safe session_id there is no
// marker and the notice is shown every time; marker errors never hide a notice.
function alreadyShown(sessionId, item) {
    if (!SESSION_ID.test(sessionId || "")) return false;
    const file = path.join(os.tmpdir(), `hopla-deprecations-${sessionId}.json`);
    let shown = [];
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
        if (Array.isArray(parsed)) shown = parsed;
    } catch { /* missing or unreadable: nothing shown yet */ }
    if (shown.includes(item)) return true;
    try {
        // O_NOFOLLOW: never write through a symlink planted at this predictable path.
        const { O_WRONLY, O_CREAT, O_TRUNC, O_NOFOLLOW = 0 } = fs.constants;
        fs.writeFileSync(file, JSON.stringify([...shown, item]), { flag: O_WRONLY | O_CREAT | O_TRUNC | O_NOFOLLOW, mode: 0o600 });
    } catch { /* unwritable temp dir or symlink: show the notice anyway */ }
    return false;
}

const payload = readPayload();
const hit = payload && detect(payload);
if (hit && !alreadyShown(payload.session_id, hit.item)) {
    const notice = `HOPLA: ${hit.item} is deprecated since 3.0.0 and will be removed in 4.0.0. Use ${hit.replacement} instead.`;
    process.stdout.write(JSON.stringify({
        systemMessage: notice,
        hookSpecificOutput: { hookEventName: payload.hook_event_name, additionalContext: notice },
    }));
}
process.exit(0);
