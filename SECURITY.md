# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | ✅ Yes — receives security patches |
| 1.x.x   | ❌ No — please upgrade to 2.x |
| < 1.0   | ❌ No |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

### Preferred: GitHub Security Advisory

Use the private advisory flow at <https://github.com/HOPLAtools/claude-setup/security/advisories/new>.

### Alternative: email

Email `julio@hopla.tools` with:

- A description of the vulnerability and its impact.
- Steps to reproduce (if applicable).
- Affected versions.
- Suggested mitigations (optional).

You will receive an acknowledgement. There is no formal SLA, but reports are reviewed as soon as possible.

## Threat model

This plugin executes inside the Claude Code session and has access to several sensitive surfaces. Reviewers and operators should be aware of the following:

### Plugin hooks the plugin installs

- **`env-protect.js`** (PreToolUse on `Read | Grep | Glob | Edit | Write | Bash`): inspects every tool call and blocks reads/greps/Bash commands that reference `.env` files. This hook intentionally reads tool inputs (file paths and Bash command strings) but does **not** read the `.env` files themselves.
- **`tsc-check.js`** (PostToolUse on `Write | Edit | MultiEdit`): runs `tsc --noEmit` in the project's working directory when a TypeScript/JavaScript file is edited. The hook invokes the project-local `node_modules/.bin/tsc` or falls back to `npx --no-install tsc`. No network calls are made.
- **`session-prime.js`** (SessionStart): reads project rules (`AGENTS.md` / `CLAUDE.md`), git state, and the skill catalog from disk to inject context. Read-only.
- **`prompt-route.js`** (UserPromptSubmit): reads the user prompt and the skill catalog to inject routing hints. The prompt is capped at 4 000 characters before matching. Read-only.
- **`precompact-snapshot.js`** (PreCompact): writes a session snapshot to `<project>/.claude/compact-snapshot.json`. Writes only inside the active project directory.
- **`statusline.js`** (opt-in): renders branch + plan info in the status bar. Read-only.

### What to verify before enabling the plugin

- The plugin source repository is `https://github.com/HOPLAtools/claude-setup` (public). Verify the marketplace URL you add matches.
- Review `hooks/hooks.json` and the corresponding `.js` files before enabling the plugin in environments where tool calls handle sensitive material.
- The CLI (`hopla-claude-setup`) modifies `~/.claude/CLAUDE.md` (global rules template) and `~/.claude/settings.json` (`permissions.allow`, and optionally `statusLine`). Run `node cli.js --dry-run --force` first to preview every change.

### Out of scope

- Vulnerabilities in Claude Code itself — report those to Anthropic.
- Vulnerabilities in Node.js, `npm`, or the user's shell.
- Misconfigurations of `~/.claude/settings.json` made by the user manually.

## Disclosure timeline

After a report is received:

1. Acknowledgement within a few business days.
2. Confirmation of the vulnerability (or rejection with rationale).
3. A fix in a private branch, tested, and merged.
4. Public disclosure via a GitHub Security Advisory, ideally coordinated with the reporter.
