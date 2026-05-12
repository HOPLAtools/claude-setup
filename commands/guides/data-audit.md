---
description: Reference for auditing existing data sources (schema, value semantics, null cases, derived value propagation) before implementing data-consuming features.
---

# Guide: Data Audit and Value Semantics

Use this guide when a feature reads from, calculates with, or references existing data or code patterns. Applies during planning (full audit) and execution (verification of documented findings).

---

## 1. Data Model Audit

When a feature reads from existing tables or APIs, audit ALL field variants — not just the happy path:

- **Nullability:** Can values be null? What does null mean in context? (e.g., null might indicate a formula, a default, or a computed value — not simply "empty")
- **Multiple representations:** Are there alternative forms of the same concept? (e.g., direct value vs expression vs derived value)
- **Resolution chain:** What is the complete lookup chain? (e.g., primary source → fallback → default)

Document every variant found: what each means and when it occurs.

---

## 2. Value Semantics Verification

When a feature involves calculations with stored amounts, **do not assume** — verify by reading the display/formatter code in existing modules that already consume this data.

Check:
- Are values signed or unsigned?
- Are they absolute amounts, deltas, or percentages?
- What is the sign convention? A field named "amount" could be positive-means-add **or** positive-means-subtract depending on domain convention.

**How to verify:** Find a module that already displays or formats these values. Read it completely. Use it as ground truth for the formula.

---

## 3. Working Reference Pattern

When using a framework-specific pattern (custom editors, middleware, event handlers, streaming, etc.):

- Do not list a file as "reference" without reading it
- Find a **proven working implementation** of the EXACT pattern needed
- Read it completely and extract: API calls, prop types, data flow, lifecycle assumptions
- Document this extracted pattern in the plan's task details — not as a vague "Pattern: see file X"

---

## 4. Derived Value Propagation

If any value is calculated from other fields, specify:
- The exact formula including how stored values are interpreted (sign, units, semantics)
- How derived values propagate when inputs change (event system, reactivity, polling, etc.)

---

## Responsibilities by Role

| Role | Responsibility |
|------|---------------|
| **Planner** | Runs the full audit. Documents all findings in the plan's **Context References** and **Gotchas** fields. |
| **Executor** | Verifies that the planner's findings still hold — confirms files exist, patterns match, fields haven't changed. Does NOT re-audit from scratch. |

If the executor finds a discrepancy between the plan's documented findings and reality, they stop and file a Blocker Report (see `hopla-execute.md`).
