---
description: Guide for creating a project-specific code review checklist (.agents/guides/review-checklist.md) consumed by the code-review skill.
---

# Guide: Creating a Project-Specific Review Checklist

Use this guide to create a `.agents/guides/review-checklist.md` file in your project with code review checks specific to your tech stack, domain, and known anti-patterns. The the `code-review` skill command loads this file automatically when it exists, applying your custom checks alongside the standard review categories.

---

## When to Create This

Create a review checklist when:
- The same bug pattern appears in **2+ code reviews** (e.g., stale closures in grid callbacks)
- Your project uses a framework with non-obvious gotchas (AG Grid, Hono, Prisma, D3, etc.)
- A `/hopla:system-review` flags a recurring issue that should be caught during code review
- A the `execution-report` skill documents a new technical pattern in its "Technical Patterns Discovered" section

---

## File Location

```
your-project/
└── .agents/
    └── guides/
        └── review-checklist.md    ← Create this file
```

---

## Template

Use this structure for your project's review checklist:

```markdown
# Project Review Checklist

## Framework-Specific Checks

### [Framework Name, e.g., AG Grid]
- [ ] Cell editors and callbacks use `useRef` for state, not inline closures (prevents stale closure bugs)
- [ ] New grid instances include `data-ag-theme-mode` attribute
- [ ] Custom renderers set `cellDataType: false` to prevent auto-detection overrides
- [ ] `refreshCells` is called for computed columns when dependencies change

### [Framework Name, e.g., Hono]
- [ ] Static routes (`/users/all`) are defined BEFORE parameterized routes (`/users/:id`)
- [ ] All endpoints have input validation (required fields, format, limits)
- [ ] DELETE routes are ordered correctly (specific before generic)

## Domain-Specific Checks

- [ ] [Check description — patterns unique to your business domain]
- [ ] [Check description]

## Known Anti-Patterns

Patterns that have caused bugs in this project before:

| Anti-Pattern | What to Look For | Correct Pattern |
|---|---|---|
| Stale closure in grid callback | Inline function passed to `onCellValueChanged` | Use `useRef` + stable callback via `useCallback` |
| Route shadowing | Static route after `/:id` route | Define static routes first |
| Missing IMEI validation | IMEI field accepts any string | Validate exactly 15 digits |
| Side effect in JSX render | `array.push()` inside `.map()` | Compute before return, use `useMemo` |
```

---

## Maintenance

Update this file when:
- `/hopla:system-review` flags a recurring bug pattern (3+ occurrences across reviews)
- the `execution-report` skill discovers a new technical pattern in "Technical Patterns Discovered"
- A code review finds a bug that should have been caught by a checklist item
- A framework is upgraded and known gotchas change

Keep the checklist focused — remove items once they become second nature to the team or are enforced by linting rules.
