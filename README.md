# @hopla/claude-setup

Hopla team agentic coding system for Claude Code. Installs global rules and commands to `~/.claude/`.

## Install

```bash
npx @hopla/claude-setup
```

To overwrite existing files without prompting:

```bash
npx @hopla/claude-setup --force
```

## What gets installed

**`~/.claude/CLAUDE.md`** — Global rules: language, tech preferences, Git Flow, Conventional Commits, autonomy behavior.

**`~/.claude/commands/`** — Reusable commands available in any project:

| Command | Description |
|---|---|
| `/prime` | Load project context at the start of a session |
| `/commit` | Create a Conventional Commit with Git Flow awareness |
| `/create-prd` | Create a Product Requirements Document through guided questions |
| `/plan-feature` | Research codebase and create a structured implementation plan |
| `/execute` | Execute a structured plan from start to finish with validation |
| `/code-review` | Technical code review on recently changed files |
| `/code-review-fix` | Fix issues found in a code review report |
| `/execution-report` | Generate an implementation report for system review |
| `/system-review` | Analyze implementation against plan to find process improvements |

## Update

Re-run the install command to update to the latest version:

```bash
npx @hopla/claude-setup@latest
```
