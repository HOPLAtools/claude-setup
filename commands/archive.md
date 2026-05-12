---
description: Archive a completed plan — fold its delta-specs into canonical specs and move artifacts to archive locations
argument-hint: "<plan-file-path>"
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Close the lifecycle of a completed plan: fold its proposed requirement changes into the canonical specs, move the plan and design files to their archive locations, and leave the project in a clean post-feature state.

> Use this command **after** `/hopla:execute` has finished, code-review and execution-report skills have run, and changes are committed (or staged for the merge commit). The command does not write code — it only updates docs and moves files.

## Step 0: Locate Inputs

The first argument `$1` should be the path to the completed plan (e.g. `.agents/plans/add-auth.md`). If the user did not pass a path:

1. Run `node ~/.claude/plugins/marketplaces/hopla-marketplace/cli.js status` — or `claude-setup status` if installed via npm — to list active plans.
2. Ask the user which one to archive.

Derive the **feature slug** from the filename (e.g. `add-auth.md` → `add-auth`).

Then look for related artifacts:

| Artifact | Expected path |
|---|---|
| Plan | `$1` (e.g. `.agents/plans/add-auth.md`) |
| Design spec | `.agents/specs/<slug>.md` or `.agents/specs/YYYY-MM-DD-<slug>.md` (latest match) |
| Code review | `.agents/code-reviews/<slug>.md` (ephemeral — do NOT preserve) |
| Execution report | `.agents/execution-reports/<slug>.md` (preserve) |
| System review | `.agents/system-reviews/<slug>-review.md` (preserve) |

If the design spec is missing, that's OK — many features start from `/hopla:plan-feature` directly without a brainstorm step. Skip the spec-merge phase.

## Step 1: Read the Spec's Requirements Delta (if any)

If a design spec exists at `.agents/specs/<slug>.md`, read it and look for a `## Requirements Delta` section with subsections:

```markdown
## Requirements Delta

### ADDED Requirements
- REQ-AUTH-002: 2FA enrollment
  - Scenario: enabling 2FA — Given the user is authenticated, When they enable 2FA, Then ...

### MODIFIED Requirements
- REQ-AUTH-001: User login (replaces previous version)
  - Now includes 2FA challenge step when the account has 2FA enabled.

### REMOVED Requirements
- REQ-AUTH-003: SMS-only fallback (deprecated)
```

If no `## Requirements Delta` section exists, the spec is informational only — skip to Step 4 (archive moves).

## Step 2: Locate Canonical Specs

Canonical specs live at `.agents/specs/canonical/<domain>.md` (one file per domain — e.g. `auth.md`, `payments.md`, `ui.md`). They represent the **current behavior of the system**.

For each ADDED / MODIFIED / REMOVED requirement, determine which canonical file it belongs to. The domain is usually inferable from the requirement ID prefix (`REQ-AUTH-*` → `auth.md`) or from the project's directory structure.

If `.agents/specs/canonical/` does not exist:
- Ask the user: "No canonical specs directory found. Should I create `.agents/specs/canonical/` and start it with the requirements from this change?"
- If yes, create `.agents/specs/canonical/<domain>.md` for each domain touched and treat ALL requirements from this change as initial content (no merge needed — bootstrap mode).

## Step 3: Propose the Merge Diff (human approval required)

For each affected canonical file, build the proposed new content **in memory**:

- For each entry under `### ADDED Requirements` → append the requirement (with its scenarios) to the canonical file under `## Requirements`.
- For each entry under `### MODIFIED Requirements` → find the requirement by ID in the canonical file and **replace** its body with the new version. If the ID is not found, treat as ADDED and warn the user.
- For each entry under `### REMOVED Requirements` → find the requirement by ID and **delete** its block (heading + body until the next `### ` heading or end of section).

Show the user a summary:

```
## Archive plan: <slug>

Canonical specs to update:
  .agents/specs/canonical/auth.md
    + ADDED:    REQ-AUTH-002 (2FA enrollment)
    ~ MODIFIED: REQ-AUTH-001 (User login — now requires 2FA step)
    - REMOVED:  REQ-AUTH-003 (SMS-only fallback)

Files to move:
  .agents/plans/<slug>.md             → .agents/plans/done/<slug>.md
  .agents/specs/<slug>.md             → .agents/specs/archived/<slug>.md
  .agents/code-reviews/<slug>.md      → DELETE (ephemeral)

Files to keep in place:
  .agents/execution-reports/<slug>.md
  .agents/system-reviews/<slug>-review.md
```

Then ask:
> "Apply these changes? (yes / show diff / cancel)"

- **show diff:** print a unified diff of each canonical file (before vs after) so the user can review the exact merge before approval.
- **cancel:** abort with no changes.
- **yes:** proceed to Step 4.

## Step 4: Apply the Changes

Only after explicit `yes`:

1. Write each updated canonical spec file via the Edit tool. Never overwrite blindly — always anchor on the requirement ID heading.
2. Move (or copy + delete) the plan: `.agents/plans/<slug>.md` → `.agents/plans/done/<slug>.md`. If `.agents/plans/done/` does not exist, create it.
3. If a design spec exists, move `.agents/specs/<slug>.md` → `.agents/specs/archived/<slug>.md`. Create `archived/` if missing.
4. Delete the ephemeral code review at `.agents/code-reviews/<slug>.md` (if it exists). Per project policy, code reviews are working state and not committed.
5. Leave `execution-reports/` and `system-reviews/` untouched — they are part of the cross-session learning loop.

## Step 5: Confirm and Suggest Next

Print a final summary:

```
✅ Archived <slug>

Canonical specs updated:
  - .agents/specs/canonical/auth.md (3 changes)

Files moved:
  - plans/<slug>.md → plans/done/<slug>.md
  - specs/<slug>.md → specs/archived/<slug>.md

Files removed:
  - code-reviews/<slug>.md (ephemeral)
```

Suggest:
> "Archive complete. The canonical specs now reflect this change. Consider running the `git` skill (say 'commit') to capture the merged specs, and `/hopla:system-review` if you want to mine this implementation for process improvements."

## Notes & Edge Cases

- **No spec, no Requirements Delta:** Step 4 still runs (file moves) but no canonical specs are updated. This is the common case for tactical fixes that do not change documented requirements.
- **Canonical bootstrap:** if `.agents/specs/canonical/` is empty, this command may be the first to populate it. Use the change's specs as initial content (treat all ADDED entries as initial requirements, ignore MODIFIED/REMOVED — there is nothing to modify).
- **Conflicting modifications:** if the same REQ-* ID is modified by two parallel plans, the later archive wins. Surface this in the diff with a `⚠ conflict` marker so the user can reconcile manually before approving.
- **Reverting an archive:** this command is one-way. To revert, restore from git history (`git restore`).
- **Do not auto-commit:** per global rules, never run `git commit` or `git push` from this command. After archiving, suggest the `git` skill.
