# Skills

> Current behavior of the system. From `hopla-3-0-0` (archived 2026-10-02).

## Requirements

### REQ-SKILLS-001: Commands and guides are skills with unchanged invocation names
- Scenario: command moved — Given HOPLA 3.0.0 is installed, When the user runs `/hopla:system-review plan.md report.md`, Then the skill runs with `$plan` = `plan.md` and `$report` = `report.md`.
- Scenario: guide moved — Given HOPLA 3.0.0 is installed, When the user runs `/hopla:guides:validation-pyramid`, Then the validation-pyramid guide loads.
