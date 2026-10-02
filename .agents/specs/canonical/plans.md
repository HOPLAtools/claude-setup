# Plans

> Current behavior of the system. Started from `hopla-2-2` (archived 2026-10-02).

## Requirements

### REQ-PLANS-001: Active plan pointer
- The plan in progress and its step are recorded in `.agents/hopla-active-plan.json` (git-ignored). Without a valid pointer, the active plan is the newest non-draft `*.md` in the plans dir by mtime that has an `## Implementation Tasks` or `### Task` heading (notes files are skipped).
- Scenario: execution in progress — Given `/hopla:execute docs/plans/x.md` finished task 2 of 5, When a new session starts or the conversation is compacted, Then the context shows `docs/plans/x.md` with step "Task 3", and after compaction it says to re-read the plan.
- Scenario: notes file — Given no pointer and a notes file without task headings newer than the real plan, When a session starts, Then the context shows the real plan, not the notes file.
