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
description: "100-150 words. Start with what it does, then 'Use when...' + specific triggers. End with 'Do NOT use for...' anti-triggers."
allowed-tools: Read, Grep, Glob, Bash  # Optional: restrict tools
# Do NOT hardcode `model:` — let skills inherit the user's configured model
---
```

## Writing Effective Descriptions

The description is the MOST CRITICAL field — it determines when the skill activates.

### Pattern
```
[What the skill does]. Use when [trigger phrases, synonyms, variations]. Do NOT use for [anti-triggers].
```

### Good Example
```
"Technical code review on changed files. Use when the user says 'review code', 'code review', 'check my code', 'review changes', 'look for bugs', or 'audit code'. Do NOT use for reviewing plans or documents — only code."
```

### Bad Example
```
"A skill for reviewing things."
```

## Claude Search Optimization (CSO)

Claude uses SEMANTIC matching, not keyword matching. Cover:
- Different phrasings of the same intent
- Multilingual triggers if your team is multilingual
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
