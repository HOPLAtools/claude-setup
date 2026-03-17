---
description: Initialize a new project with a CLAUDE.md and .agents/ structure
---

> **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Set up the Layer 1 planning foundation for this project: a project-specific `CLAUDE.md` with rules and architecture decisions, plus the `.agents/` directory structure.

> Layer 1 = Global Rules (~/.claude/CLAUDE.md) + Project Rules (CLAUDE.md) + PRD

## Step 1: Read Existing Context

Before asking anything, check what already exists:
- Any existing `CLAUDE.md` at project root
- `README.md` — extract stack and project overview
- `package.json`, `pyproject.toml`, or equivalent — extract stack and scripts
- Entry point files (`main.py`, `src/main.ts`, `app.py`, etc.)

If a `CLAUDE.md` already exists at the project root, tell the user and ask if they want to update it or start fresh.

## Step 2: Default Stack or Custom

Present the **Hopla Default Stack** to the user:

```
Hopla Default Stack:

Frontend:
- Language:        TypeScript (strict: false)
- UI Framework:    React 19 + React Router 7
- Bundler:         Vite
- Styling:         Tailwind CSS 4 + Shadcn UI
- Data Tables:     AG Grid Community
- Forms:           React Hook Form + Zod
- Icons:           Lucide React
- Testing:         Vitest
- Linting:         ESLint
- Formatting:      Prettier

Backend:
- Runtime:         Cloudflare Workers
- Routing:         Hono
- Database:        Cloudflare D1 (SQLite)
- Cache:           Cloudflare KV
- Stateful Logic:  Cloudflare Durable Objects (if needed)
- Auth:            Firebase (Google Sign-In) + JOSE (if needed)

Package manager:   npm
Path alias:        @/* -> ./src/*

Architecture:
src/
├── components/        <- shared UI components
│   ├── common/        <- generic reusable components
│   └── ui/            <- Shadcn primitives (do not edit)
├── modules/           <- self-contained feature modules
│   └── [feature]/     <- components, hooks, view per feature
├── hooks/             <- shared hooks
├── lib/               <- utilities and helpers
├── types/             <- shared TypeScript types
├── layouts/           <- sidebar, topbar, app shell
├── pages/             <- page-level components
└── main.tsx           <- entry point
worker/
├── src/
│   ├── index.ts       <- worker entry point, route registration
│   ├── routes/        <- API route handlers (one file per domain)
│   ├── lib/           <- backend utilities, auth, business logic
│   └── types/         <- backend type definitions
```

Ask the user:
> "This is the Hopla default stack. Do you want to use it as-is, or would you prefer to customize it?"

**Option A — Use default:** Skip directly to Step 2.1 (ask only project name and any reference guides), then proceed to Step 3.

**Option B — Customize:** Proceed to Step 2.2 (full conversational discovery).

### Step 2.1: Quick Setup (Default Stack)

Ask only these minimal questions:

1. **Project name** — What should I call this project?
2. **Project description** — One-line summary of what this project does.
3. **Reference Guides** (optional) — Are there specific task types that need step-by-step guidance? (e.g. "When adding a page", "When creating an API route"). If none, skip this — guides can always be added later.

Then proceed to Step 3 using the default stack values for all other fields.

### Step 2.2: Custom Setup (Conversational Discovery)

Ask one topic at a time. Wait for each answer before continuing. For each topic, show the default value so the user can just confirm or override.

**Topic A — Tech Stack** (default: TypeScript, React 19, Vite, Tailwind CSS 4, Shadcn UI, npm)
- What languages, frameworks, and key libraries does this project use?
- What versions matter? (e.g. Python 3.12, FastAPI 0.118, React 19)
- What package manager? (npm, bun, uv, pip, etc.)

**Topic B — Architecture** (default: modules-based under src/ + worker/)
- How is the project structured? (e.g. layered, vertical slices, feature-based)
- What are the main layers or modules? (e.g. routes -> services -> models)
- Are there naming conventions for files and folders?

**Topic C — Code Style** (default: ESLint + Prettier, TypeScript strict: false)
- Any strict naming conventions? (e.g. verbose fields like `product_id`, snake_case, camelCase)
- TypeScript strict mode?
- Linting/formatting tools and configs? (ESLint, Biome, Prettier, Ruff)

**Topic D — Testing** (default: Vitest)
- Testing framework? (vitest, jest, pytest)
- Test structure? (colocated, mirrors source, separate folder)
- Any naming conventions for tests?

**Topic E — Development Commands** (default: Vite + Wrangler scripts)
- How do you run the dev server?
- How do you run tests?
- How do you lint/format?
- Any other key commands the AI should know?

**Topic F — Reference Guides**
- Are there specific task types that need extra guidance?
  (e.g. "When adding an API endpoint", "When creating a React component")
- For each task type identified: what are the exact steps? What files to follow as pattern? What pitfalls to avoid?

Collect enough detail to write a full guide for each task type — not just the name, but the actual patterns, file structure, and constraints.

## Step 3: Generate CLAUDE.md

Save to `CLAUDE.md` at the project root. Use this structure:

**For default stack projects**, use these pre-filled values:

```markdown
# [Project Name] — Development Rules

## 1. Core Principles

- Functional React only — hooks, no class components
- Feature modules are self-contained under `src/modules/`
- Shadcn UI components in `src/components/ui/` are NOT to be edited
- Code and comments in English, user-facing strings can be localized
- Always run `npm run format` after making code changes

---

## 2. Tech Stack

### Frontend

| Tool | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.x | Type safety (strict: false) |
| React Router | v7 | Client-side routing |
| Vite | 7.x | Build tool + dev server |
| Tailwind CSS | 4.x | Styling |
| Shadcn UI + Radix | — | Accessible component primitives |
| AG Grid Community | 35.x | Data tables and grids |
| React Hook Form + Zod | — | Form handling and validation |
| Lucide React | — | Icons (always use Lucide) |
| Vitest | — | Unit testing |

### Backend

| Tool | Version | Purpose |
|---|---|---|
| Cloudflare Workers | — | Serverless runtime |
| Cloudflare D1 | — | SQLite on the edge (database) |
| Cloudflare KV | — | Key-value cache layer |
| Cloudflare Durable Objects | — | Stateful long-running logic (if needed) |
| Hono | 4.x | HTTP routing framework |
| Firebase + JOSE | — | Authentication, Google Sign-In (if needed) |

---

## 3. Architecture

```
src/
├── components/        <- shared UI components
│   ├── common/        <- generic reusable components
│   └── ui/            <- Shadcn primitives (do not edit)
├── modules/           <- self-contained feature modules
│   └── [feature]/     <- components, hooks, view per feature
├── hooks/             <- shared hooks
├── lib/               <- utilities and helpers (api, firebase, utils)
├── types/             <- shared TypeScript types (index.ts)
├── layouts/           <- sidebar, topbar, app shell
├── pages/             <- page-level components (login, 404)
├── App.tsx            <- root router
├── main.tsx           <- entry point
└── index.css          <- global styles
worker/
├── src/
│   ├── index.ts       <- worker entry, route registration
│   ├── routes/        <- API route handlers (one file per domain)
│   ├── lib/           <- backend utilities, auth, business logic
│   └── types/         <- backend type definitions
├── wrangler.jsonc     <- Cloudflare Workers config
└── migrations/        <- D1 SQLite migrations (numbered, sequential)
```

Key rules:
- Feature modules in `src/modules/` are self-contained with their own components and hooks
- Shared hooks go in `src/hooks/`, feature-specific ones stay in the module
- All data tables use AG Grid Community — Shadcn UI for everything else
- All icons use Lucide React — no other icon libraries
- All API routes are under `/api`, organized by domain in `worker/src/routes/`
- Backend uses prepared statements for D1 queries
- Durable Objects for stateful long-running operations (if needed)

---

## 4. Code Style

### TypeScript
- strict: false
- Path alias: `@/*` maps to `./src/*`
- Interfaces for object shapes, types for unions/intersections
- Named exports preferred

### React
- Functional components only
- Props defined as interface above the component
- File name matches component name: `UserCard.tsx` exports `UserCard`

### Naming
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Types/Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Route files: `kebab-case.ts`

### Backend (Hono)
- One route file per domain in `worker/src/routes/`
- Register static routes BEFORE parameterized routes
- Use prepared statements for D1 queries
- Auth middleware on protected routes

---

## 5. Testing

- **Framework:** Vitest
- **Run:** `npm run test` (vitest run)

---

## 6. Development Commands

```bash
npm run dev              # Vite frontend dev server
npm run dev:worker       # Wrangler worker only
npm run dev:full         # Both frontend and worker concurrently
npm run build            # Production build
npm run deploy           # Deploy to Cloudflare Workers
npm run db:migrate       # Apply pending D1 migrations (local)
npm run db:migrate:remote # Apply pending D1 migrations (production)
npm run typecheck        # TypeScript type checking (tsc -b --noEmit)
npm run lint             # ESLint
npm run format           # Prettier formatting
npm run test             # Vitest unit tests
```

---

## 7. Task-Specific Reference Guides

[For each task type:]
**When to use:** [Trigger condition]
Read: `.agents/guides/[guide-name].md`
This guide covers: [bullet list]
```

**For custom stack projects**, fill in the values collected during Step 2.2 following the same structure.

## Step 3.5: Generate Reference Guides

For each task type identified (in Step 2.1 or Topic F), create a guide at `.agents/guides/[kebab-case-task-name].md`.

Use this template for every guide:

```markdown
# Guide: [Task Type Name]

## When to Use This Guide

Load this guide when: [exact trigger condition, e.g. "adding a new API route", "creating a React component"]

---

## Architecture Pattern

[Describe the layer structure for this task type. e.g.:]

```
src/modules/[feature]/components/[Component].tsx
src/modules/[feature]/hooks/use[Hook].ts
worker/src/routes/[domain].ts
```

Key rules:
- [Rule 1: e.g. "All business logic goes in hooks or backend services, never in components"]
- [Rule 2: e.g. "Use prepared statements for all D1 queries"]
- [Rule 3: e.g. "Register static routes before parameterized routes"]

---

## Reference Files

Follow these existing implementations as pattern:
- `[path/to/existing/example.ts]` — [what it demonstrates]
- `[path/to/existing/example.ts]` — [what it demonstrates]

---

## Step-by-Step Implementation

### 1. [First step]
- [What to create/modify]
- [Exact naming convention]
- [Code pattern to follow]

### 2. [Second step]
- [What to create/modify]
- [Key constraints]

### 3. [Third step]
[Continue for all steps...]

---

## Code Examples

### [Filename pattern, e.g. worker/src/routes/products.ts]
```[language]
// Example showing the exact pattern to follow
[concrete code snippet]
```

### [Next file pattern]
```[language]
[concrete code snippet]
```

---

## Common Pitfalls

- **[Pitfall 1]:** [What goes wrong and how to avoid it]
- **[Pitfall 2]:** [What goes wrong and how to avoid it]

---

## Validation

After implementing, verify:
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run format`
- [ ] [Manual check if applicable]
```

**Important:** Guides must contain concrete, project-specific information — not generic advice. If the user's answers don't have enough detail for a section, ask a follow-up before writing the guide.

Also update the `CLAUDE.md` Section 7 (Task-Specific Reference Guides) to reference each guide created:

```markdown
## 7. Task-Specific Reference Guides

**When adding an API route:**
Read: `.agents/guides/api-route.md`
This guide covers: Hono route setup, D1 queries, auth middleware, response format

**When creating a feature module:**
Read: `.agents/guides/feature-module.md`
This guide covers: module structure, components, hooks, routing
```

## Step 4: Create .agents/ Structure

Create the following directories (with `.gitkeep` where needed):

```
.agents/
├── plans/          <- /hopla-plan-feature saves here (commit these)
├── guides/         <- on-demand reference guides (commit these)
├── execution-reports/   <- /hopla-execution-report saves here (do NOT commit)
├── code-reviews/        <- /hopla-code-review saves here (do NOT commit)
└── system-reviews/      <- /hopla-system-review saves here (do NOT commit)
```

Add to `.gitignore` (create if it doesn't exist):
```
.agents/execution-reports/
.agents/code-reviews/
.agents/system-reviews/
```

## Step 5: Create .claude/commands/ (optional but recommended)

Create `.claude/commands/` at the project root for project-specific commands that override or extend the global ones.

**`validate.md`** — runs the full validation sequence for this project:

For default stack:
```markdown
---
description: Run full validation for this project
---
Run in order, stop if any level fails:
1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run format`
```

For custom stack, use the commands collected during discovery.

Ask the user: "Do you want me to create a project-specific `/validate` command?"

If yes, create `.claude/commands/validate.md`.

## Step 6: Confirm and Save

Show the draft `CLAUDE.md` to the user and ask:
> "Does this accurately reflect the project's rules? Any corrections before I save it?"

Once confirmed:
1. Save `CLAUDE.md` to the project root
2. Create `.agents/` directory structure
3. Update `.gitignore`
4. Tell the user: "Project initialized. Run `/hopla-create-prd` next to define the product scope, or `/hopla-plan-feature` to start planning a feature."
5. Suggest running `/hopla-git-commit` to save everything
