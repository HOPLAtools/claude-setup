# @hopla/claude-setup

Hopla team agentic coding system for Claude Code. Delivers commands, skills, agents, hooks, and reference guides via a **Claude Code plugin** (primary channel), with an optional **npm CLI** for the machine-level global rules template.

---

## Prerequisites

- **Claude Code CLI** — install from https://claude.com/claude-code
- **Node.js ≥18** — required for the npm CLI (`node --version`)
- **git** — plugin installs clone this repo

---

## Quick Start

The full setup is **plugin + CLI** — they deliver different layers:

| Layer | Channel | What it provides |
|---|---|---|
| Per-project behavior | Plugin | Commands, skills, agents, hooks |
| Machine-wide defaults | CLI | `~/.claude/CLAUDE.md` global rules + bash permissions |

**Step 1 — Register the marketplace and install the plugin** (inside Claude Code):

```
/plugin marketplace add hopla-marketplace HOPLAtools/claude-setup
/plugin install hopla@hopla-marketplace
```

**Step 2 — Install the global rules template** (one-time, terminal):

```bash
npm install -g @hopla/claude-setup
claude-setup --force
```

That's it. Commands show as `/hopla:<name>`, skills auto-trigger when relevant.

### Plugin only (skip global rules)

If you don't want the machine-wide `~/.claude/CLAUDE.md`, just do Step 1. The plugin works on its own.

### CLI only (no plugin)

If you only want the global rules and not the plugin's commands/skills, just do Step 2. You won't have `/hopla:*` commands.

---

## Update

### Plugin channel

Claude Code caches the marketplace repo locally. To pick up new versions:

```bash
cd ~/.claude/plugins/marketplaces/hopla-marketplace && git pull
```

Then inside Claude Code:

```
/plugin uninstall hopla@hopla-marketplace
/plugin install hopla@hopla-marketplace
/reload-plugins
```

> **Known issue:** Claude Code does not automatically `git pull` the marketplace when reinstalling a plugin. The manual `git pull` above is required.

If the `cd` path does not exist, you never installed the marketplace — do Step 1 of Quick Start instead.

### CLI channel (global rules)

```bash
npm install -g @hopla/claude-setup@latest --prefer-online && claude-setup --force
```

---

## Uninstall

**Plugin:**

```
/plugin uninstall hopla@hopla-marketplace
```

**CLI:**

```bash
claude-setup --uninstall
```

Removes `~/.claude/CLAUDE.md` plus legacy `hopla-*` files from older installs.

### CLI flags reference

| Flag | Purpose |
|---|---|
| `claude-setup` | Interactive install of global rules + permissions |
| `claude-setup --force` | Install without prompts |
| `claude-setup --migrate` | Remove legacy CLI-installed duplicates only |
| `claude-setup --uninstall` | Remove global rules + legacy files |
| `claude-setup --version` | Print package version |

---

## Naming Convention

Skills and commands use short names in source (e.g., `prime`, `execute`, `git`). The plugin namespaces them automatically:

| Type | Example |
|---|---|
| **Skills** | `hopla:prime`, `hopla:git`, `hopla:debug` |
| **Commands** | `/hopla:execute`, `/hopla:plan-feature` |

---

## How It Works — Layered Context

The system uses three levels of CLAUDE.md, each scoped differently:

```
~/.claude/CLAUDE.md        ← Machine-level (installed by CLI)
    └── applies to ALL projects on this machine

CLAUDE.md (project root)   ← Project-level (created with /hopla:init-project)
    └── applies to THIS project only

.claude/CLAUDE.local.md    ← Local overrides (personal, gitignored)
    └── your personal tweaks, not shared with team
```

**Machine-level rules** cover: language preferences, tech defaults, autonomy behavior, context management tips.

**Project-level rules** cover: specific stack versions, architecture patterns, naming conventions, logging, testing, dev commands, task-specific reference guides.

**Local overrides** cover: personal preferences that differ from the team (e.g., verbose logging, different editor settings).

---

## The Agentic Coding Framework

Built on two core concepts from the Agentic Coding Course:

### AI Layer — What guides the agent

| Pillar | What it is | Delivered by |
|---|---|---|
| **Global Rules** | Always-loaded context: language, git flow, tech defaults, autonomy | CLI → `~/.claude/CLAUDE.md` |
| **On-Demand Context** | Task-specific guides loaded when needed | Project → `.agents/guides/*.md` |
| **Commands** | Reusable processes that tell the agent *how* to work | Plugin |
| **Skills** | Auto-activate by semantic matching — no slash command needed | Plugin |
| **Agents** | Specialized subagents for delegation (code review, research, system analysis) | Plugin |
| **Hooks** | Run automatically before/after tool use for type checking and protection | Plugin |

The key insight: **commands inject on-demand context deterministically** — when you run `/hopla:plan-feature`, it automatically reads the relevant guide from `.agents/guides/` before planning.

### PIV Loop — How you work

```
Plan → Implement → Validate → (repeat)
```

- **Plan** (`/hopla:plan-feature`) — Research codebase, design approach, create a structured plan
- **Implement** (`/hopla:execute`) — Delegate coding to the AI, trust but verify at each task
- **Validate** — AI runs lint → types → tests → integration; human reviews the result

### System Evolution

After each PIV loop, run the `execution-report` skill + `/hopla:system-review` to find process improvements. Don't just fix bugs — fix the system that allowed them.

---

## What Gets Installed

### From the CLI (machine-level, one-time)

- **`~/.claude/CLAUDE.md`** — Global rules applied to every Claude Code session
- **`~/.claude/settings.json`** — Bash permissions configured for common dev commands

### From the Plugin (per Claude Code session)

**Commands** — Reusable commands available in any project:

| Command | Description |
|---|---|
| `init-project` | Read PRD, recommend stack, create CLAUDE.md and .agents/ structure |
| `create-prd` | Create a Product Requirements Document through guided questions |
| `plan-feature` | Research codebase and create a structured implementation plan |
| `review-plan` | Review a plan before execution — get a summary and approve |
| `execute` | Execute a structured plan from start to finish with validation |
| `validate` | Run the validation pyramid: lint → types → tests → integration |
| `code-review-fix` | Fix issues found in a code review report |
| `rca` | Root Cause Analysis — investigate a bug and generate an RCA doc |
| `guide` | 4D Framework walkthrough for non-technical users |
| `system-review` | Analyze implementation against plan to find process improvements |

> `prime`, `code-review`, and `execution-report` are **skills only** (no slash command needed).

**Skills** — Auto-activate by semantic matching:

| Skill | Auto-activates when you say… |
|---|---|
| `git` | "commit this", "create a PR", "push changes" |
| `worktree` | "use a worktree", "isolated branch", "parallel feature work" |
| `prime` | "orient yourself", "catch me up", "what is this project" |
| `code-review` | "review the code", "code review", "check these changes" |
| `execution-report` | "generate the report", "document what was done" |
| `verify` | "verify it works", "make sure it's correct" |
| `brainstorm` | "let's brainstorm", "explore approaches" |
| `debug` | "debug this", "find the bug", "why is this failing" |
| `tdd` | "write tests first", "TDD", "red-green-refactor" |
| `subagent-execution` | "use subagents", plans with 5+ tasks |
| `parallel-dispatch` | "run in parallel", "parallelize this", independent tasks |

**Hooks** — Run automatically:

| Hook | Type | What it does |
|---|---|---|
| `tsc-check.js` | PostToolUse | Runs `tsc --noEmit` after file edits; feeds errors back to Claude |
| `env-protect.js` | PreToolUse | Blocks reads/greps targeting `.env` files |
| `session-prime.js` | SessionStart | Loads git context + CLAUDE.md summary + skills list |

**Agents** — Specialized subagents for delegation:

| Agent | What it does |
|---|---|
| `code-reviewer` | Senior code reviewer (read-only). Plan alignment, quality, architecture, security |
| `codebase-researcher` | Fast codebase explorer (read-only). Systematic search, structured findings |
| `system-reviewer` | System review analyst (read-only). Execution vs plan, classifies divergences |

**Reference guides** — Loaded on-demand by commands:

| Guide | What it covers |
|---|---|
| `mcp-integration.md` | Integrating MCP servers into the PIV loop |
| `ai-optimized-codebase.md` | Vertical slice architecture, LLM-friendly docstrings, strict types |
| `hooks-reference.md` | All hook types, configuration, input JSON, exit codes |
| `write-skill.md` | Creating new skills with CSO, testing, progressive disclosure |
| `remote-coding.md` | GitHub-based remote agentic coding with autonomy levels |
| `scaling-beyond-engineering.md` | Expanding HOPLA to non-technical teams with 4D Framework |
| `data-audit.md` | Data pipeline audit checklist |
| `review-checklist.md` | Code review checklist reference |

---

## Recommended Workflow

### Starting a new project

```
/hopla:create-prd         → define what you're building (PRD.md)
/hopla:init-project       → reads PRD, recommends stack, creates CLAUDE.md + .agents/
"commit this"             → git skill saves foundation
```

### Feature development (PIV loop)

```
"catch me up"             → prime skill loads project context
"use a worktree"          → worktree skill (optional — for isolation or parallel work)
/hopla:plan-feature       → research codebase and create plan
/hopla:review-plan        → review summary and approve
/hopla:execute            → implement plan with validation
/hopla:validate           → lint → types → tests → integration
"review the code"         → code-review skill runs automatically
/hopla:code-review-fix    → fix issues found
"generate the report"     → execution-report skill documents what was built
"commit this"             → git skill handles commits and PRs
                           (cleanup including worktree removal happens post-merge)
```

**When to reach for `worktree`:** risky refactors, parallel feature work, or when you need a clean baseline while keeping the current branch untouched. The skill auto-resolves the correct base branch (`feature/*` from `develop`, `hotfix/*` from `main`, etc.).

### After implementation

```
/hopla:system-review      → analyze plan vs. actual for process improvements
```

### For non-technical users

```
/hopla:guide              → 4D Framework walkthrough (Description, Discernment, Delegation, Diligence)
```

> **Tip:** Many commands also exist as skills — they auto-activate when you describe what you want in natural language. Say "debug this" to trigger the `debug` skill, "let's brainstorm" for `brainstorm`, without typing any slash command.

---

## Command Chaining

Commands are modular — the output of one becomes the input of the next. Some accept arguments (`$1`, `$2`) to receive files generated by previous commands.

### Commands that accept arguments

| Command | Argument | Example |
|---|---|---|
| `/hopla:execute` | Plan file path | `/hopla:execute .agents/plans/auth-feature.md` |
| `/hopla:code-review-fix` | Review report path | `/hopla:code-review-fix .agents/code-reviews/auth-review.md` |
| `/hopla:rca` | Bug description | `/hopla:rca "login fails with 403 after token refresh"` |
| `/hopla:system-review` | Plan + report | `/hopla:system-review .agents/plans/auth.md .agents/execution-reports/auth.md` |

### Full PIV loop example

```
# 1. Plan
/hopla:plan-feature add user authentication
→ saves: .agents/plans/add-user-authentication.md

# 2. Review
/hopla:review-plan .agents/plans/add-user-authentication.md

# 3. Execute
/hopla:execute .agents/plans/add-user-authentication.md

# 4. Validate
/hopla:validate

# 5. Code review (skill — just say "review the code")
→ saves: .agents/code-reviews/add-user-authentication.md

# 6. Fix issues
/hopla:code-review-fix .agents/code-reviews/add-user-authentication.md

# 7. Document (skill — just say "generate the report")
→ saves: .agents/execution-reports/add-user-authentication.md

# 8. Commit and PR (skill — "commit this", then "create a PR")

# 9. Process improvement
/hopla:system-review .agents/plans/add-user-authentication.md .agents/execution-reports/add-user-authentication.md
```

---

## Troubleshooting

### `/plugin marketplace add` fails with "repo not found"

- Confirm the repo URL: `HOPLAtools/claude-setup` (case-sensitive)
- Check your network — `/plugin marketplace add` does a `git clone` under the hood
- If you were added to `HOPLAtools` recently, re-authenticate: `gh auth login`

### `/plugin install` doesn't show the `hopla` plugin

- Run `/plugin marketplace list` — confirm `hopla-marketplace` is registered
- If missing, re-run `/plugin marketplace add hopla-marketplace HOPLAtools/claude-setup`
- Restart Claude Code after registering a new marketplace

### Commands appear as both `hopla-*` and `hopla:*`

You have legacy CLI-installed files from before the plugin refactor. Clean up:

```bash
claude-setup --migrate
```

This removes `hopla-*` duplicates from `~/.claude/commands/` and `~/.claude/skills/` without touching your global rules.

### Update command fails: "no such file or directory"

```bash
cd ~/.claude/plugins/marketplaces/hopla-marketplace && git pull
# → cd: no such file or directory
```

You never registered the marketplace. Run Quick Start Step 1 first.

### `claude-setup: command not found`

The npm global bin is not on your PATH. Check with:

```bash
npm config get prefix
# Add $(npm config get prefix)/bin to your PATH
```

Alternatively, run via npx: `npx @hopla/claude-setup --force`.

### Changes to skills/commands don't take effect

Claude Code caches plugin content. After a plugin update:

```
/plugin uninstall hopla@hopla-marketplace
/plugin install hopla@hopla-marketplace
/reload-plugins
```

---

## Roadmap

Features under consideration:

- **Domain-specific agents** — Project-level custom agents beyond the 3 built-in ones (frontend, backend, database)
- **Hook templates** — Installable hook patterns beyond `tsc-check` and `env-protect`
- **GitHub Actions integration** — Automated PR reviews and `@claude` mentions via GitHub App
- **Team dashboards** — Aggregate execution reports and system reviews across team members

Issues and contributions welcome: https://github.com/HOPLAtools/claude-setup/issues

---

## Project Structure (after `/hopla:create-prd` + `/hopla:init-project`)

```
project/
├── PRD.md                         ← Product scope (from /hopla:create-prd)
├── CLAUDE.md                      ← Project rules and stack (from /hopla:init-project)
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
