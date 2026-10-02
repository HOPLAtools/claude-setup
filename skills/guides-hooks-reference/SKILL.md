---
name: guides:hooks-reference
description: Reference for creating Claude Code hooks — event names, matchers, payload shapes, exit code contracts, and stdout conventions.
disable-model-invocation: true
---

# Hooks Reference Guide

## When to Use This Guide
Reference this guide when creating custom hooks or troubleshooting existing ones.

## Hook Types

| Hook | When It Fires | Can Block? | Use For |
|------|---------------|------------|---------|
| PreToolUse | Before any tool call | Yes (exit 2) | Blocking dangerous operations |
| PostToolUse | After any tool call | No | Feedback, auto-formatting, validation |
| Notification | When Claude needs permission or after 60s inactivity | No | Custom notifications |
| Stop | When Claude finishes responding | No | Post-response automation |
| SubagentStop | When a subagent finishes | No | Subagent result processing |
| PreCompact | Before /compact operation | No | Saving context before compaction |
| UserPromptSubmit | When user submits a prompt | Yes (exit 2) | Input validation, routing |
| SessionStart | When session begins | No | Context loading, setup |
| SessionEnd | When session ends | No | Cleanup, logging |

## Hook Configuration

Hooks are configured in settings.json (global, project, or local):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read|Grep",
        "hooks": [
          {
            "type": "command",
            "command": "/absolute/path/to/hook.js"
          }
        ]
      }
    ]
  }
}
```

## Hook Input (stdin JSON)

```json
{
  "session_id": "...",
  "transcript_path": "...",
  "hook_event_name": "PreToolUse",
  "tool_name": "Read",
  "tool_input": {
    "file_path": "/code/.env"
  }
}
```

## Exit Codes
- `0` — Allow operation to proceed
- `2` — Block operation (PreToolUse only)
- Stderr output → shown to Claude as feedback when blocking

## Security Best Practices
- **ALWAYS use absolute paths** for hook scripts (prevents path hijacking)
- Use `$PWD` placeholders in version control, replace with absolute paths on setup
- Never run hooks from user-writable directories without verification

## Debugging Hooks

Log all hook data to inspect the structure:
```json
"PostToolUse": [{
  "matcher": "*",
  "hooks": [{
    "type": "command",
    "command": "jq . > /tmp/hook-debug.json"
  }]
}]
```

## HOPLA Installed Hooks
- **tsc-check.js** (PostToolUse + Stop): Records edited TS/JS files; at the end of the turn runs `tsc -p` on the nearest `tsconfig.json` once, blocks only for errors in files edited this turn (first 30 + total + `/tmp` log), at most twice per turn
- **env-protect.js** (PreToolUse): Blocks reads of dotenv files (`.env`, `.env.local`, …); `.env.example` stays readable; Bash commands are blocked only when they read the file, not when they mention it; `.dev.vars` blocked for Read/Grep/Edit/MultiEdit
- **session-prime.js** (SessionStart): Injects branch, uncommitted summary, active plan + step and the post-`/compact` snapshot (≤ 1,500 chars)
