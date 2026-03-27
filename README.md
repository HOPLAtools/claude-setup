# @hopla/claude-setup

Hopla team agentic coding system for Claude Code. Installs commands, skills, agents, hooks, and reference guides — available as a **Claude Code plugin** or via **npm CLI**.

## Install

### Option A: Claude Code Plugin (recommended)

First, register the HOPLA marketplace (only needed once):

```
/plugin marketplace add hopla-marketplace https://github.com/HOPLAtools/claude-setup.git
```

Then install the plugin:

```
/plugin install hopla@hopla-marketplace
```

This installs all commands, skills, agents, and hooks automatically. Updates are detected when the plugin version changes — update manually with `/plugin update hopla@hopla-marketplace`.

To also install the global rules template (`~/.claude/CLAUDE.md`), run the CLI:

```bash
npm install -g @hopla/claude-setup
claude-setup --force
```

> **Note:** The global rules (`~/.claude/CLAUDE.md`) can only be installed via the CLI because the plugin system doesn't have access to write machine-level files.

### Option B: npm CLI only

```bash
npm install -g @hopla/claude-setup
claude-setup
```

Installs everything including `~/.claude/CLAUDE.md`. Use this if you don't want the plugin channel or need the `--planning` mode.

### Planning-only install — for the planner/non-technical role (Robert)

```bash
npm install -g @hopla/claude-setup
claude-setup --planning
```

Installs only planning commands: `init-project`, `create-prd`, `plan-feature`, `review-plan`, `guide`, `git-commit`, `git-pr`. Also installs planning skills (`hopla-prime`, `hopla-brainstorm`). No execution or review commands. No bash permission prompts during planning.

To overwrite existing files without prompting:

```bash
claude-setup --force
claude-setup --planning --force
```

## Update

**Plugin channel:** updates automatically when the plugin version changes, or manually:
```
/plugin update hopla@hopla-marketplace
```

**CLI channel (for global rules):**
```bash
npm install -g @hopla/claude-setup@latest --prefer-online && claude-setup --force
```

## Uninstall

**Plugin:**
```
/plugin uninstall hopla@hopla-marketplace
```

**CLI:**
```bash
claude-setup --uninstall
```

---

## How It Works — Layered Context

The system uses three levels of CLAUDE.md, each scoped differently:

```
~/.claude/CLAUDE.md        ← Machine-level (installed by claude-setup)
    └── applies to ALL projects on this machine

CLAUDE.md (project root)   ← Project-level (created with /hopla-init-project)
    └── applies to THIS project only

.claude/CLAUDE.local.md    ← Local overrides (personal, gitignored)
    └── your personal tweaks, not shared with team
```

**Machine-level rules** cover: language preferences, tech defaults, Git Flow, Conventional Commits, autonomy behavior, context management, and available commands/skills reference.

**Project-level rules** cover: specific stack versions, architecture patterns, naming conventions, logging, testing, dev commands, and task-specific reference guides.

**Local overrides** cover: personal preferences that differ from the team (e.g., verbose logging, different editor settings).

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
| **Agents** | Specialized subagents for delegation (code review, research, system analysis) | `~/.claude/agents/*.md` |
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
| `/hopla-create-prd` | Create a Product Requirements Document through guided questions |
| `/hopla-plan-feature` | Research codebase and create a structured implementation plan |
| `/hopla-review-plan` | Review a plan before execution — get a concise summary and approve |
| `/hopla-execute` | Execute a structured plan from start to finish with validation |
| `/hopla-validate` | Run the validation pyramid: lint → types → tests → integration |
| `/hopla-end-to-end` | Full PIV loop in one command: prime → brainstorm → plan → execute → validate → commit |
| `/hopla-git-commit` | Create a Conventional Commit with Git Flow awareness |
| `/hopla-git-pr` | Create a GitHub Pull Request with a structured description |
| `/hopla-code-review-fix` | Fix issues found in a code review report |
| `/hopla-rca` | Root Cause Analysis — investigate a bug systematically and generate an RCA doc |
| `/hopla-guide` | 4D Framework guide for non-technical users (Description, Discernment, Delegation, Diligence) |
| `/hopla-system-review` | Analyze implementation against plan to find process improvements |

> **Note:** `hopla-prime`, `hopla-code-review`, and `hopla-execution-report` are **skills only** (no slash command needed) — they auto-activate when you describe the task in natural language.

**`~/.claude/skills/`** — Auto-activate by semantic matching, no slash command needed:

| Skill | Auto-activates when you say... |
|---|---|
| `hopla-git` | "commit this", "create a PR", "guarda los cambios" |
| `hopla-prime` | "orient yourself", "ponte al día", "what is this project" |
| `hopla-code-review` | "review the code", "code review", "analiza los cambios" |
| `hopla-execution-report` | "generate the report", "genera el reporte", "document what was done" |
| `hopla-verify` | "verify it works", "make sure it's correct", "check before finishing" |
| `hopla-brainstorm` | "let's brainstorm", "explore approaches", "design this before coding" |
| `hopla-debug` | "debug this", "find the bug", "why is this failing" |
| `hopla-tdd` | "write tests first", "TDD", "red-green-refactor" |
| `hopla-subagent-execution` | "use subagents", "execute with agents", plans with 5+ tasks |
| `hopla-parallel-dispatch` | "run in parallel", "parallelize this", independent tasks |
| `hopla-worktree` | "use a worktree", "isolated branch", "parallel feature work" |

**`~/.claude/hooks/`** — Run automatically before/after tool use (configured in `~/.claude/settings.json`):

| Hook | Type | What it does |
|---|---|---|
| `tsc-check.js` | PostToolUse | Runs `tsc --noEmit` after file edits; feeds errors back to Claude |
| `env-protect.js` | PreToolUse | Blocks reads/greps targeting `.env` files |
| `session-prime.js` | SessionStart (opt-in) | Loads git context + CLAUDE.md summary at session start |

**`~/.claude/agents/`** — Specialized subagents for delegation:

| Agent | What it does |
|---|---|
| `code-reviewer` | Senior code reviewer (model: sonnet, read-only). Reviews plan alignment, code quality, architecture, logic, security, performance |
| `codebase-researcher` | Fast codebase explorer (model: haiku, read-only). Systematic search and structured findings |
| `system-reviewer` | System review analyst (model: sonnet, read-only). Analyzes execution vs plan, classifies divergences |

**`~/.claude/commands/guides/`** — Reference guides loaded on-demand:

| Guide | What it covers |
|---|---|
| `mcp-integration.md` | How to integrate MCP servers into the PIV loop |
| `ai-optimized-codebase.md` | Vertical slice architecture, LLM-friendly docstrings, strict types |
| `hooks-reference.md` | All hook types, configuration, input JSON, exit codes, debugging |
| `write-skill.md` | How to create new skills with CSO, testing, progressive disclosure |
| `remote-coding.md` | GitHub-based remote agentic coding with autonomy levels |
| `scaling-beyond-engineering.md` | Expanding HOPLA to non-technical teams with 4D Framework |
| `data-audit.md` | Data pipeline audit checklist |
| `review-checklist.md` | Code review checklist reference |

**Installed layout:**

```
~/.claude/
├── CLAUDE.md              ← Global rules
├── commands/
│   ├── hopla-*.md         ← Slash commands (/hopla-prime, /hopla-execute, etc.)
│   └── guides/            ← Reference guides (loaded on-demand by commands/skills)
├── skills/
│   ├── hopla-git/         ← Auto-activates for commit/PR requests
│   ├── hopla-prime/       ← Auto-activates for orientation requests
│   ├── hopla-code-review/ ← Auto-activates for review requests
│   ├── hopla-execution-report/ ← Auto-activates for report requests
│   ├── hopla-verify/      ← Auto-activates for verification before completion
│   ├── hopla-brainstorm/  ← Auto-activates for design exploration
│   ├── hopla-debug/       ← Auto-activates for systematic debugging
│   ├── hopla-tdd/         ← Auto-activates for test-driven development
│   ├── hopla-subagent-execution/ ← Auto-activates for multi-task plans
│   ├── hopla-parallel-dispatch/  ← Auto-activates for parallel work
│   └── hopla-worktree/    ← Auto-activates for isolated branch work
├── agents/
│   ├── code-reviewer.md   ← Senior code review subagent
│   ├── codebase-researcher.md ← Fast codebase exploration subagent
│   └── system-reviewer.md ← Execution vs plan analysis subagent
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
"ponte al día"          → hopla-prime skill auto-loads project context
/hopla-plan-feature     → research codebase and create plan
/hopla-review-plan      → review plan summary and approve
/hopla-execute          → implement the plan with validation
/hopla-validate         → run lint → types → tests → integration
"review the code"       → hopla-code-review skill runs automatically
/hopla-code-review-fix  → fix issues found
/hopla-rca              → root cause analysis if a bug is found
"genera el reporte"     → hopla-execution-report skill documents what was built
/hopla-git-commit       → save to git
/hopla-git-pr           → open pull request on GitHub
```

### Full automation (one command)
```
/hopla-end-to-end       → runs the entire PIV loop: prime → brainstorm → plan → execute → validate → commit
```

### After implementation
```
/hopla-system-review    → analyze plan vs. actual for process improvements
```

### For non-technical users
```
/hopla-guide            → 4D Framework walkthrough (Description, Discernment, Delegation, Diligence)
```

> **Tip:** Many commands also exist as skills — they auto-activate when you describe what you want in natural language. For example, saying "debug this" triggers `hopla-debug`, and "let's brainstorm" triggers `hopla-brainstorm`, without typing any slash command.

---

## Command Chaining

Commands are modular — the output of one becomes the input of the next. Some commands accept arguments (`$1`, `$2`) to receive files generated by previous commands.

### Commands that accept arguments

| Command | Argument | Example |
|---|---|---|
| `/hopla-execute` | Path to plan file | `/hopla-execute .agents/plans/auth-feature.md` |
| `/hopla-end-to-end` | Feature description | `/hopla-end-to-end add user authentication` |
| `/hopla-code-review-fix` | Path to review report or description | `/hopla-code-review-fix .agents/code-reviews/auth-review.md` |
| `/hopla-rca` | Bug description or error message | `/hopla-rca "login fails with 403 after token refresh"` |
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

# 4. Validate
/hopla-validate
→ runs lint → types → tests → integration

# 5. Code review (auto-triggered skill — just say "review the code")
→ saves: .agents/code-reviews/add-user-authentication.md

# 6. Fix issues
/hopla-code-review-fix .agents/code-reviews/add-user-authentication.md

# 7. Document (auto-triggered skill — just say "genera el reporte")
→ saves: .agents/execution-reports/add-user-authentication.md

# 8. Commit
/hopla-git-commit

# 9. Pull request
/hopla-git-pr

# 10. Process improvement (after PR merge)
/hopla-system-review .agents/plans/add-user-authentication.md .agents/execution-reports/add-user-authentication.md
```

> **Or do it all in one command:** `/hopla-end-to-end add user authentication`

---

## Roadmap

Features under consideration for future versions:

- **Domain-specific agents** — Project-level custom agents beyond the 3 built-in ones (e.g. frontend agent, backend agent, database agent)
- **Hook templates** — Installable hook patterns beyond tsc-check and env-protect (e.g. query deduplication, notification hooks)
- **GitHub Actions integration** — Automated PR reviews and `@claude` mentions via GitHub App (see `guides/remote-coding.md`)
- **Team dashboards** — Aggregate execution reports and system reviews across team members

---

## Project Structure (after /hopla-create-prd + /hopla-init-project)

```
project/
├── PRD.md                         ← Product scope (from /hopla-create-prd)
├── CLAUDE.md                      ← Project rules and stack (from /hopla-init-project)
├── .agents/
│   ├── plans/                     ← Implementation plans (commit these)
│   ├── specs/                     ← Design specs from brainstorming (commit these)
│   ├── guides/                    ← On-demand reference guides (commit these)
│   ├── rca/                       ← Root cause analysis docs (commit these)
│   ├── execution-reports/         ← Post-implementation reports (don't commit)
│   ├── code-reviews/              ← Code review reports (don't commit)
│   └── system-reviews/            ← Process improvement reports (don't commit)
└── .claude/
    └── commands/                  ← Project-specific commands (optional)
```
