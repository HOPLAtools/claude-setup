---
name: migration
description: "Phased migration workflow for upgrading dependencies, switching frameworks, or moving between systems. Use when the user says 'migrate', 'upgrade', 'switch from X to Y', 'move to', 'replace library', 'major version bump', 'deprecated', or when changing a framework/runtime/database version. Do NOT use for greenfield features or small refactors — use plan-feature or refactoring instead."
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

# Migration: Move Systems Without Breaking Them

## Iron Rule

**Every migration needs a rollback plan before the first line changes.** If you cannot describe how to undo the migration in one sentence, you are not ready to start it.

## Step 1: Classify the Migration

Ask the user (one question at a time):

- **Type**: dependency upgrade (major version), framework switch (e.g. Express → Hono), runtime switch (Node → Bun), data store (SQLite → Postgres), API version (v1 → v2)
- **Scope**: one module, one service, or the whole codebase?
- **Downtime tolerance**: blue/green, zero-downtime (dual-run), acceptable window?
- **Deadline driver**: deprecation, security, performance, or opportunistic?

This framing determines whether the work is a single PR or a multi-phase plan.

## Step 2: Audit the Surface

Map **everything** that will be affected:

- Imports / usages of the old API (use `grep -r` or `rg` across the codebase)
- Public contracts that depend on current behavior (downstream callers, API consumers)
- Build / deploy steps tied to the current version
- Test suites that assume old behavior
- Documentation mentioning the old API

Write the inventory to `.agents/specs/migration-<topic>.md` with counts — "47 import sites across 12 files". Numbers help you size the work honestly.

## Step 3: Read the Upgrade Notes

Before writing code, read the target's official migration guide / changelog end to end. Note:

- **Breaking changes** (renamed APIs, removed APIs, default-behavior flips)
- **Deprecations** (will break in N+2, not now)
- **Required minimum versions** for peer dependencies
- **Data-shape changes** that require a migration script

If the target project has no migration guide, treat it as higher risk and budget more time for exploration.

## Step 4: Choose a Strategy

| Strategy | When to use |
|---|---|
| **Big bang** | Small codebase, low downstream coupling, clean cut possible |
| **Incremental with adapter** | Many call sites — introduce a thin wrapper that presents the old API on top of the new, migrate call sites one by one |
| **Dual-run (strangler fig)** | High-risk or zero-downtime — run both old and new side by side, shift traffic gradually |
| **Branch by abstraction** | Internal refactor + external API stays stable — hide the switch behind an interface |

Pick one and document the trade-off in the spec file.

## Step 5: Plan the Phases

For anything non-trivial, run `/hopla:plan-feature` with `migration-<topic>` as the feature name. The plan should specify:

- **Phase boundaries** (compatibility shim in, call sites migrated, shim removed)
- **Rollback plan per phase** (revert commit? feature flag? dual-write?)
- **Validation at each phase** (test suite green, feature flags covered, canary metrics)
- **Data migration script** (if the storage layer changes) — idempotent, resumable

Each phase should land as its own PR.

## Step 6: Migrate With Guardrails

Execute phase by phase. After every phase:

- Run the full validation pyramid (`commands/guides/validation-pyramid.md`)
- Check for mixed-version pitfalls — modules importing both the old and new API in the same request
- Confirm the rollback path still works (git revert + redeploy, or feature flag off)

Never advance to the next phase if validation failed on the previous one.

## Step 7: Remove the Old Path

Once every call site is migrated and observed green in production (where applicable):

- Delete the compatibility shim
- Remove the old dependency (`npm uninstall`, etc.)
- Remove the feature flag
- Update documentation to reference only the new path

This "cleanup" step is part of the migration. A migration left half-done with a permanent shim is worse than no migration.

## Rules

- Never migrate on a Friday or before a public release
- Keep the rollback plan alive at every phase — if it stops working, pause
- Track breaking changes from the target's changelog in the spec, not in memory
- Data migrations must be idempotent and resumable — migrations fail mid-run
- If the migration drags past its original estimate by 2x, stop and reassess scope

## Integration

- Use `/hopla:plan-feature` to generate the phased plan from the Step 2 inventory
- Use the `worktree` skill to keep the migration isolated from other work
- The `code-review` skill (checklist sections 2 and 5) catches dual-import patterns and pattern drift
- The `performance` skill verifies the migration did not regress hot paths

## Next Step

Once the migration is planned:

> "Migration classified and inventoried. Saved spec to `.agents/specs/migration-<topic>.md`. Run `/hopla:plan-feature` to generate the phased implementation plan."
