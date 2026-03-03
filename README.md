# @hopla/claude-setup

Hopla team agentic coding system for Claude Code. Installs global rules and commands to `~/.claude/`.

## Install

```bash
npm install -g @hopla/claude-setup
claude-setup
```

To overwrite existing files without prompting:

```bash
claude-setup --force
```

## Update

```bash
npm install -g @hopla/claude-setup@latest --prefer-online && claude-setup --force
```

## Uninstall

```bash
claude-setup --uninstall
```

---

## How It Works — Layer 1 Planning

The system is built on two levels of context:

```
~/.claude/CLAUDE.md        ← Global rules (installed by claude-setup)
    └── applies to ALL projects

CLAUDE.md (project root)   ← Project-specific rules (created with /hopla-init-project)
    └── applies to THIS project only
```

**Global rules** cover: language preferences, tech defaults (React, TypeScript, Vite), Git Flow, Conventional Commits, and autonomy behavior.

**Project rules** cover: specific stack versions, architecture patterns, naming conventions, logging, testing, dev commands, and task-specific reference guides.

---

## What Gets Installed

**`~/.claude/CLAUDE.md`** — Global rules applied to every Claude Code session.

**`~/.claude/commands/`** — Reusable commands available in any project:

| Command | Description |
|---|---|
| `/hopla-init-project` | Initialize project CLAUDE.md and .agents/ structure |
| `/hopla-prime` | Load project context at the start of a session |
| `/hopla-create-prd` | Create a Product Requirements Document through guided questions |
| `/hopla-plan-feature` | Research codebase and create a structured implementation plan |
| `/hopla-execute` | Execute a structured plan from start to finish with validation |
| `/hopla-commit` | Create a Conventional Commit with Git Flow awareness |
| `/hopla-code-review` | Technical code review on recently changed files |
| `/hopla-code-review-fix` | Fix issues found in a code review report |
| `/hopla-execution-report` | Generate an implementation report for system review |
| `/hopla-system-review` | Analyze implementation against plan to find process improvements |

---

## Recommended Workflow

### Starting a new project
```
/hopla-init-project   → creates CLAUDE.md + .agents/ structure
/hopla-create-prd     → defines product scope (PRD.md)
/hopla-commit         → saves Layer 1 foundation to git
```

### Feature development (PIV loop)
```
/hopla-prime          → load context at session start
/hopla-plan-feature   → research codebase and create plan
/hopla-execute        → implement the plan with validation
/hopla-code-review    → technical review of changes
/hopla-code-review-fix → fix issues found
/hopla-commit         → save to git
```

### After implementation
```
/hopla-execution-report  → document what was built
/hopla-system-review     → analyze plan vs. actual for process improvements
```

---

## Project Structure (after /hopla-init-project)

```
project/
├── CLAUDE.md                      ← Project-specific rules
├── PRD.md                         ← Product scope (from /hopla-create-prd)
├── .agents/
│   ├── plans/                     ← Implementation plans (commit these)
│   ├── guides/                    ← On-demand reference guides (commit these)
│   ├── execution-reports/         ← Post-implementation reports (don't commit)
│   ├── code-reviews/              ← Code review reports (don't commit)
│   └── system-reviews/            ← Process improvement reports (don't commit)
└── .claude/
    └── commands/                  ← Project-specific commands (optional)
```
