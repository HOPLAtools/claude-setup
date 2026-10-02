# Command arguments

> Current behavior of the system. Started from `hopla-2-2` (archived 2026-10-02).

## Requirements

### REQ-ARGS-001: Commands receive arguments by name
- Scenario: two arguments — Given `/hopla:system-review plan.md report.md`, When the command renders, Then `$plan` is `plan.md` and `$report` is `report.md`.
