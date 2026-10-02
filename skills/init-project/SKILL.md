---
name: init-project
description: Initialize a project with AGENTS.md (+ CLAUDE.md alias) and the .agents/ structure — via the native /init for existing code
disable-model-invocation: true
---

> **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Set up the Layer 1 planning foundation for this project: a project-specific `AGENTS.md` with rules and architecture decisions (the canonical, tool-agnostic source of truth), a thin `CLAUDE.md` alias so Claude Code auto-loads the rules, plus the `.agents/` directory structure.

> Layer 1 = Global Rules (~/.claude/CLAUDE.md) + Project Rules (AGENTS.md, with CLAUDE.md alias) + PRD

> **Why AGENTS.md as the canonical file:** AGENTS.md is the tool-agnostic convention read by most AI coding assistants (Cursor, Copilot, Codex, etc.). A thin CLAUDE.md alias keeps Claude Code's auto-discovery without duplicating content.

**Never overwrite** an existing `AGENTS.md` or `CLAUDE.md` without the user's approval — show what would change and ask first.

## Step 1: Read Existing Context and Pick the Path

Before asking anything, check what already exists:
- `AGENTS.md` and `CLAUDE.md` at the project root (AGENTS.md is canonical when both exist; a CLAUDE.md that only contains `@AGENTS.md` is the alias)
- `README.md`, `package.json` / `pyproject.toml` / equivalent, entry points, `PRD.md` or `PRD.draft.md`
- `git ls-files | head -50` — is there real source code?

Pick one path and tell the user which one and why:
- **Existing code** (source files beyond a README) → **Path A** (Step 2).
- **No code yet** (empty repo, only a README or a PRD) → **Path B** (Step 3).

If rules files already exist, say so before continuing: Path A shows `/init`'s suggestions or diff for them and asks; nothing is replaced without approval.

## Step 2 (Path A): Existing Code — Native `/init`

Claude Code's native `/init` analyzes the codebase (commands, architecture, conventions) better than a template. Use it, then move its result to `AGENTS.md`.

1. **Remember the current state.** Read the existing `AGENTS.md` and `CLAUDE.md` (if any) and keep their exact content, so you can show a diff and restore them.
2. **Run `/init`.** Invoke the Skill tool with skill `init` (the native command). Let it finish. It writes or updates `CLAUDE.md` — never `AGENTS.md`.
3. **Classify the result:**
   - **No rules file existed** → `/init` created `CLAUDE.md`. Move its content **into `AGENTS.md`**: keep the sections, change the title to `# [Project Name] — Development Rules`. Then replace `CLAUDE.md` with the alias (Step 4.1). Never leave two rules files with the same content.
   - **Rules files existed and `/init` changed nothing** (with an `AGENTS.md` and the alias it only proposes improvements) → show its **suggestions** to the user and ask which to apply to `AGENTS.md`; apply only the approved ones.
   - **Rules files existed and `/init` edited `CLAUDE.md`** → show the diff against the content you kept and ask for approval. Approved → move the new content into `AGENTS.md` (merge with the existing one, never drop sections) and restore the alias. Declined → restore the original files exactly.
   - **Only a legacy `CLAUDE.md` existed (no `AGENTS.md`)** → offer to migrate: its content becomes `AGENTS.md`, `CLAUDE.md` becomes the alias. Ask first.
4. If `/init` is unavailable or fails, say so and write a short `AGENTS.md` yourself from what Step 1 found (template in Step 3.3), filling the commands from the manifest scripts.

Then continue with **Step 4**.

## Step 3 (Path B): No Code Yet — PRD and Stack

### 3.1 Understand the product

If a PRD exists, read it and extract: product name and description, core features, target users, technology constraints, external integrations. Tell the user: "I found the PRD for [product name]. I'll use it to recommend the stack."

If there is no PRD, ask:
> "I don't see a PRD yet. Tell me about the project — what are you building, who is it for, and what are the main things a user can do with it?"

If the answer is vague, ask **product-focused** follow-ups one at a time (internal or external users? lists or tables of data? login? external services? background work?). **Do not ask technical questions** — infer the needs: "dashboard with a list of orders" → AG Grid + backend API; "users log in with Google" → Firebase Auth + JOSE; "imports a CSV in the background" → Durable Objects; "landing page with a contact form" → frontend only; "charts over time" → Recharts.

### 3.2 Recommend the stack

Evaluate against the **Hopla Default Stack**:

```
Frontend:  TypeScript (strict: false) · React 19 + React Router 7 · Vite · Tailwind CSS 4 + Shadcn UI
           AG Grid Community · React Hook Form + Zod · Lucide React · Vitest · ESLint · Prettier
Backend:   Cloudflare Workers · Hono · D1 (SQLite) · KV · Durable Objects (if needed)
           Firebase (Google Sign-In) + JOSE (if needed)
Package manager: npm      Path alias: @/* -> ./src/*

src/
├── components/   <- shared UI (common/ generic, ui/ Shadcn primitives — do not edit)
├── modules/      <- self-contained feature modules (components, hooks, view)
├── hooks/  lib/  types/  layouts/  pages/
└── main.tsx
worker/src/
├── index.ts      <- worker entry, route registration
├── routes/       <- API route handlers (one file per domain)
├── lib/  types/
```

- **Default covers it** → "Based on [the PRD / what you described], the Hopla default stack covers this project: [stack]. Does this look good?"
- **Needs adjustments** → list additions/removals with the reason (no tables → drop AG Grid; no auth → drop Firebase + JOSE; no backend → drop `worker/`; real-time → Durable Objects; uploads → R2; charts → Recharts; i18n → i18next; libraries the user named).
- **Fundamentally different** (Python backend, mobile app, CLI tool) → ask one topic at a time, waiting for each answer: stack and versions, architecture and naming, code style, testing, development commands.

### 3.3 Write a short `AGENTS.md`

Ask only what is not known yet: project name and description. Then draft a short `AGENTS.md` (well under 100 lines — the code does not exist yet; rules grow with it):

```markdown
# [Project Name] — Development Rules

[One-paragraph description]

## 1. Core Principles
- [3–6 rules, e.g. functional React only; feature modules self-contained under `src/modules/`; Shadcn UI in `src/components/ui/` is not edited; code and comments in English]

## 2. Tech Stack
[Table: tool | version | purpose — the confirmed stack]

## 3. Architecture
[The confirmed tree + 3–5 key rules, e.g. API routes under `/api`, one file per domain; static routes before parameterized ones; prepared statements for D1]

## 4. Code Style
[Naming: components `PascalCase.tsx`, hooks `useCamelCase.ts`, utilities `camelCase.ts`, constants `UPPER_SNAKE_CASE`; named exports]

## 5. Testing
[Framework and run command]

## 6. Development Commands
[dev, build, test, lint, typecheck, format, deploy, migrations]

## 7. Task-Specific Reference Guides
[Filled in Step 4.3, or "None yet"]
```

Then continue with **Step 4**.

## Step 4: Common HOPLA Steps (both paths)

### 4.1 CLAUDE.md alias

`CLAUDE.md` at the project root always has this content:

```markdown
# [Project Name] — Project Rules

The canonical project rules live in [`AGENTS.md`](./AGENTS.md). This file is a thin alias kept for Claude Code's auto-discovery.

@AGENTS.md
```

The `@AGENTS.md` line makes Claude Code inline `AGENTS.md`; other assistants read `AGENTS.md` directly. If a `CLAUDE.md` with other content exists and was not handled in Step 2, ask before replacing it.

### 4.2 `## HOPLA` section (optional)

Ask only if the user wants plans somewhere other than the default `.agents/plans/` (e.g. `docs/plans/`). If so, append to `AGENTS.md` (relative path; backticks if it has spaces):

```markdown
## HOPLA
- Plans: docs/plans/
```

HOPLA skills, hooks and `hopla-claude-setup status` then read and write plans there (`done/` and `backlog/` live under it). Skip the block for the default.

### 4.3 Reference guides (optional)

Ask: "Are there task types that need step-by-step guidance (e.g. adding a page, creating an API route)?" If none, skip — guides can be added later. For each one, create `.agents/guides/[kebab-case-task].md`:

```markdown
# Guide: [Task Type]

## When to Use This Guide
Load this guide when: [exact trigger]

## Architecture Pattern
[Files involved + 2–3 key rules]

## Reference Files
- `[path/to/existing/example]` — [what it demonstrates]

## Step-by-Step Implementation
1. [What to create/modify, naming, pattern]

## Common Pitfalls
- **[Pitfall]:** [what goes wrong and how to avoid it]

## Validation
- [ ] [lint / typecheck / test / format commands]
```

Guides must be concrete and project-specific — ask a follow-up rather than write generic advice. List each guide in `AGENTS.md` section 7:

```markdown
**When adding an API route:**
Read: `.agents/guides/api-route.md`
This guide covers: route setup, queries, auth middleware, response format
```

Project-specific workflows (e.g. a full validation run) belong in project skills under `.claude/skills/<name>/SKILL.md` or in the Development Commands section — not in legacy `.claude/commands/` files.

### 4.4 `.agents/` structure

Create these directories (`.gitkeep` where empty):

```
.agents/
├── plans/               <- /hopla:plan-feature saves here (commit; or the dir declared under `## HOPLA`)
│   ├── done/            <- /hopla:archive moves completed plans here (commit)
│   └── backlog/         <- /hopla:execute Scope Guard defers ideas here (commit)
├── specs/               <- brainstorm skill saves design docs here (commit)
│   ├── canonical/       <- current-behavior specs by domain (commit; filled by /hopla:archive, opt-in)
│   └── archived/        <- /hopla:archive moves completed design specs here (commit)
├── guides/              <- on-demand reference guides (commit)
├── rca/                 <- /hopla:rca saves root cause analyses here (commit)
├── execution-reports/   <- the `execution-report` skill saves here (commit — cross-session learning)
├── system-reviews/      <- /hopla:system-review saves here (commit — feedback loop)
├── audits/              <- reviews worth keeping (commit — copy a code review here to preserve it)
└── code-reviews/        <- the `code-review` skill saves here (do NOT commit — ephemeral)
```

Add to `.gitignore` (create it if missing):

```
.agents/code-reviews/
.agents/hopla-active-plan.json
.claude/compact-snapshot.json
```

Both files are per-machine session state written by HOPLA: the active-plan pointer (kept outside `.claude/`, where Claude Code asks for approval on every write) and the pre-compact snapshot.

## Step 5: Confirm and Save

Show the draft `AGENTS.md` (or the diff, for an existing one) and ask:
> "Does this accurately reflect the project's rules? Any corrections before I save it?"

Once confirmed:
1. Save `AGENTS.md` and the `CLAUDE.md` alias (Step 4.1).
2. Create the `.agents/` structure and any guides.
3. Update `.gitignore`.
4. Next step: no PRD yet → "Project initialized. Run `/hopla:create-prd` to define the product scope, or `/hopla:plan-feature` to plan a feature." PRD exists → "Project initialized. Run `/hopla:plan-feature` to plan the first feature." On Path B, add: "Once there is code, run `/hopla:init-project` again — the native `/init` will propose additions to `AGENTS.md`."
5. Suggest the `git` skill (say "commit") to save everything.
