---
description: Archive a completed plan — fold its requirement deltas into canonical specs and move artifacts to archive locations
argument-hint: "<plan-file-path>"
arguments: [plan]
disable-model-invocation: true
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Close the lifecycle of a completed plan: fold its requirement changes into the canonical specs, move the plan and design files to their archive locations, and leave the project in a clean post-feature state.

> Run **after** `/hopla:execute` has finished, the code-review and execution-report skills have run, and changes are committed (or staged). This command writes no code — it only updates docs and moves files. **Nothing is written before the user answers "yes" in Step 3.**

## Step 0: Locate Inputs

**Plans dir.** Resolve `<plans-dir>` once, first that works:

1. `hopla-claude-setup status --json` → field `plans_dir` (npm install).
2. `node ~/.claude/plugins/marketplaces/hopla-marketplace/cli.js status --json` → `plans_dir`.
3. Manual rule (older CLI without `plans_dir`): in `AGENTS.md`, else `CLAUDE.md`, find the `## HOPLA` section (ignore fenced code blocks) and its first `- Plans: <dir>` line. Reject absolute paths, `..`, `~` or `$` values (warn). Default: `.agents/plans`.

**Plan.** The plan path is `$plan` (e.g. `<plans-dir>/add-auth.md`). If it is empty, list `plans.active` from the same `status --json` output (and `active_plan`, the plan recorded in `.agents/hopla-active-plan.json`, if set), then ask the user which one to archive.

- If the plan is already inside `<plans-dir>/done/` → say it is already archived and stop.
- **Slug** = filename without `.md`. If it ends in `.draft`, drop it and warn ("draft plans were never finalized"). When matching specs, also drop a leading `YYYY-MM-DD-`.

Related artifacts:

| Artifact | Expected path |
|---|---|
| Plan | `$plan` |
| Design spec | from `See spec:` (Step 1), else `.agents/specs/<slug>.md` or `.agents/specs/YYYY-MM-DD-<slug>.md` (latest match), else none |
| Code review | `.agents/code-reviews/<slug>.md` (ephemeral — deleted) |
| Execution report | `.agents/execution-reports/<slug>.md` (kept) |
| System review | `.agents/system-reviews/<slug>-review.md` (kept) |

## Step 1: Build the Requirements Delta

Delta format (in plans and specs):

```markdown
## Requirements Delta
See spec: .agents/specs/2026-01-10-auth.md
Owns: REQ-AUTH-001, REQ-AUTH-002

### ADDED Requirements
- REQ-AUTH-002: 2FA enrollment
  - Scenario: enabling 2FA — Given the user is authenticated, When they enable 2FA, Then ...

### MODIFIED Requirements
- REQ-AUTH-001: User login (full replacement body)
  - Scenario: login with 2FA — Given 2FA is enabled, When the user logs in, Then a code is required

### REMOVED Requirements
- REQ-AUTH-003: SMS-only fallback (deprecated)
```

1. **Plan delta P** = the plan's `## Requirements Delta` section, up to the next `## ` heading.
2. **Spec reference.** Find a line containing `See spec:` followed by a path (tolerate surrounding backticks, a leading `>` or `-`). The path may be in any directory. If the file is missing, warn and fall back to the slug match. No reference → slug-matched spec (table above) or none.
3. **Spec delta D** = the spec's `## Requirements Delta`, read **once**.
4. **Ownership.** `Owns:` (directly under `## Requirements Delta` in the plan) lists spec IDs this plan delivers, comma- or space-separated.
   - Result = P's own bullets + D's entries whose ID is in `Owns:`.
   - D's other IDs → **Skipped (not owned by this plan)**. List them; never merge them.
   - `See spec:` present but no `Owns:` line → list D's IDs and ask "Merge all of these spec requirements? (yes / pick / none)".
   - Spec found only by slug (no `See spec:`) → treat all of D as owned.
5. **Requirement ID** = the leading `REQ-…` token of a top-level bullet, up to the first `:`, space or `(`. A tag like `(E2)` is not part of the ID. The numeric suffix is optional (`REQ-SKILLS-TRIGGERS` is valid).
6. **Merge key** = (section, ID).
   - Same ID, bodies equal after collapsing whitespace → one entry (no double counting).
   - Same ID with different bodies, or in different sections → `⚠ conflict`: show both bodies; the user picks plan / spec / skip.
7. Top-level bullets without a `REQ-` ID → **Unparsed entries (not merged)**. Show them; never drop them silently.

If the result is empty (no delta anywhere) → skip to Step 3 with file moves only.

## Step 2: Map to Canonical Specs

Canonical specs live at `.agents/specs/canonical/<domain>.md`, one file per domain, each requirement under a `### REQ-…` heading. They describe the **current behavior** of the system.

- **Domain** of an ID: the longest hyphen-prefix of its segments that matches an existing canonical file (`REQ-IOS-COS-001` → `ios-cos.md` if it exists), else the first segment (`ios.md`). IDs without a number map by first segment.
- If `.agents/specs/canonical/` does not exist, ask: "No canonical specs directory found. Create `.agents/specs/canonical/` and start it with this change's requirements?" If yes → bootstrap mode: ADDED and MODIFIED entries become initial content; REMOVED entries are ignored.

**Checks (warn, never reject):**
- An ADDED or MODIFIED entry "has a scenario" when some line under it contains `Then` and (`Given` or `When`). Otherwise add `⚠ no scenario: <ID>`.
- MODIFIED without a scenario: also warn "replacing the canonical body drops its existing scenarios — review the diff".
- MODIFIED whose ID is not in the canonical file → treat as ADDED and warn.

## Step 3: Show the Summary and Ask

Build the new canonical content **in memory**: ADDED → append under `## Requirements`; MODIFIED → replace the body of that ID's block; REMOVED → delete the block (heading + body up to the next `### `).

```
## Archive plan: <slug>
Plans dir: <plans-dir> (<source>)
Spec: <path> (via See spec: | slug match | none)

Canonical specs to update:
  .agents/specs/canonical/auth.md
    + ADDED:    REQ-AUTH-002 (2FA enrollment)
    ~ MODIFIED: REQ-AUTH-001 (User login)
    - REMOVED:  REQ-AUTH-003 (SMS-only fallback)

Warnings:            ⚠ no scenario: REQ-AUTH-004
Conflicts:           ⚠ conflict REQ-AUTH-001 — plan body vs spec body (choose: plan / spec / skip)
Skipped (not owned by this plan): REQ-AUTH-009
Unparsed entries (not merged):    - <bullet text>

Files to move:
  <plans-dir>/<slug>.md          → <plans-dir>/done/<slug>.md
  <spec path>                    → .agents/specs/archived/<spec file>   (or "kept: referenced by <other plan>")
  .agents/code-reviews/<slug>.md → DELETE (ephemeral)

Files kept: .agents/execution-reports/<slug>.md, .agents/system-reviews/<slug>-review.md
```

Resolve every conflict and the "merge all?" question first, then ask:
> "Apply these changes? (yes / show diff / cancel)"

- **show diff:** unified diff of each canonical file (before vs after), then ask again.
- **cancel:** stop. Nothing is written.
- **yes:** Step 4.

## Step 4: Apply (only after "yes")

1. Edit each canonical file with the Edit tool, anchored on the `### REQ-…` heading (never overwrite blindly). Create files/dirs in bootstrap mode. Skip IDs the user chose to skip.
2. Move the plan to `<plans-dir>/done/` (create it if missing).
3. Move the spec to `.agents/specs/archived/` **unless** another plan in `<plans-dir>` (not in `done/`) has a `See spec:` line pointing at it — then keep it and say why.
4. Never overwrite an existing destination: ask the user instead.
5. Delete `.agents/code-reviews/<slug>.md` if it exists. Leave execution reports and system reviews untouched.
6. If `.agents/hopla-active-plan.json` exists and its `plan` is the archived plan, delete that file.

## Step 5: Confirm and Suggest Next

```
✅ Archived <slug>
Canonical specs updated: .agents/specs/canonical/auth.md (3 changes)
Moved:   <plans-dir>/<slug>.md → <plans-dir>/done/<slug>.md
         <spec> → .agents/specs/archived/<spec file>
Removed: .agents/code-reviews/<slug>.md
```

Suggest the `git` skill (say "commit") to capture the merged specs, and `/hopla:system-review` to mine the implementation for process improvements.

## Notes

- **No delta anywhere:** Step 4 still runs (file moves only).
- **Reverting:** one-way; restore from git history.
- **Never** run `git commit` or `git push` from this command.
