---
description: Internal guide for authoring new skills in this plugin — SKILL.md frontmatter (description, when_to_use, forks, arguments), naming, organization.
---

# Writing Skills Guide (Internal)

## When to Use This Guide
Reference this guide when creating new skills for the HOPLA system.

## Skill Structure

```
skill-name/
├── SKILL.md              (< 500 lines, main instructions)
├── scripts/              (executable code — only output consumes tokens)
├── references/           (detailed docs, loaded on-demand)
└── assets/               (templates, data files)
```

## SKILL.md Format

```yaml
---
name: skill-name
description: "What it does and its main use case, first ~200 chars (max 1,024)."
when_to_use: "Use when [trigger phrases, synonyms]. Do NOT use for [anti-triggers]."
allowed-tools: Read, Grep, Glob, Bash  # Optional: pre-approves tools (does not restrict them)
# Only for isolated, non-interactive skills — all four together:
# context: fork
# agent: hopla:<agent-name>   # always plugin-scoped; a bare name silently falls back to general-purpose
# model: haiku | sonnet
# background: false           # the invoking turn waits for the result
---
```

Rules (enforced by `tests/frontmatter.test.js`):

- `description` + `when_to_use` ≤ 1,536 chars combined (project target ≤ 600). One line each, double-quoted, no inner `"` or backslash. English only.
- `model` appears **only** with `context: fork`. Skills in the main conversation inherit the session model — switching models mid-session loses the prompt cache.
- A forked skill cannot see the conversation and cannot ask the user anything: keep forks for self-contained work (orientation, audits, reviews) and make the body return a self-contained final answer.
- Commands that must never start on their own (long-running or file-moving) use `disable-model-invocation: true`; Claude then asks the user to run them.
- Arguments: declare `arguments: [plan, report]` and use `$plan` / `$report`. Never `$1`: positional placeholders are 0-based. Free text goes through `$ARGUMENTS` (named arguments split on whitespace).
- `triggers:` is not supported — put trigger phrases in `when_to_use`.
- Put critical rules at the top of SKILL.md: after compaction only the first 5,000 tokens of an invoked skill are re-injected. Rules that must always hold belong in a hook, not in prose.

## Writing Effective Descriptions

The description is the MOST CRITICAL field — it determines when the skill activates.

### Pattern
```
description: [What the skill does — main use case first].
when_to_use: Use when [trigger phrases, synonyms, variations]. Do NOT use for [anti-triggers].
```

### Good Example
```
description: "Technical code review on changed files, focused on finding real bugs and issues."
when_to_use: "Use when the user says 'review code', 'code review', 'check my code', 'review changes', 'look for bugs', or 'audit code'. Do NOT use for reviewing plans or documents — only code."
```

### Bad Example
```
"A skill for reviewing things."
```

## Claude Search Optimization (CSO)

Claude uses SEMANTIC matching, not keyword matching. Cover:
- Different phrasings of the same intent
- Language-agnostic phrasing (the plugin is used internationally; keep frontmatter in English)
- Common misspellings or abbreviations
- Related verbs and nouns

## Testing Skills

Before shipping a new skill:
1. **Pressure test**: Does it activate when it should?
2. **Negative test**: Does it NOT activate when it shouldn't?
3. **Conflict test**: Does it conflict with existing skills?
4. **Content test**: Are the instructions clear enough for the agent to follow?

## Rationalization Tables

For skills that enforce discipline (like TDD or verification), include a table of common excuses:

| Rationalization | Counter |
|----------------|---------|
| "I'll do it later" | No. Do it now. Later means never. |
| "This is too simple" | Simple things grow complex. Document intent. |

## Progressive Disclosure

Keep SKILL.md under 500 lines. If you need more:
- Put detailed reference material in `references/` subdirectory
- Put executable logic in `scripts/` subdirectory
- In SKILL.md, reference them: "When doing X, read references/x-guide.md"

Scripts are better than docs when possible — only the OUTPUT consumes tokens, not the script source.
