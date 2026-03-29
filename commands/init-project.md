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

## Step 2: Understand the Product

Check if a `PRD.md` or `PRD.draft.md` exists in the project root.

### Path A — PRD exists (recommended flow)

If a PRD is found, read it and extract:
- Product name and description
- Core features and capabilities
- Target users and usage patterns
- Technology preferences or constraints mentioned
- External integrations or services

Tell the user:
> "I found the PRD for [product name]. I'll use it to recommend the right stack for this project."

Then skip directly to **Step 3** (Recommend Stack).

### Path B — No PRD found

Ask the user:
> "I don't see a PRD yet. Tell me about the project — what are you building? What does it do, who is it for, and what are the main things a user can do with it?"

Wait for the answer. If the description is too short or vague, ask **product-focused** follow-up questions like:
- "Who uses this — is it internal for your team, or for external customers?"
- "What's the main thing a user does when they open the app?"
- "Does it work with lists or tables of data? Like orders, products, users..."
- "Do users need to log in? Can anyone sign up, or is it invite-only?"
- "Does it need to talk to any external services or APIs?"
- "Is there anything that runs in the background — imports, syncs, notifications?"

**Do NOT ask technical questions.** The user describes the product; you infer the technical needs. For example:
- "dashboard with a list of orders" → needs AG Grid, backend API
- "users log in with Google" → needs Firebase Auth + JOSE
- "imports a CSV and processes it in the background" → needs Durable Objects
- "simple landing page with a contact form" → frontend only, no backend needed
- "shows charts and trends over time" → needs Recharts

Then proceed to **Step 3**.

## Step 3: Recommend Stack

Based on the PRD or the user's description, evaluate against the **Hopla Default Stack** and present a recommendation.

### Hopla Default Stack (baseline)

```
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

### How to present the recommendation

**If the default stack covers everything:**
> "Based on [the PRD / what you described], the Hopla default stack covers this project well. Here's what we'll use: [show stack]. Does this look good, or do you want to adjust anything?"

**If the default stack needs additions or removals:**
> "The default stack covers most of it, but based on your needs I'd recommend these changes: [list additions/removals with reasoning]. Here's the adjusted stack: [show modified stack]. Does this look good?"

Examples of adjustments:
- Project doesn't need data tables → remove AG Grid
- Project doesn't need auth → remove Firebase + JOSE
- Project doesn't need a backend → remove worker/, Hono, D1, KV, DO
- Project needs real-time/WebSockets → add Durable Objects
- Project needs file uploads → note Cloudflare R2
- Project needs charts → add Recharts
- Project needs i18n → add i18next + react-i18next
- Project needs a specific library the user mentioned → add it

**If the project is fundamentally different from the default** (e.g. Python backend, mobile app, CLI tool):
> "This project doesn't fit the default stack. Let me ask a few questions to define the right stack for it."
Then proceed to the full conversational discovery (Step 3.1).

### Step 3.1: Full Conversational Discovery (only if default doesn't fit)

Ask one topic at a time. Wait for each answer before continuing.

**Topic A — Tech Stack**
- What languages, frameworks, and key libraries?
- What versions matter?
- What package manager?

**Topic B — Architecture**
- How is the project structured?
- What are the main layers or modules?
- Naming conventions for files and folders?

**Topic C — Code Style**
- Naming conventions? TypeScript strict mode?
- Linting/formatting tools?

**Topic D — Testing**
- Framework? Structure? Naming?

**Topic E — Development Commands**
- Dev server? Tests? Lint/format? Other key commands?

**Topic F — Reference Guides**
- Specific task types that need step-by-step guidance?

## Step 4: Collect Project Info

Once the stack is confirmed, ask only what's NOT already known from the PRD or conversation:

1. **Project name** — skip if already in PRD
2. **Project description** — skip if already in PRD
3. **Reference Guides** (optional) — Are there specific task types that need step-by-step guidance? (e.g. "When adding a page", "When creating an API route"). If none, skip — guides can always be added later.

## Step 5: Generate CLAUDE.md

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

## Step 5.5: Generate Reference Guides

For each task type identified (in Step 4 or Step 3.1), create a guide at `.agents/guides/[kebab-case-task-name].md`.

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

## Step 6: Create .agents/ Structure

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

## Step 7: Create .claude/commands/ (optional but recommended)

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

## Step 8: Confirm and Save

Show the draft `CLAUDE.md` to the user and ask:
> "Does this accurately reflect the project's rules? Any corrections before I save it?"

Once confirmed:
1. Save `CLAUDE.md` to the project root
2. Create `.agents/` directory structure
3. Update `.gitignore`
4. If no PRD exists yet, tell the user: "Project initialized. Run `/hopla-create-prd` next to define the product scope, or `/hopla-plan-feature` to start planning a feature."
   If a PRD already exists, tell the user: "Project initialized. Run `/hopla-plan-feature` to start planning the first feature."
5. Suggest running `/hopla-git-commit` to save everything
