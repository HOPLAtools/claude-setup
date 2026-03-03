---
description: Initialize a new project with a CLAUDE.md and .agents/ structure
---

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
- For each task type: what patterns should the AI always follow?

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

## Step 5: Confirm and Save

Show the draft `CLAUDE.md` to the user and ask:
> "Does this accurately reflect the project's rules? Any corrections before I save it?"

Once confirmed:
1. Save `CLAUDE.md` to the project root
2. Create `.agents/` directory structure
3. Update `.gitignore`
4. Tell the user: "Project initialized. Run `/hopla-create-prd` next to define the product scope, or `/hopla-plan-feature` to start planning a feature."
5. Suggest running `/hopla-commit` to save everything
