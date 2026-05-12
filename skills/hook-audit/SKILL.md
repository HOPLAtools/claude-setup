---
name: hook-audit
description: "Static audit of new React hooks against documented bug-class catalog (memoization, stale-id guards, error-match strictness, cache+dedup integrity). Use after creating any file matching `src/hooks/use*.ts` and BEFORE commit. Trigger words: 'audit hook', 'check hook', 'hook review'. Auto-callable from execute skill's Level 1.5 gate."
allowed-tools: Read, Grep, Glob, Bash
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Mechanical static audit of React hook files (`src/hooks/use*.ts`) against the four recurring bug classes catalogued in `checklist.md` (same directory). This skill is FAST (<5s per file) and structural — it does not interpret intent. For semantic / interpretive review, use `code-review` instead.

**When to invoke:**
- Right after creating or significantly modifying a `src/hooks/use*.ts` file
- BEFORE committing the hook
- Auto-callable from `commands/execute.md` Level 1.5 gate (companion plan: `plan-feature-04c-improvements.md`)

## Step 1: Identify Target File(s)

Two modes:

1. **Single-file mode** — argument provided:
   ```bash
   /hopla:hook-audit src/hooks/useFoo.ts
   ```
   Treat the argument as a single path. If the file does not exist, exit with `File not found: <path>`.

2. **Auto-detect mode** — no argument:
   ```bash
   git diff --name-only HEAD | grep -E '^src/hooks/use[A-Z][A-Za-z0-9_]*\.ts$'
   ```
   Collect the matching files. If the result is empty:
   ```bash
   git ls-files --others --exclude-standard | grep -E '^src/hooks/use[A-Z][A-Za-z0-9_]*\.ts$'
   ```
   to pick up new untracked hook files. If both are empty, exit cleanly with `No hook files to audit.`

Scope is strict: only `src/hooks/use*.ts`. Files matching `src/lib/use*` or `electron/use*` are NOT audited (see Out of Scope in the plan).

## Step 2: Load the Checklist

Read `checklist.md` in this skill's directory. It documents each rule with:
- Rule code (P-5 / S-8 / E-1 / D-1)
- Severity
- Detection pattern (regex or grep command)
- Fix suggestion (with code example)
- Canonical reference (file from consumer-project history)

## Step 3: Apply Each Rule

For each target file, run the detection command for every rule (see `checklist.md` for the exact commands). Collect findings.

Detection commands must be portable across BSD grep (macOS) and GNU grep (Linux). Use `grep -E` for ERE syntax. Avoid GNU-only flags (`-P`, `-z`).

Each finding records:
- File path
- Line number (use `grep -nE` to get line numbers)
- Rule code
- One-line description
- Fix suggestion (from `checklist.md`)
- Canonical reference

## Step 4: Output Report

Group findings by file. Format per finding:

```
[severity] [rule-code] file:line — description
  Fix: suggestion
  Reference: canonical-file.ts (commit-hash)
```

End with a one-line summary:
```
N issues found across M files. K rules clean.
```

If no issues found, exit with exactly:
```
Hook audit clean — 4 rules checked.
```

**Gate output budget:** When invoked from `execute.md` Level 1.5 gate, the report must be under 50 lines. If more than 5 issues per file, show a count + the top 3 findings with detail; collapse the rest as `+N more (same rule)`.

## Step 5: Exit Code

This skill is markdown — it does not exit directly. When the calling agent invokes the skill from `execute.md`'s gate (via Bash), the calling Bash invocation should:
- Exit `0` when the summary line shows `Hook audit clean`
- Exit `1` when any issues are reported

The gate (defined in `plan-feature-04c-improvements.md`) decides whether to fail the commit or merely warn based on severity. This skill's job is to REPORT — not to enforce.

## Example Output

**Clean run** (0 issues):
```
$ /hopla:hook-audit src/hooks/useGradingDefinitions.ts
Hook audit clean — 4 rules checked.
```

**3-issue run:**
```
$ /hopla:hook-audit src/hooks/useFooLookup.ts

[high]   [P-5] src/hooks/useFooLookup.ts:142 — Hook returns object literal without useMemo
  Fix: Wrap the return in useMemo({ ... }, [field1, field2, ...])
  Reference: useGradingDefinitions.ts:123-127

[high]   [S-8] src/hooks/useFooLookup.ts:88 — `setLoading(false)` inside stale-id guard
  Fix: Move setLoading(false) out of `if (currentFooRef.current === foo)` block in the finally
  Reference: useSickwLookup.ts (commit 228cd6a)

[medium] [E-1] src/hooks/useFooLookup.ts:101 — Error matching uses substring `.includes('imei')`
  Fix: Replace with exact match or anchored regex (`/^imei[: ]/`)
  Reference: useImeiInOtherShipment.ts post-fix

3 issues found across 1 file. 1 rule clean (D-1).
```

## Source Incidents

This skill exists because the same four bug classes recurred across consumer projects. Each rule in `checklist.md` cites the canonical fixed sibling.

| Occurrence | File | Rule(s) | Fix commit |
|---|---|---|---|
| 1 | PhoneTest `useSickwLookup` | S-8 | 228cd6a |
| 2 | PhoneTest `useIfreeicloudLookup` | S-8 | 06cc692 |
| 3 | ifreeicloud-library `useIfreeicloudLookup` (second pass) | P-5, S-8 | — |
| 4 | 04c `useImeiInOtherShipment`, `useActiveShipment` | P-5, S-8, E-1 | 952cab1 |

Recurrence count = motivation for a dedicated mechanical pre-flight skill, separate from the broader `code-review`.

## Next Step

After the audit, the calling agent (execute, or the user via slash command) should:
- If clean: proceed to commit.
- If issues found: fix per the suggestions, then re-run this skill until clean. For larger refactors, escalate to `code-review` for full semantic review.
