# Plan

> Current behavior of the system. From `hopla-3-3-0` (archived 2026-10-02).

## Requirements

### REQ-PLAN-001: Migration plans carry rollback and cleanup
- Scenario: framework switch — Given the user asks to plan "switch from Express to Hono", When `/hopla:plan-feature` runs, Then the plan has a `## Migration` section with inventory counts and strategy, a rollback and a validation per phase, and a final cleanup phase.
