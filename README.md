# @hopla/claude-setup

Hopla team agentic coding system for Claude Code. Installs commands, skills, agents, hooks, and reference guides — available as a **Claude Code plugin** or via **npm CLI**.

## Install

### Option A: Claude Code Plugin (recommended)

First, register the HOPLA marketplace (only needed once):

```
/plugin marketplace add hopla-marketplace HOPLAtools/claude-setup
```

Then install the plugin:

```
/plugin install hopla@hopla-marketplace
```

This installs all commands, skills, agents, and hooks automatically.

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

Installs only planning commands: `init-project`, `create-prd`, `plan-feature`, `review-plan`, `guide`, `git-commit`, `git-pr`. Also installs planning skills (`prime`, `brainstorm`). No execution or review commands. No bash permission prompts during planning.

To overwrite existing files without prompting:

```bash
claude-setup --force
claude-setup --planning --force
```

## Update

### Plugin channel

Claude Code caches the marketplace repo locally. To get the latest version:

```bash
# Step 1: Update the local marketplace cache
cd ~/.claude/plugins/marketplaces/hopla-marketplace && git pull

# Step 2: Reinstall the plugin in Claude Code
/plugin uninstall hopla@hopla-marketplace
/plugin install hopla@hopla-marketplace
/reload-plugins
```

> **Known issue:** Claude Code does not automatically `git pull` the marketplace when reinstalling a plugin. The manual `git pull` in step 1 is required to pick up new versions.

### CLI channel (for global rules)

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

## Naming Convention

Skills and commands use short names in source (e.g., `prime`, `execute`, `git`). Each distribution channel adds its own namespace:

| Channel | Skills | Commands |
|---|---|---|
| **Plugin** | `/hopla:prime`, `/hopla:git` | `/hopla:execute`, `/hopla:plan-feature` |
| **CLI** | `hopla-prime`, `hopla-git` | `/hopla-execute`, `/hopla-plan-feature` |

The plugin channel uses the plugin name (`hopla:`) as namespace. The CLI channel adds a `hopla-` prefix during installation.

---

## How It Works — Layered Context

The system uses three levels of CLAUDE.md, each scoped differently:

```
~/.claude/CLAUDE.md        ← Machine-level (installed by claude-setup)
    └── applies to ALL projects on this machine

CLAUDE.md (project root)   ← Project-level (created with /init-project)
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
| **Commands** | Reusable processes that tell the agent *how* to work | `~/.claude/commands/` |
| **Skills** | Auto-activate by semantic matching — no slash command needed | `~/.claude/skills/` |
| **Agents** | Specialized subagents for delegation (code review, research, system analysis) | `~/.claude/agents/*.md` |
| **Hooks** | Run automatically before/after tool use for type checking and protection | `~/.claude/hooks/*.js` |

The key insight: **commands inject on-demand context deterministically** — when you run `/plan-feature`, it automatically reads the relevant guide from `.agents/guides/` before planning.

### PIV Loop — How you work

```
Plan → Implement → Validate → (repeat)
```

- **Plan** (`/plan-feature`) — Research the codebase, design the approach, create a structured plan
- **Implement** (`/execute`) — Delegate coding to the AI, trust but verify at each task
- **Validate** — AI runs lint → types → tests → integration; human reviews the result

### System Evolution

After each PIV loop, run `/execution-report` + `/system-review` to find process improvements. Don't just fix bugs — fix the system that allowed them.

---

## What Gets Installed

**`~/.claude/CLAUDE.md`** — Global rules applied to every Claude Code session.

**Commands** — Reusable commands available in any project:

| Command | Description |
|---|---|
| `init-project` | Read PRD, recommend stack, create CLAUDE.md and .agents/ structure |
| `create-prd` | Create a Product Requirements Document through guided questions |
| `plan-feature` | Research codebase and create a structured implementation plan |
| `review-plan` | Review a plan before execution — get a concise summary and approve |
| `execute` | Execute a structured plan from start to finish with validation |
| `validate` | Run the validation pyramid: lint → types → tests → integration |
| `code-review-fix` | Fix issues found in a code review report |
| `rca` | Root Cause Analysis — investigate a bug systematically and generate an RCA doc |
| `guide` | 4D Framework guide for non-technical users (Description, Discernment, Delegation, Diligence) |
| `system-review` | Analyze implementation against plan to find process improvements |

> **Note:** `prime`, `code-review`, and `execution-report` are **skills only** (no slash command needed) — they auto-activate when you describe the task in natural language.

**Skills** — Auto-activate by semantic matching, no slash command needed:

| Skill | Auto-activates when you say... |
|---|---|
| `git` | "commit this", "create a PR", "push changes", "save to git" |
| `prime` | "orient yourself", "catch me up", "what is this project" |
| `code-review` | "review the code", "code review", "check these changes" |
| `execution-report` | "generate the report", "document what was done", "summarize the work" |
| `verify` | "verify it works", "make sure it's correct", "check before finishing" |
| `brainstorm` | "let's brainstorm", "explore approaches", "design this before coding" |
| `debug` | "debug this", "find the bug", "why is this failing" |
| `tdd` | "write tests first", "TDD", "red-green-refactor" |
| `subagent-execution` | "use subagents", "execute with agents", plans with 5+ tasks |
| `parallel-dispatch` | "run in parallel", "parallelize this", independent tasks |
| `worktree` | "use a worktree", "isolated branch", "parallel feature work" |

**Hooks** — Run automatically before/after tool use (configured in `~/.claude/settings.json`):

| Hook | Type | What it does |
|---|---|---|
| `tsc-check.js` | PostToolUse | Runs `tsc --noEmit` after file edits; feeds errors back to Claude |
| `env-protect.js` | PreToolUse | Blocks reads/greps targeting `.env` files |
| `session-prime.js` | SessionStart (opt-in) | Loads git context + CLAUDE.md summary at session start |

**Agents** — Specialized subagents for delegation:

| Agent | What it does |
|---|---|
| `code-reviewer` | Senior code reviewer (read-only). Reviews plan alignment, code quality, architecture, logic, security, performance |
| `codebase-researcher` | Fast codebase explorer (read-only). Systematic search and structured findings |
| `system-reviewer` | System review analyst (read-only). Analyzes execution vs plan, classifies divergences |

**Reference guides** — Loaded on-demand:

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

---

## Recommended Workflow

### Starting a new project
```
/create-prd          → define what you're building (PRD.md)
/init-project        → reads PRD, recommends stack, creates CLAUDE.md + .agents/
"commit this"        → git skill saves Layer 1 foundation to git
```

### Feature development (PIV loop)
```
"catch me up"          → prime skill auto-loads project context
/plan-feature          → research codebase and create plan
/review-plan           → review plan summary and approve
/execute               → implement the plan with validation
/validate              → run lint → types → tests → integration
"review the code"      → code-review skill runs automatically
/code-review-fix       → fix issues found
/rca                   → root cause analysis if a bug is found
"generate the report"  → execution-report skill documents what was built
"commit this"          → git skill handles commits and PRs
```

### After implementation
```
/system-review         → analyze plan vs. actual for process improvements
```

### For non-technical users
```
/guide                 → 4D Framework walkthrough (Description, Discernment, Delegation, Diligence)
```

> **Tip:** Many commands also exist as skills — they auto-activate when you describe what you want in natural language. For example, saying "debug this" triggers the `debug` skill, and "let's brainstorm" triggers the `brainstorm` skill, without typing any slash command.

---

## Command Chaining

Commands are modular — the output of one becomes the input of the next. Some commands accept arguments (`$1`, `$2`) to receive files generated by previous commands.

### Commands that accept arguments

| Command | Argument | Example |
|---|---|---|
| `/execute` | Path to plan file | `/execute .agents/plans/auth-feature.md` |
| `/code-review-fix` | Path to review report or description | `/code-review-fix .agents/code-reviews/auth-review.md` |
| `/rca` | Bug description or error message | `/rca "login fails with 403 after token refresh"` |
| `/system-review` | Plan file + execution report | `/system-review .agents/plans/auth-feature.md .agents/execution-reports/auth-feature.md` |

### Full PIV loop example

```
# 1. Plan
/plan-feature add user authentication
→ saves: .agents/plans/add-user-authentication.md

# 2. Review plan
/review-plan .agents/plans/add-user-authentication.md

# 3. Execute
/execute .agents/plans/add-user-authentication.md
→ implements the plan, runs validation

# 4. Validate
/validate
→ runs lint → types → tests → integration

# 5. Code review (auto-triggered skill — just say "review the code")
→ saves: .agents/code-reviews/add-user-authentication.md

# 6. Fix issues
/code-review-fix .agents/code-reviews/add-user-authentication.md

# 7. Document (auto-triggered skill — just say "generate the report")
→ saves: .agents/execution-reports/add-user-authentication.md

# 8. Commit and PR (auto-triggered — just say "commit this" then "create a PR")

# 9. Process improvement (after PR merge)
/system-review .agents/plans/add-user-authentication.md .agents/execution-reports/add-user-authentication.md
```

---

## Roadmap

Features under consideration for future versions:

- **Domain-specific agents** — Project-level custom agents beyond the 3 built-in ones (e.g. frontend agent, backend agent, database agent)
- **Hook templates** — Installable hook patterns beyond tsc-check and env-protect (e.g. query deduplication, notification hooks)
- **GitHub Actions integration** — Automated PR reviews and `@claude` mentions via GitHub App (see `guides/remote-coding.md`)
- **Team dashboards** — Aggregate execution reports and system reviews across team members

---

## Project Structure (after /create-prd + /init-project)

```
project/
├── PRD.md                         ← Product scope (from /create-prd)
├── CLAUDE.md                      ← Project rules and stack (from /init-project)
├── .agents/
│   ├── plans/                     ← Implementation plans (commit)
│   │   ├── done/                  ← Archived plans after system-review (commit)
│   │   └── backlog/               ← Deferred ideas from Scope Guard (commit)
│   ├── specs/                     ← Design specs from brainstorming (commit)
│   ├── guides/                    ← On-demand reference guides (commit)
│   ├── rca/                       ← Root cause analysis docs (commit)
│   ├── execution-reports/         ← Post-implementation reports (commit)
│   ├── system-reviews/            ← Process improvement reports (commit)
│   └── code-reviews/              ← Code review reports (don't commit — ephemeral)
└── .claude/
    └── commands/                  ← Project-specific commands (optional)
```
