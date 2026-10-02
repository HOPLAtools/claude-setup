# TypeScript check

> Current behavior of the system. Started from `hopla-2-2` (archived 2026-10-02).

## Requirements

### REQ-TSC-001: Type check once per turn on the nearest tsconfig
- Scenario: monorepo — Given a session in the repo root and `apps/api/tsconfig.json`, When Claude edits `apps/api/src/a.ts` three times in one turn and tsc reports 50 errors, Then tsc runs once at the end of the turn and Claude sees the first 30 errors, "50 errors" and the path of the full log in `/tmp`.
- Scenario: loop guard — Given the Stop check already blocked twice in the turn (or the error set is unchanged since the last block), When Claude tries to stop again, Then the hook lets it stop.
- Scenario: errors elsewhere — Given Claude edited only `src/a.ts` this turn and tsc reports 2 errors in `src/a.ts` and 5 in `src/b.ts`, When the turn ends, Then the hook blocks showing the 2 errors of `src/a.ts` plus "5 errors in other files (not edited this turn), see log"; and if `src/a.ts` has no errors, the turn ends and the user only sees a one-line notice about the 5.
