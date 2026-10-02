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

- **`env-protect.js`** (PreToolUse on `Read | Grep | Glob | Edit | MultiEdit | Write | Bash`): blocks tool calls that read the contents of dotenv files (`.env`, `.env.local`, `.env.production.local`, case variants, the Grep tool's `glob`). Template files such as `.env.example`, `.env.sample` or `.env.template` are allowed with every tool. Bash commands are tokenized (quotes, heredocs, substitutions) and only commands that **read** a dotenv file are blocked; commands that merely mention the name (grep patterns, `echo`, commit messages, heredoc prose, `git add .env.example`) pass. Bash writes to dotenv files are not blocked. `.dev.vars` is blocked for Read, Grep, Edit and MultiEdit only (deliberately not Bash or Write: local tooling reads it). This hook intentionally reads tool inputs (file paths and Bash command strings) but does **not** read the dotenv files themselves.

  **Known limits** — accident prevention, not a sandbox. Not caught: indirection through variables, loops and pipelines (`F=.env; cat $F`, `echo .env | xargs cat`); scripts that read the file themselves (`python3 script.py`); recursive searches that never name the file (`grep -r KEY .`, the Grep tool over a directory); tools that print resolved config (`docker compose config`); uploads such as `curl -d @.env`; files outside the pattern (`.envrc`, `prod.env`). Pair it with the native permission rule `"deny": ["Read(./.env*)"]` in `settings.json` for a second layer.
- **`tsc-check.js`** (PostToolUse on `Write | Edit | MultiEdit`, and Stop): on edits it only records the edited TypeScript/JavaScript paths in a per-session file in the OS temp dir. At the end of the turn (Stop) it runs `tsc -p <nearest tsconfig.json> --noEmit` (walking up from each edited file, never past the git root) using the nearest `node_modules/.bin/tsc` or `npx --no-install tsc`, and writes the full output to a log in `/tmp`. For a tsconfig that declares `references` it first runs `tsc --showConfig` (same binary) to detect solution-style configs. No network calls are made.
- **`session-prime.js`** (SessionStart): reads git state, the plans directory declaration (`## HOPLA` in `AGENTS.md` / `CLAUDE.md`), `.agents/hopla-active-plan.json` and `.claude/compact-snapshot.json` to inject a short context (≤ 1,500 chars). It reads the SessionStart payload from stdin only to learn the `source` (the snapshot is replayed after `/compact` or on resume). Read-only.
- **`deprecation-notice.js`** (UserPromptSubmit + PreToolUse on `Skill|Agent|Task`): reads the prompt or the tool input, never blocks and never sets a permission decision. When a deprecated HOPLA item is used it prints one notice and records it in `<tmpdir>/hopla-deprecations-<session_id>.json` (the session id is validated against `^[A-Za-z0-9_-]{1,128}$` before it reaches a path, otherwise no file is written; the file is written with `O_NOFOLLOW` and mode `0600`, so a symlink planted at that path is never followed).
- **`precompact-snapshot.js`** (PreCompact): writes a session snapshot to `<project>/.claude/compact-snapshot.json`. Writes only inside the active project directory.
- **`statusline.js`** (opt-in): renders branch + active plan (and step) in the status bar. Read-only.

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
