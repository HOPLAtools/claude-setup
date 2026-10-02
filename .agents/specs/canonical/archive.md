# Archive

> Current behavior of the system. Started from `hopla-2-2` (archived 2026-10-02).

## Requirements

### REQ-ARCHIVE-001: Archive merges the plan's Requirements Delta
- Scenario: plan-only feature — Given a completed plan with a `## Requirements Delta` and no design spec, When the user runs `/hopla:archive <plan>`, Then the delta's requirements are proposed for merge into `.agents/specs/canonical/<domain>.md`.

### REQ-ARCHIVE-002: Archive warns on missing scenarios
- Scenario: requirement without scenario — Given an ADDED requirement with no Given/When/Then line, When archive builds the merge summary, Then it shows a warning for that ID and still allows approval.

### REQ-ARCHIVE-003: Archive honors the project's plans directory
- Scenario: docs/plans project — Given an `AGENTS.md` that declares `docs/plans/` as the plans directory, When archive or `cli.js status` looks for plans, Then it lists and archives plans from `docs/plans/` into `docs/plans/done/`.

### REQ-ARCHIVE-004: Archive merges only owned spec requirements
- Scenario: shared spec — Given a plan with `See spec:` and `Owns: REQ-A-001`, and a spec defining REQ-A-001 and REQ-A-002, When the user runs `/hopla:archive <plan>`, Then only REQ-A-001 is proposed, REQ-A-002 is listed as skipped, and the spec is not moved while another active plan references it.
