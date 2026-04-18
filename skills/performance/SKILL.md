---
name: performance
description: "Measured performance optimization workflow. Use when the user says 'slow', 'optimize', 'performance', 'bottleneck', 'too slow', 'high memory', 'high CPU', 'lento', 'tarda mucho', or when asking to make something faster. Do NOT use for correctness bugs or new features — use the debug or plan-feature skills instead."
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

# Performance: Measure Before You Change

## Iron Rule

**No optimization without a measurement.** Every performance change must start with a number (latency, memory, query count) and end with a comparison. Guessing at hot paths wastes time and often makes things slower.

## Step 1: Clarify the Symptom

Ask the user (one question at a time):

- What operation feels slow? (page load, API request, build, test run, specific query)
- How slow is it? (exact number if possible — "3 seconds", "30 MB", "10s with 100 items")
- What is "fast enough"? (target: < 500 ms p95, < 100 MB, etc.)
- Is it reproducible, or only under load?

Without a concrete target, you cannot declare the optimization done.

## Step 2: Measure the Baseline

Pick the right tool for the symptom:

| Symptom | Measurement |
|---|---|
| Slow endpoint | `curl -w "%{time_total}"` or APM dashboard (see `guides/mcp-integration.md` for MCP options) |
| Slow DB query | `EXPLAIN ANALYZE` (Postgres), `EXPLAIN` (SQLite/MySQL) |
| Slow frontend render | Chrome DevTools Performance tab, React Profiler |
| Memory growth | `process.memoryUsage()` snapshots, heap dumps |
| Slow build/test | Time the command, compare against a clean cache |

Record the baseline with units. "3.2 s to load /dashboard with 1000 items" — not "it feels slow".

## Step 3: Identify the Hot Path

Rank suspects by where the baseline measurement actually spends its time:

- **N+1 queries** — are there loops calling the DB or an API?
- **Missing indexes** — does `EXPLAIN ANALYZE` show a seq scan on a large table?
- **Synchronous I/O** — is there a blocking call that could be awaited in parallel (`Promise.all`)?
- **Rendering** — are components re-rendering with unchanged props? Are lists virtualized?
- **Algorithm** — is there an O(n²) that could be O(n) with a map?
- **Caching** — is the same computation repeated without memoization?

Do **not** guess. Use the profiler output or query plan to pick one suspect.

## Step 4: Apply One Change

Change one thing. Not three.

- Add the index
- Replace the loop with `Promise.all`
- Memoize the expensive selector
- Batch the API calls
- Virtualize the list

Keep the diff minimal so you can attribute the delta to this change alone.

## Step 5: Measure Again

Re-run the exact same measurement from Step 2 under the same conditions. Report:

- Baseline: X
- After change: Y
- Delta: (X − Y) / X × 100 %
- Target: [target from Step 1]

If you did not hit the target, go back to Step 3 and pick the next suspect. If you regressed, revert and rethink.

## Step 6: Regression Guard

Once the target is met, add a guard so future changes do not erode the win:

- A test with a timeout assertion (e.g. `expect(duration).toBeLessThan(500)`)
- A query count assertion (e.g. `expect(dbQueries).toHaveLength(1)`)
- A bundle size budget, memory budget, or frame budget if applicable

Without a guard, the win decays.

## Rules

- One suspect at a time — never stack optimizations before measuring
- Keep the baseline in the commit message so the win is auditable
- If the fix adds significant complexity for a small win (< 10 %), consider reverting
- Do not optimize code that is not actually hot — premature optimization hurts readability

## Integration

- Use the `code-review` skill checklist section 3 (Performance Problems) for patterns to watch for
- If the optimization requires architectural changes, stop and run `/hopla:plan-feature`
- After the change lands, the `verify` skill will require the regression guard to run fresh

## Next Step

After the target is met and a regression guard is in place:

> "Target hit: [baseline → result]. Regression guard added. Say 'commit' to trigger the `git` skill with a `perf:` conventional commit."
