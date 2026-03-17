# @hopla/claude-setup

Hopla team agentic coding system for Claude Code. Installs global rules and commands to `~/.claude/`.

## Install

### Full install — for the implementer (Julio)

```bash
npm install -g @hopla/claude-setup
claude-setup
```

Installs all commands: planning + execution + review.

### Planning-only install — for the planner/non-technical role (Robert)

```bash
npm install -g @hopla/claude-setup
claude-setup --planning
```

Installs only planning commands: `init-project`, `prime`, `create-prd`, `plan-feature`, `review-plan`, `git-commit`, `git-pr`. No execution or review commands. No bash permission prompts during planning.

To overwrite existing files without prompting:

```bash
claude-setup --force
claude-setup --planning --force
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

## The Agentic Coding Framework

This system is built on two core concepts from the Agentic Coding Course:

### AI Layer — What guides the agent

| Pillar | What it is | Where it lives |
|--------|-----------|----------------|
| **Global Rules** | Always-loaded context: language, git flow, tech defaults, autonomy rules | `~/.claude/CLAUDE.md` |
| **On-Demand Context** | Task-specific guides loaded when needed (e.g. "how to add an API endpoint") | `.agents/guides/*.md` |
| **Commands** | Reusable processes that tell the agent *how* to work | `~/.claude/commands/hopla-*.md` |
| **Skills** | Auto-activate by semantic matching — no slash command needed | `~/.claude/skills/hopla-*/SKILL.md` |
| **Hooks** | Run automatically before/after tool use for type checking and protection | `~/.claude/hooks/*.js` |

The key insight: **commands inject on-demand context deterministically** — when you run `/hopla-plan-feature`, it automatically reads the relevant guide from `.agents/guides/` before planning.

### PIV Loop — How you work

```
Plan → Implement → Validate → (repeat)
```

- **Plan** (`/hopla-plan-feature`) — Research the codebase, design the approach, create a structured plan
- **Implement** (`/hopla-execute`) — Delegate coding to the AI, trust but verify at each task
- **Validate** — AI runs lint → types → tests → integration; human reviews the result

### System Evolution

After each PIV loop, run `/hopla-execution-report` + `/hopla-system-review` to find process improvements. Don't just fix bugs — fix the system that allowed them.

---

## What Gets Installed

**`~/.claude/CLAUDE.md`** — Global rules applied to every Claude Code session.

**`~/.claude/commands/`** — Reusable commands available in any project:

| Command | Description |
|---|---|
| `/hopla-init-project` | Read PRD, recommend stack, create CLAUDE.md and .agents/ structure |
| `/hopla-prime` | Load project context at the start of a session |
| `/hopla-create-prd` | Create a Product Requirements Document through guided questions |
| `/hopla-plan-feature` | Research codebase and create a structured implementation plan |
| `/hopla-review-plan` | Review a plan before execution — get a concise summary and approve |
| `/hopla-execute` | Execute a structured plan from start to finish with validation |
| `/hopla-git-commit` | Create a Conventional Commit with Git Flow awareness |
| `/hopla-git-pr` | Create a GitHub Pull Request with a structured description |
| `/hopla-code-review` | Technical code review on recently changed files |
| `/hopla-code-review-fix` | Fix issues found in a code review report |
| `/hopla-execution-report` | Generate an implementation report for system review |
| `/hopla-system-review` | Analyze implementation against plan to find process improvements |

**`~/.claude/skills/`** — Auto-activate by semantic matching, no slash command needed:

| Skill | Auto-activates when you say... |
|---|---|
| `hopla-git` | "commit this", "create a PR", "guarda los cambios" |
| `hopla-prime` | "orient yourself", "ponte al día", "what is this project" |
| `hopla-code-review` | "review the code", "code review", "analiza los cambios" |
| `hopla-execution-report` | "generate the report", "genera el reporte", "document what was done" |

**`~/.claude/hooks/`** — Run automatically before/after tool use (configured in `~/.claude/settings.json`):

| Hook | Type | What it does |
|---|---|---|
| `tsc-check.js` | PostToolUse | Runs `tsc --noEmit` after file edits; feeds errors back to Claude |
| `env-protect.js` | PreToolUse | Blocks reads/greps targeting `.env` files |
| `session-prime.js` | SessionStart (opt-in) | Loads git context + CLAUDE.md summary at session start |

**Installed layout:**

```
~/.claude/
├── CLAUDE.md              ← Global rules
├── commands/
│   └── hopla-*.md         ← Slash commands (/hopla-prime, /hopla-execute, etc.)
├── skills/
│   ├── hopla-git/         ← Auto-activates for commit/PR requests
│   ├── hopla-prime/       ← Auto-activates for orientation requests
│   ├── hopla-code-review/ ← Auto-activates for review requests
│   └── hopla-execution-report/ ← Auto-activates for report requests
├── hooks/
│   ├── tsc-check.js       ← TypeScript type checking after edits
│   ├── env-protect.js     ← .env file protection
│   └── session-prime.js   ← Session context loader (opt-in)
└── settings.json          ← Permissions + hooks config (auto-updated)
```

---

## Recommended Workflow

### Starting a new project
```
/hopla-create-prd     → define what you're building (PRD.md)
/hopla-init-project   → reads PRD, recommends stack, creates CLAUDE.md + .agents/
/hopla-git-commit     → saves Layer 1 foundation to git
```

### Feature development (PIV loop)
```
/hopla-prime            → load context at session start
/hopla-plan-feature     → research codebase and create plan
/hopla-review-plan      → review plan summary and approve
/hopla-execute          → implement the plan with validation
/hopla-code-review      → standalone review of changes
/hopla-code-review-fix  → fix issues found
/hopla-execution-report → document what was built
/hopla-git-commit       → save to git
/hopla-git-pr           → open pull request on GitHub
```

### After implementation
```
/hopla-system-review    → analyze plan vs. actual for process improvements
```

> **Tip:** `hopla-prime`, `hopla-git-commit`, `hopla-git-pr`, `hopla-code-review`, and `hopla-execution-report` also exist as skills — they auto-activate when you describe what you want in natural language, without typing the slash command.

---

## Command Chaining

Commands are modular — the output of one becomes the input of the next. Some commands accept arguments (`$1`, `$2`) to receive files generated by previous commands.

### Commands that accept arguments

| Command | Argument | Example |
|---|---|---|
| `/hopla-execute` | Path to plan file | `/hopla-execute .agents/plans/auth-feature.md` |
| `/hopla-code-review-fix` | Path to review report or description | `/hopla-code-review-fix .agents/code-reviews/auth-review.md` |
| `/hopla-system-review` | Plan file + execution report | `/hopla-system-review .agents/plans/auth-feature.md .agents/execution-reports/auth-feature.md` |

### Full PIV loop example

```
# 1. Plan
/hopla-plan-feature add user authentication
→ saves: .agents/plans/add-user-authentication.md

# 2. Review plan
/hopla-review-plan .agents/plans/add-user-authentication.md

# 3. Execute
/hopla-execute .agents/plans/add-user-authentication.md
→ implements the plan, runs validation

# 4. Code review
/hopla-code-review
→ saves: .agents/code-reviews/add-user-authentication.md

# 5. Fix issues
/hopla-code-review-fix .agents/code-reviews/add-user-authentication.md

# 6. Document
/hopla-execution-report
→ saves: .agents/execution-reports/add-user-authentication.md

# 7. Commit
/hopla-git-commit

# 8. Pull request
/hopla-git-pr

# 9. Process improvement (after PR merge)
/hopla-system-review .agents/plans/add-user-authentication.md .agents/execution-reports/add-user-authentication.md
```

---

## Roadmap

Features under consideration for future versions:

- **Custom subagents** (`.claude/agents/`) — Define specialized agents with their own instructions and skills for large projects with isolated domains (e.g. frontend agent, backend agent)
- **Hook templates** — Installable hook patterns beyond tsc-check and env-protect (e.g. query deduplication, notification hooks)
- **GitHub Actions integration** — Automated PR reviews and `@claude` mentions via GitHub App

---

## Project Structure (after /hopla-create-prd + /hopla-init-project)

```
project/
├── PRD.md                         ← Product scope (from /hopla-create-prd)
├── CLAUDE.md                      ← Project rules and stack (from /hopla-init-project)
├── .agents/
│   ├── plans/                     ← Implementation plans (commit these)
│   ├── guides/                    ← On-demand reference guides (commit these)
│   ├── execution-reports/         ← Post-implementation reports (don't commit)
│   ├── code-reviews/              ← Code review reports (don't commit)
│   └── system-reviews/            ← Process improvement reports (don't commit)
└── .claude/
    └── commands/                  ← Project-specific commands (optional)
```
