# @hopla/claude-setup

Hopla team agentic coding system for Claude Code. Delivers skills, agents, hooks, and reference guides via a **Claude Code plugin** (primary channel), with an optional **npm CLI** for the machine-level global rules template.

---

## Prerequisites

- **Claude Code CLI** — install from https://claude.com/claude-code
- **Node.js ≥18** — required for the npm CLI (`node --version`)
- **git** — plugin installs clone this repo
- **Claude Code ≥ 2.1.218** recommended — forked skills (`prime`, `hook-audit`, `system-review`) use `background: false`; older versions ignore unknown frontmatter fields

---

## Quick Start

The full setup is **plugin + CLI** — they deliver different layers:

| Layer | Channel | What it provides |
|---|---|---|
| Per-project behavior | Plugin | Skills, agents, hooks |
| Machine-wide defaults | CLI | `~/.claude/CLAUDE.md` global rules + bash permissions |

**Step 1 — Register the marketplace and install the plugin** (inside Claude Code):

```
/plugin marketplace add HOPLAtools/claude-setup
/plugin install hopla@hopla-marketplace
```

**Step 2 — Install the global rules template** (one-time, terminal):

```bash
npm install -g @hopla/claude-setup
hopla-claude-setup --force
```

That's it. Skills show as `/hopla:<name>`, and most also auto-trigger when relevant.

**Recommended — enable auto-update for the marketplace** (one-time, inside Claude Code):

Open `/plugin` → **Marketplaces** tab → select `hopla-marketplace` → enable auto-update. From then on, new releases are fetched automatically at session start; Claude Code will prompt you to run `/reload-plugins` when an update is ready. Skip this step and you'll need to refresh manually (see [Update](#update) below).

### Plugin only (skip global rules)

If you don't want the machine-wide `~/.claude/CLAUDE.md`, just do Step 1. The plugin works on its own.

### CLI only (no plugin)

If you only want the global rules and not the plugin's skills, just do Step 2. You won't have `/hopla:*` skills.

---

## Update

### Plugin channel

**If auto-update is enabled** (see Quick Start Step 2.5): nothing to do. Claude Code fetches new releases at session start and prompts you to run `/reload-plugins`. That's it.

**Manual refresh** (when auto-update is off, or you want to pull immediately):

```
/plugin marketplace update hopla-marketplace
/plugin disable hopla@hopla-marketplace
/plugin enable hopla@hopla-marketplace
/reload-plugins
```

`/plugin marketplace update` refreshes the cached marketplace listing. `disable`/`enable` cycles the plugin so the new files are picked up — faster than a full `uninstall`/`install` because no scope re-selection is needed. `/reload-plugins` ensures hooks and commands are re-registered in the current session.

> The older `cd ~/.claude/plugins/marketplaces/hopla-marketplace && git pull` workflow still works but is no longer recommended — the built-in `/plugin marketplace update` is the canonical path since Claude Code v1.24.

### CLI channel (global rules)

```bash
npm install -g @hopla/claude-setup@latest --prefer-online && hopla-claude-setup --force
```

---

## Uninstall

**Plugin:**

```
/plugin uninstall hopla@hopla-marketplace
```

**CLI:**

```bash
hopla-claude-setup --uninstall
```

Removes `~/.claude/CLAUDE.md` plus legacy `hopla-*` files from older installs.

### CLI flags reference

| Flag | Purpose |
|---|---|
| `hopla-claude-setup` | Interactive install of global rules + permissions |
| `hopla-claude-setup --force` | Install without prompts |
| `hopla-claude-setup --migrate` | Remove legacy CLI-installed duplicates only |
| `hopla-claude-setup --uninstall` | Remove global rules + legacy files |
| `hopla-claude-setup status` | Read-only inspection of the current project's workflow state (plans from the [plans directory](#plans-directory), active plan + step, specs, reviews, suggested next step) |
| `hopla-claude-setup status --json` | Same as above, JSON output for agents to parse |
| `hopla-claude-setup --dry-run` | Preview changes without touching disk (composes with other flags) |
| `hopla-claude-setup --version` | Print package version |

---

## Optional: Hopla statusline

The plugin ships a statusline script that shows your branch, worktree indicator, uncommitted count, and active plan file (`📋 plan-name`) in Claude Code's status bar.

**Enable it (one-time):**

```bash
hopla-claude-setup --setup-statusline
```

This writes the right `statusLine` block to `~/.claude/settings.json`, pointing at the installed plugin's `statusline.js`. Run `/reload-plugins` (or restart Claude Code) to see it.

**Disable it:**

```bash
hopla-claude-setup --remove-statusline
```

Sample output: ` feature/auth · 3M · 📋 add-authentication`

> **Manual setup (fallback):** if you don't have the CLI installed, add this to `~/.claude/settings.json` yourself:
> ```json
> {
>   "statusLine": {
>     "type": "command",
>     "command": "node ~/.claude/plugins/marketplaces/hopla-marketplace/hooks/statusline.js"
>   }
> }
> ```
> Replace `hopla-marketplace` with the actual marketplace name if you registered it differently.

---

## Naming Convention

Since 3.0 everything you invoke is a **skill** (`skills/<name>/SKILL.md`); there are no separate commands any more. Skills use short names in source (e.g., `prime`, `execute`, `git`) and the plugin namespaces them:

| Kind | Example |
|---|---|
| **Skills** | `/hopla:execute`, `/hopla:plan-feature`, `hopla:git` |
| **Guides** | `/hopla:guides:validation-pyramid` (skills named `guides:<name>`; `/hopla:guides-<name>` works too) |

---

## How It Works — Layered Context

The system uses three levels of agent context, each scoped differently:

```
~/.claude/CLAUDE.md        ← Machine-level (installed by CLI)
    └── applies to ALL projects on this machine

AGENTS.md (project root)   ← Project-level (created with /hopla:init-project)
    └── canonical, tool-agnostic rules — applies to THIS project only
    └── readable by Cursor, Copilot, Continue, Codex, and Claude Code
CLAUDE.md (project root)   ← thin alias that imports AGENTS.md via @AGENTS.md
    └── kept so Claude Code's auto-discovery finds the rules

.claude/CLAUDE.local.md    ← Local overrides (personal, gitignored)
    └── your personal tweaks, not shared with team
```

**Machine-level rules** cover: language preferences, tech defaults, autonomy behavior, context management tips.

**Project-level rules** cover: specific stack versions, architecture patterns, naming conventions, logging, testing, dev commands, task-specific reference guides. Stored in `AGENTS.md` so the project stays portable across AI assistants. The `CLAUDE.md` stub at the project root is auto-generated and only contains `@AGENTS.md` so Claude Code inlines the canonical file — never edit the stub directly.

**Local overrides** cover: personal preferences that differ from the team (e.g., verbose logging, different editor settings).

---

## The Agentic Coding Framework

Built on two core concepts from the Agentic Coding Course:

### AI Layer — What guides the agent

| Pillar | What it is | Delivered by |
|---|---|---|
| **Global Rules** | Always-loaded context: language, git flow, tech defaults, autonomy | CLI → `~/.claude/CLAUDE.md` |
| **On-Demand Context** | Task-specific guides loaded when needed | Project → `.agents/guides/*.md` |
| **Skills** | Reusable processes that tell the agent *how* to work — run with `/hopla:<name>` or auto-activated by semantic matching | Plugin |
| **Agents** | Specialized subagents for delegation (code review, research, system analysis) | Plugin |
| **Hooks** | Run automatically before/after tool use for type checking and protection | Plugin |

The key insight: **skills inject on-demand context deterministically** — when you run `/hopla:plan-feature`, it automatically reads the relevant guide from `.agents/guides/` before planning.

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

**Skills you run yourself** — type `/hopla:<name>`:

| Skill | Description |
|---|---|
| `init-project` | Existing code: runs the native `/init` and moves its result into AGENTS.md (+ CLAUDE.md alias); no code yet: reads the PRD, recommends the stack, writes a short AGENTS.md. Creates `.agents/`; never overwrites existing rules files without asking — manual only |
| `create-prd` | Create a Product Requirements Document through guided questions — manual only |
| `plan-feature` | Research codebase and create a structured implementation plan (runs at `effort: high`); migrations get inventory, strategy, rollback and validation per phase and a cleanup phase |
| `review-plan` | Review a plan before execution — get a summary and approve |
| `execute` | Execute a structured plan from start to finish with validation — manual only. With 3 or more independent tasks (disjoint files) it runs them as a native Workflow — up to 6 agents, each implemented and verified — after you approve the workflow dialog (decline it and reply "sequential" to run them one by one), then validates in the main session |
| `validate` | Run the validation pyramid: lint → types → tests → integration |
| `rca` | Root Cause Analysis — investigate a bug and generate an RCA doc |
| `archive` | Close the lifecycle of a completed plan: fold its delta-specs into canonical specs, move artifacts to archive locations — manual only |
| `guide` | 4D Framework walkthrough for non-technical users — manual only |
| `system-review` | Analyze implementation against plan to find process improvements (runs as a forked subagent on Sonnet) |

> **Manual only** skills (`guide`, `create-prd`, `init-project`, `execute`, `archive`) never start on their own: Claude asks you to type the slash command. They are long-running or move files, so they only run when you ask for them. The others can also start automatically when your request matches them.

**Skills that activate on their own** — by semantic matching:

| Skill | Auto-activates when you say… |
|---|---|
| `git` | "commit this", "create a PR", "push changes" |
| `worktree` | "use a worktree", "isolated branch", "parallel feature work" |
| `prime` | "orient yourself", "catch me up", "what is this project" — runs as a forked subagent on Haiku and returns a summary |
| `code-review` | "review the code", "code review", "check these changes" — wraps the native `/code-review`, adds a checklist pass (HOPLA + `.agents/guides/review-checklist.md`), keeps findings with confidence ≥ 80 and always saves the report. `/hopla:code-review [effort] [--fix] [target]` (default `medium`; pass a branch to include committed work) |
| `execution-report` | "generate the report", "document what was done" |
| `verify` | "verify it works", "make sure it's correct" |
| `brainstorm` | "let's brainstorm", "explore approaches" |
| `debug` | "debug this", "find the bug", "why is this failing" (runs at `effort: high`, like `rca`) |
| `tdd` | "write tests first", "TDD", "red-green-refactor" |
| `performance` | "slow", "too slow", "optimize", "bottleneck" |
| `hook-audit` | "audit hook", "check hook", "hook review" — forked subagent on Sonnet; mechanical static audit of `src/hooks/use*.ts` files (memoization, stale-id guards, error-match strictness, cache+dedup integrity) |

The `git` skill asks before every commit, push and PR. If your own instructions grant a standing approval for one of those exact actions — in a `CLAUDE.md` or a file in `~/.claude/rules/` (keep personal approvals there: the CLI installer rewrites `~/.claude/CLAUDE.md`) — it does that action without asking and reports it. Merging, tags and commits or pushes on `main`/`master` still ask unless the approval names them.

**Deprecated in 3.0.0** (and `migration` in 3.3.0) — still installed and working, removed in 4.0.0. The first time you (or Claude) use one in a session, a one-line notice names the replacement:

| Deprecated | Use instead |
|---|---|
| `parallel-dispatch` skill | Native Workflows (say "use a workflow") |
| `subagent-execution` skill | `/hopla:execute` (runs independent tasks as a workflow) |
| `refactoring` skill | Native `/simplify` |
| `code-review-fix` skill | `/hopla:code-review --fix` |
| `migration` skill (3.3.0) | `/hopla:plan-feature` (plans migrations with phases and rollback) |
| `code-reviewer` agent | The `code-review` skill |
| `system-reviewer` agent | `/hopla:system-review` |

**Hooks** — Run automatically:

| Hook | Type | What it does |
|---|---|---|
| `tsc-check.js` | PostToolUse + Stop | Records edited TS/JS files; once per turn runs `tsc -p` on the nearest `tsconfig.json` (monorepo-aware) and shows Claude the first 30 errors in files it edited, plus totals and a full log in `/tmp` |
| `env-protect.js` | PreToolUse | Blocks reads of dotenv files (`.env`, `.env.local`, …); `.env.example` stays readable; Bash is matched by what the command does, not by its text. Also blocks Read/Grep/Edit/MultiEdit of `.dev.vars` |
| `session-prime.js` | SessionStart | Injects branch, uncommitted summary, active plan + step and the post-`/compact` snapshot (≤ 1,500 chars) |
| `precompact-snapshot.js` | PreCompact | Saves branch, uncommitted files and the active plan + step to `.claude/compact-snapshot.json` |
| `deprecation-notice.js` | UserPromptSubmit + PreToolUse | When a deprecated skill or agent is used, shows one line per session naming its replacement; never blocks |

> **Type errors once per turn.** `tsc-check` runs at the end of each turn, not after every edit, and blocks only for errors in files Claude edited in that turn (at most twice per turn); errors elsewhere are reported in one line. For per-edit diagnostics, install the official TypeScript language server plugin (optional, your choice):
>
> ```
> /plugin install typescript-lsp@claude-plugins-official
> ```

**Agents** — Specialized subagents for delegation:

| Agent | What it does |
|---|---|
| `code-reviewer` | Deprecated in 3.0.0 — use the `code-review` skill |
| `codebase-researcher` | Fast codebase explorer (read-only). Systematic search, structured findings |
| `system-reviewer` | Deprecated in 3.0.0 — use `/hopla:system-review` |

**Reference guides** — manual-only skills you load with `/hopla:guides:<name>` (since 3.1 Claude does not load them on its own, so they stay out of the skill-listing budget; HOPLA skills read the ones they need by path):

| Guide | What it covers |
|---|---|
| `guides:mcp-integration` | Integrating MCP servers into the PIV loop |
| `guides:ai-optimized-codebase` | Vertical slice architecture, LLM-friendly docstrings, strict types |
| `guides:hooks-reference` | All hook types, configuration, input JSON, exit codes |
| `guides:write-skill` | Creating new skills with CSO, testing, progressive disclosure |
| `guides:remote-coding` | GitHub-based remote agentic coding with autonomy levels |
| `guides:scaling-beyond-engineering` | Expanding HOPLA to non-technical teams with 4D Framework |
| `guides:data-audit` | Data pipeline audit checklist |
| `guides:review-checklist` | Code review checklist reference |
| `guides:validation-pyramid` | The validation levels used by execute, validate and verify |

---

## Recommended Workflow

### Starting a new project

```
/hopla:create-prd         → define what you're building (PRD.md)
/hopla:init-project       → native /init (or PRD + stack), creates AGENTS.md + CLAUDE.md alias + .agents/
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
"fix the findings"        → fix the issues (or /hopla:code-review --fix)
"generate the report"     → execution-report skill documents what was built
/hopla:archive            → fold delta-specs into canonical specs, move plan to done/, drop ephemeral code-review (opt-in — when delta-specs were declared)
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

> **Tip:** Most skills also auto-activate when you describe what you want in natural language. Say "debug this" to trigger the `debug` skill, "let's brainstorm" for `brainstorm`, without typing any slash command.

### Plans directory

Plans live in `.agents/plans/` by default. To keep them elsewhere, declare the directory in the project's `AGENTS.md` (or `CLAUDE.md` when there is no `AGENTS.md` declaration):

```markdown
## HOPLA
- Plans: docs/plans/
```

- The first `- Plans:` line under a `## HOPLA` heading wins; examples inside fenced code blocks are ignored.
- The path is relative to the project root. Wrap it in backticks if it contains spaces: `` - Plans: `docs/my plans/` ``.
- Unsafe values (absolute paths, `..`, `~`, `$`, drive letters) are ignored with a warning and the default is used.
- A declared directory always wins, even if it does not exist yet (no fallback to `.agents/plans/`).
- `done/` (archived plans) and `backlog/` (deferred ideas) live under the plans directory.

Honored by `/hopla:plan-feature`, `/hopla:execute`, `/hopla:archive`, the `prime`/`brainstorm`/`git` skills, the session hooks, the statusline and `hopla-claude-setup status`.

**Active-plan pointer.** `/hopla:plan-feature` and `/hopla:execute` record the plan in progress and its current step in `.agents/hopla-active-plan.json`. The session-start context, the pre-compact snapshot, the statusline and `status` read it first (fallback: the newest non-draft plan by modification time that has an `## Implementation Tasks` or `### Task` heading, so notes files in the plans dir are skipped); `/hopla:archive` clears it. Together with `.claude/compact-snapshot.json` it is per-machine state — add both to `.gitignore` (`/hopla:init-project` does it). If the pointer is not git-ignored, `/hopla:execute` asks before writing it and recommends adding the line; `/hopla:plan-feature` skips it. The session-start context replays the pre-compact snapshot only after `/compact` or on resume.

---

## Skill Chaining

Skills are modular — the output of one becomes the input of the next. Some accept arguments (file paths, passed in order) to receive files generated by previous skills.

### Skills that accept arguments

| Skill | Argument | Example |
|---|---|---|
| `/hopla:execute` | Plan file path | `/hopla:execute .agents/plans/auth-feature.md` |
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

# 6. Fix issues (just say "fix the findings in .agents/code-reviews/add-user-authentication.md")

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
- If missing, re-run `/plugin marketplace add HOPLAtools/claude-setup`
- Restart Claude Code after registering a new marketplace

### Commands appear as both `hopla-*` and `hopla:*`

You have legacy CLI-installed files from before the plugin refactor. Clean up:

```bash
hopla-claude-setup --migrate
```

This removes `hopla-*` duplicates from `~/.claude/commands/` and `~/.claude/skills/` without touching your global rules.

### Update command fails: "no such file or directory"

```bash
cd ~/.claude/plugins/marketplaces/hopla-marketplace && git pull
# → cd: no such file or directory
```

You never registered the marketplace. Run Quick Start Step 1 first.

### `hopla-claude-setup: command not found`

The npm global bin is not on your PATH. Check with:

```bash
npm config get prefix
# Add $(npm config get prefix)/bin to your PATH
```

Alternatively, run via npx: `npx @hopla/claude-setup --force`.

> **Migrating from v1.x?** The `claude-setup` bin alias was removed in v2.0.0. Replace any script that calls `claude-setup` with `hopla-claude-setup` (same flags, same behavior).

### Changes to skills don't take effect

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
├── AGENTS.md                      ← Canonical project rules (tool-agnostic, from /hopla:init-project)
├── CLAUDE.md                      ← Thin alias: contains @AGENTS.md so Claude Code auto-loads the rules
├── .agents/
│   ├── plans/                     ← Implementation plans (commit; or the declared plans directory)
│   │   ├── done/                  ← Plans archived by /hopla:archive (commit)
│   │   └── backlog/               ← Deferred ideas from Scope Guard (commit)
│   ├── specs/                     ← Design specs from brainstorming (commit)
│   │   ├── canonical/             ← "Current behavior" specs by domain — populated incrementally by /hopla:archive (commit; opt-in)
│   │   └── archived/              ← Completed design specs moved here by /hopla:archive (commit)
│   ├── guides/                    ← On-demand reference guides (commit)
│   ├── rca/                       ← Root cause analysis docs (commit)
│   ├── execution-reports/         ← Post-implementation reports (commit)
│   ├── system-reviews/            ← Process improvement reports (commit)
│   ├── audits/                    ← Persistent audit reports (commit — opt-in)
│   ├── code-reviews/              ← Code review reports (don't commit — ephemeral)
│   └── hopla-active-plan.json     ← Active plan + step (don't commit)
└── .claude/
    ├── skills/                    ← Project-specific skills (optional)
    └── compact-snapshot.json      ← Pre-compact snapshot (don't commit)
```
