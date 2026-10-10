# Guard

> Current behavior of the system. From `hopla-4-1-0` (archived 2026-10-10).

## Requirements

### REQ-GUARD-001: The guard asks for requested high-risk actions and denies the never-run ones
- Scenario: merge — Given the guard is installed, When the agent runs `gh pr merge 12`, Then Claude Code shows an approval dialog and the merge runs only if the user approves.
- Scenario: force push — Given the guard is installed, When the agent runs `git push --force`, Then the call is denied in every permission mode.
- Scenario: temp cleanup — Given `T=$(mktemp -d)` earlier in the same command, When it runs `rm -rf $T`, Then the guard does not interfere.
- Scenario: read-only D1 — Given `wrangler d1 execute prod --remote --command "SELECT 1"`, Then the guard does not interfere; with `--command "DELETE FROM t"` it asks.
