# Plan: Fix Git Flow Documentation and Versioning

## Overview
The system prescribes Git Flow (with develop branch) to all users via global-rules.md, but many projects — including this one — use GitHub Flow (main + feature branches, no develop). This creates confusion when execute.md says "never run on main" but the project has no other option. Additionally, the publish guide is incomplete (mentions 1 of 3 version files), tags are missing for recent releases, and global-rules.md still references deleted commands.

## Requirements Summary
- Update global-rules.md to support both workflows: Git Flow (with develop) and GitHub Flow (main-only)
- Update execute.md Step 2 to handle main-only projects (suggest feature branch from main)
- Update pr.md Step 2 to explicitly handle projects without develop/dev
- Fix publish-npm.md to reference all 3 version files
- Create missing git tags for v1.11.2, v1.11.3, v1.12.0, v1.12.1
- Update global-rules.md command references (git-commit and git-pr were removed as commands)

## Out of Scope
- Adding CI/CD automation (GitHub Actions)
- Changing the actual branching model of any specific project
- Adding automated version bump tooling to cli.js

## Likely Follow-ups
- Adding a `--tag` flag to cli.js that creates a git tag after publish
- Creating a GitHub Actions workflow for automated releases
- Adding a version sync check hook that validates all 3 files match

## Git Strategy
- **Base branch:** `main`
- **Feature branch:** `feature/fix-gitflow-docs` (separate from the system-audit-v2 branch)

## Context References
Key files the executing agent must read before starting:
- `global-rules.md` — 135 lines, the global rules template installed to ~/.claude/CLAUDE.md. Section 4 (Git Workflow) needs rewrite, Section "Available HOPLA Commands" needs update
- `commands/execute.md` — Step 2 Branch check (lines 68-79) needs main-only fallback
- `skills/git/pr.md` — Step 2 (lines 20-38) needs main-only fallback
- `.agents/guides/publish-npm.md` — 64 lines, incomplete publish guide (only mentions package.json)
- `CLAUDE.md` — project rules, documents 3-file version bump requirement

## Implementation Tasks

> All fields are required. Use `N/A` if a field does not apply — never leave a field blank.

### Task 1: Rewrite Git Workflow section in global-rules.md

- **Action:** modify
- **File:** `global-rules.md`
- **Pattern:** N/A
- **Details:**
  Replace Section 4 "Git Workflow (Git Flow)" (lines 46-80) with a version that supports both workflows:

  ```markdown
  ## 4. Git Workflow

  ### Branch Strategy

  Detect which model the project uses by checking if a `develop` or `dev` branch exists (`git branch -r`):

  **GitHub Flow (main-only — no develop/dev branch):**
  - `main` → primary branch, always deployable
  - Feature branches: `feature/short-description` → created from `main`, merged back via PR
  - Bug fix branches: `fix/short-description` → created from `main`
  - Hotfix branches: `hotfix/short-description` → created from `main` (for urgent production fixes)
  - All PRs target `main`

  **Git Flow (with develop branch):**
  - `main` → production releases only, never commit directly
  - `develop` / `dev` → active development branch
  - Feature branches: `feature/short-description` → created from `develop`, merged back via PR
  - Bug fix branches: `fix/short-description` → created from `develop`
  - Hotfix branches: `hotfix/short-description` → created from `main`, merged to both `main` and `develop`
  - Feature/fix PRs target `develop`; hotfix PRs target `main`

  **Auto-detection:** When creating branches or PRs, check which branches exist remotely. If only `origin/main` exists, use GitHub Flow. If `origin/develop` or `origin/dev` exists, use Git Flow.
  ```

  Keep the rest of Section 4 unchanged (Commit Format, When to Suggest a Commit).

- **Gotcha:** This file is installed to `~/.claude/CLAUDE.md` for ALL users via the CLI channel. Every word matters. The plugin channel cannot install this file, so plugin-only users won't see it.
- **Validate:** Read global-rules.md Section 4 and confirm both GitHub Flow and Git Flow are documented with auto-detection logic.

### Task 2: Update command references in global-rules.md

- **Action:** modify
- **File:** `global-rules.md`
- **Pattern:** N/A
- **Details:**
  In the "Available HOPLA Commands" section (lines 119-134), the workflow list references `/hopla-git-commit` and `/hopla-git-pr` which were deleted as commands in system-audit-v2. Replace lines 127-128:

  From:
  ```markdown
  5. `/hopla-git-commit` — Create conventional commit
  6. `/hopla-git-pr` — Create GitHub PR
  ```

  To:
  ```markdown
  5. `git` skill — Say "commit" or "create PR" to trigger automatically
  ```

  Also renumber the list (it was 1-6, now 1-5).

- **Gotcha:** This must align with the README changes from system-audit-v2. Verify the README no longer lists git-commit/git-pr as commands.
- **Validate:** Read the "Available HOPLA Commands" section and confirm no references to `/hopla-git-commit` or `/hopla-git-pr`.

### Task 3: Add main-only fallback to execute.md Step 2

- **Action:** modify
- **File:** `commands/execute.md`
- **Pattern:** N/A
- **Details:**
  In Step 2 "Branch check" (line 70-75), replace the current logic:

  ```markdown
  Check that the current branch follows Git Flow:
  - **Never execute on `main` or `master`** — stop and warn the user
  - **If on `develop`/`dev`** — ask: "You're on `develop`. Should I create a feature branch first? (recommended: `feature/[plan-name]`)"
  - **If on a `feature/`, `fix/`, or `hotfix/` branch** — proceed
  ```

  With:

  ```markdown
  Check the current branch and determine the appropriate action:
  - **If on a `feature/`, `fix/`, or `hotfix/` branch** — proceed
  - **If on `develop`/`dev`** — ask: "You're on `develop`. Should I create a feature branch first? (recommended: `feature/[plan-name]`)"
  - **If on `main` or `master`** — check if `develop`/`dev` exists:
    - If `develop`/`dev` exists: warn "You're on `main` but `develop` exists. Switch to `develop` first, or create a feature branch from `main` if this is a hotfix."
    - If NO `develop`/`dev` exists (GitHub Flow project): ask "You're on `main` (no develop branch detected). Should I create a feature branch? (recommended: `feature/[plan-name]`)"
  ```

- **Gotcha:** The order matters — check feature branches FIRST (most common case, proceed immediately), then develop, then main. This avoids unnecessary prompts.
- **Validate:** Read Step 2 and confirm the main-only fallback exists with the develop existence check.

### Task 4: Add main-only fallback to pr.md Step 2

- **Action:** modify
- **File:** `skills/git/pr.md`
- **Pattern:** N/A
- **Details:**
  In Step 2 "Determine Base Branch" (lines 20-38), after the table and the "To resolve develop vs dev" line, replace the resolution logic:

  From:
  ```markdown
  To resolve `develop` vs `dev`: run `git branch -r` and look for `origin/develop` or `origin/dev`. Use whichever exists.
  ```

  To:
  ```markdown
  To resolve the base branch:
  1. Run `git branch -r` to check which branches exist remotely
  2. If `origin/develop` exists → use `develop`
  3. Else if `origin/dev` exists → use `dev`
  4. Else if only `origin/main` exists (GitHub Flow project) → use `main` for `feature/*` and `fix/*` branches
  5. If none match → ask the user
  ```

  Also update the guard rails — change:
  ```markdown
  - If the branch name doesn't match any Git Flow prefix → ask the user: "I can't determine the base branch from `[branch]`. Should this PR target `develop` or `main`?"
  ```

  To:
  ```markdown
  - If the branch name doesn't match any known prefix → ask the user: "I can't determine the base branch from `[branch]`. Should this PR target `main`?"
  ```

- **Gotcha:** The table above this section still shows `feature/*` → `develop or dev`. That's correct as a default, but the resolution logic now handles the fallback to main. Don't modify the table.
- **Validate:** Read Step 2 and confirm the 5-step resolution logic exists.

### Task 5: Fix publish-npm.md guide

- **Action:** modify
- **File:** `.agents/guides/publish-npm.md`
- **Pattern:** N/A
- **Details:**
  1. Replace Step 2 (lines 17-23) with:

     ```markdown
     ### 2. Bump the version in ALL THREE files

     Follow semver:
     - **patch** (1.2.x) — bug fixes, content updates to commands or skills
     - **minor** (1.x.0) — new commands, new skills, new CLI features
     - **major** (x.0.0) — breaking changes to install structure or command/skill names

     Edit `"version"` in **all three files** (they must stay in sync):
     1. `package.json` — npm metadata
     2. `.claude-plugin/plugin.json` — Claude Code plugin manifest
     3. `.claude-plugin/marketplace.json` — marketplace definition

     Verify sync:
     ```bash
     grep '"version"' package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json
     ```
     ```

  2. Update Step 4 (lines 33-35) to stage all 3 files:

     From:
     ```markdown
     ```bash
     git add package.json
     git commit -m "chore: bump version to x.x.x"
     ```
     ```

     To:
     ```markdown
     ```bash
     git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json
     git commit -m "chore: bump version to x.x.x"
     ```
     ```

  3. Add a new Step 5.5 after "Publish to npm" (before "Verify the publish"):

     ```markdown
     ### 6. Tag the release

     ```bash
     git tag -a v[x.x.x] -m "Release [x.x.x]"
     git push origin v[x.x.x]
     ```
     ```

     Renumber subsequent steps accordingly.

  4. Add to "Common Pitfalls":

     ```markdown
     - **Forgetting to bump all 3 files:** Plugin users won't see the update if `plugin.json` or `marketplace.json` are out of sync
     - **Forgetting to tag:** Tags enable rollback and version history. Always tag after publish.
     ```

- **Gotcha:** The guide still references `files/CLAUDE.md` in the semver description (line 19: "content updates to commands or `files/CLAUDE.md`"). This path is obsolete — it should say "commands or skills". Fix this as part of Step 2 replacement.
- **Validate:** Read the file and confirm: Step 2 mentions all 3 files with grep command, Step 4 stages all 3 files, tagging step exists, common pitfalls updated.

### Task 6: Create missing git tags

- **Action:** create (tags)
- **File:** N/A (git operations)
- **Pattern:** N/A
- **Details:**
  Create annotated tags for the 4 missing versions:

  ```bash
  git tag -a v1.11.2 fe15d69 -m "Release 1.11.2 — fix Spanish bias in global rules"
  git tag -a v1.11.3 5d7efdc -m "Release 1.11.3 — fix marketplace.json version"
  git tag -a v1.12.0 c1324c1 -m "Release 1.12.0 — remove hopla- prefix from skills and commands"
  git tag -a v1.12.1 3b3fd83 -m "Release 1.12.1"
  ```

  Do NOT push the tags yet — let the user decide when to push.

- **Gotcha:** These tags point to commits on `main`, not the feature branch. This is correct — tags mark releases, not in-progress work. The user should push tags separately: `git push origin --tags`
- **Validate:** Run `git tag --sort=creatordate | tail -5` and confirm v1.11.2, v1.11.3, v1.12.0, v1.12.1 appear.

## Interaction Matrix

N/A — no interactive UI.

## Test Tasks

> This project has no automated tests. Validate manually:

### Manual Test 1: Verify CLI installs updated global-rules
- Run `node cli.js --force`
- Read `~/.claude/CLAUDE.md` and confirm Section 4 shows both GitHub Flow and Git Flow
- Confirm no references to `/hopla-git-commit` or `/hopla-git-pr`

### Manual Test 2: Verify publish guide is complete
- Read `.agents/guides/publish-npm.md` and confirm all 3 version files are mentioned
- Confirm tagging step exists

## Validation Checklist

Run in this order — do not proceed if a level fails:

- [ ] **Level 1 — Lint & Format:** N/A (Markdown files)
- [ ] **Level 2 — Type Check:** N/A (no code changes)
- [ ] **Level 2.5 — Code Review:** Run `/hopla-code-review` on changed files
- [ ] **Level 3 — Unit Tests:** N/A
- [ ] **Level 4 — Integration Tests:** `node cli.js --force` — verify install succeeds
- [ ] **Level 5 — Human Review:** Read each modified file end-to-end

## Acceptance Criteria
- [ ] `global-rules.md` Section 4 documents both GitHub Flow and Git Flow with auto-detection
- [ ] `global-rules.md` "Available HOPLA Commands" has no references to `/hopla-git-commit` or `/hopla-git-pr`
- [ ] `commands/execute.md` Step 2 handles main-only projects (checks for develop existence before warning)
- [ ] `skills/git/pr.md` Step 2 has 5-step resolution logic including main-only fallback
- [ ] `.agents/guides/publish-npm.md` mentions all 3 version files, has tagging step, updated pitfalls
- [ ] Git tags v1.11.2, v1.11.3, v1.12.0, v1.12.1 exist locally
- [ ] `node cli.js --force` installs without errors

## Confidence Score: 9/10

- **Strengths:** All files are Markdown (easy to edit). Changes are well-scoped — 5 file modifications + 4 git tags. The auto-detection approach (check if develop exists) is simple and deterministic.
- **Uncertainties:** The global-rules.md change affects ALL users. Some users may have projects that rely on the current strict "never commit to main" wording.
- **Mitigations:** The new wording preserves the "never commit directly" rule for Git Flow projects while adding explicit support for GitHub Flow. Both modes are clearly documented.

## Notes for Executing Agent
- `global-rules.md` is a TEMPLATE installed to users' `~/.claude/CLAUDE.md` — it is NOT this project's own rules. Handle with care.
- The git tag commands (Task 6) should be run but tags should NOT be pushed without user approval.
- This plan should be executed on a SEPARATE branch from `feature/system-audit-v2`. The system-audit-v2 changes should be committed first, then this plan runs on a new branch.
- Total files modified: 5. Git tags created: 4.
