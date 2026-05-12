---
description: Reference for creating Claude Code hooks — event names, matchers, payload shapes, exit code contracts, and stdout conventions.
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
- **tsc-check.js** (PostToolUse): Runs TypeScript type checking after file edits
- **env-protect.js** (PreToolUse): Blocks reads of .env files
- **session-prime.js** (SessionStart): Provides project context at session start
