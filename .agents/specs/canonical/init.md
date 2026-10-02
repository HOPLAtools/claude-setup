# Init

> Current behavior of the system. From `hopla-3-3-0` (archived 2026-10-02).

## Requirements

### REQ-INIT-001: init-project builds on the native /init
- Scenario: existing codebase — Given a repo with code and no rules files, When the user runs `/hopla:init-project`, Then the native `/init` analyzes it, its content ends up in `AGENTS.md`, `CLAUDE.md` is the `@AGENTS.md` alias, and `.agents/` exists.
- Scenario: already initialized — Given `AGENTS.md` and the alias exist, When the user runs `/hopla:init-project`, Then neither file is overwritten and only missing HOPLA parts are added after approval.
