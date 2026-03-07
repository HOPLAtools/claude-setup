---
description: Initialize a new project with a CLAUDE.md and .agents/ structure
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Set up the Layer 1 planning foundation for this project: a project-specific `CLAUDE.md` with rules and architecture decisions, plus the `.agents/` directory structure.

> Layer 1 = Global Rules (~/.claude/CLAUDE.md) + Project Rules (CLAUDE.md) + PRD

## Step 1: Read Existing Context

Before asking anything, check what already exists:
- Any existing `CLAUDE.md` at project root
- `README.md` — extract stack and project overview
- `package.json`, `pyproject.toml`, or equivalent — extract stack and scripts
- Entry point files (`main.py`, `src/main.ts`, `app.py`, etc.)

If a `CLAUDE.md` already exists at the project root, tell the user and ask if they want to update it or start fresh.

## Step 2: Conversational Discovery

Ask one topic at a time. Wait for each answer before continuing.

**Topic A — Tech Stack**
- What languages, frameworks, and key libraries does this project use?
- What versions matter? (e.g. Python 3.12, FastAPI 0.118, React 19)
- What package manager? (npm, bun, uv, pip, etc.)

**Topic B — Architecture**
- How is the project structured? (e.g. layered, vertical slices, feature-based)
- What are the main layers or modules? (e.g. routes → services → models)
- Are there naming conventions for files and folders?

**Topic C — Code Style**
- Any strict naming conventions? (e.g. verbose fields like `product_id`, snake_case, camelCase)
- TypeScript strict mode? Pydantic validation?
- Linting/formatting tools and configs? (Ruff, ESLint, Biome, Prettier)

**Topic D — Testing**
- Testing framework? (pytest, vitest, jest)
- Test structure? (mirrors source, separate folder, colocated)
- Any naming conventions for tests?

**Topic E — Development Commands**
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

```markdown
# [Project Name] — Development Rules

## 1. Core Principles

[3-5 non-negotiable rules for this codebase, e.g. naming conventions, logging, type safety]

---

## 2. Tech Stack

[List technologies with versions]

---

## 3. Architecture

[Describe the layer structure, file organization, and key patterns]

---

## 4. Code Style

### [Language/Layer]
[Naming conventions, formatting rules, with short code examples]

---

## 5. Testing

[Framework, structure, naming conventions, how to run]

---

## 6. Development Commands

```bash
[command]  # description
```

---

## 7. Task-Specific Reference Guides

[For each task type:]
**When to use:** [Trigger condition]
Read: `.agents/guides/[guide-name].md`
This guide covers: [bullet list]
```

## Step 3.5: Generate Reference Guides

For each task type identified in Topic F, create a guide at `.agents/guides/[kebab-case-task-name].md`.

Use this template for every guide:

```markdown
# Guide: [Task Type Name]

## When to Use This Guide

Load this guide when: [exact trigger condition, e.g. "adding a new API endpoint", "creating a React component"]

---

## Architecture Pattern

[Describe the layer structure for this task type. e.g.:]

```
Request → router/[resource].ts → service/[resource]Service.ts → model/[Resource].ts → DB
```

Key rules:
- [Rule 1: e.g. "All business logic goes in the service layer, never in the router"]
- [Rule 2: e.g. "Always validate input with Zod before passing to service"]
- [Rule 3: e.g. "Return typed responses, never raw DB objects"]

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

### [Filename pattern, e.g. router/products.ts]
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
- [ ] `[exact lint/type check command]`
- [ ] `[exact test command]`
- [ ] [Manual check: e.g. "curl the endpoint and confirm response shape"]
```

**Important:** Guides must contain concrete, project-specific information — not generic advice. If the user's answers in Topic F don't have enough detail for a section, ask a follow-up before writing the guide.

Also update the `CLAUDE.md` Section 7 (Task-Specific Reference Guides) to reference each guide created:

```markdown
## 7. Task-Specific Reference Guides

**When adding an API endpoint:**
Read: `.agents/guides/api-endpoint.md`
This guide covers: router structure, service layer pattern, Zod validation, response types

**When creating a React component:**
Read: `.agents/guides/react-component.md`
This guide covers: file structure, props typing, hook usage, test co-location
```

## Step 4: Create .agents/ Structure

Create the following directories (with `.gitkeep` where needed):

```
.agents/
├── plans/          ← /hopla-plan-feature saves here (commit these)
├── guides/         ← on-demand reference guides (commit these)
├── execution-reports/   ← /hopla-execution-report saves here (do NOT commit)
├── code-reviews/        ← /hopla-code-review saves here (do NOT commit)
└── system-reviews/      ← /hopla-system-review saves here (do NOT commit)
```

Add to `.gitignore` (create if it doesn't exist):
```
.agents/execution-reports/
.agents/code-reviews/
.agents/system-reviews/
```

## Step 5: Create .claude/commands/ (optional but recommended)

Create `.claude/commands/` at the project root for project-specific commands that override or extend the global ones.

Common project-specific commands to create:

**`validate.md`** — runs the full validation sequence for this project:
```markdown
---
description: Run full validation for this project
---
Run in order, stop if any level fails:
1. `[lint command]`
2. `[type check command]`
3. `[test command]`
```

Ask the user: "Do you want me to create a project-specific `/validate` command with the commands from your stack?"

If yes, create `.claude/commands/validate.md` using the dev commands collected in Topic E.

## Step 6: Confirm and Save

Show the draft `CLAUDE.md` to the user and ask:
> "Does this accurately reflect the project's rules? Any corrections before I save it?"

Once confirmed:
1. Save `CLAUDE.md` to the project root
2. Create `.agents/` directory structure
3. Update `.gitignore`
4. Tell the user: "Project initialized. Run `/hopla-create-prd` next to define the product scope, or `/hopla-plan-feature` to start planning a feature."
5. Suggest running `/hopla-git-commit` to save everything
