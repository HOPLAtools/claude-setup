# Tests

Unit and integration tests for `@hopla/claude-setup`, written with Node's built-in [`node:test`](https://nodejs.org/api/test.html) runner — no external dependencies.

## Running

```bash
# Run everything
npm test

# Run a single file
node --test tests/cli.test.js

# Run only files matching a pattern
node --test tests/hooks/*.test.js
```

## Layout

```
tests/
├── README.md                       (this file)
├── helpers/
│   └── fixtures.js                 reusable fixture builders (fake HOME, settings.json, ...)
├── fixtures/                       static fixture files used by hook tests
├── cli.test.js                     unit + integration tests for cli.js (helpers, status, plans dir)
├── plans-parity.test.js            cli.js plans helpers == hooks/lib/plans.js
├── frontmatter.test.js             skill/guide/agent frontmatter guard
├── layout.test.js                  3.0 layout guard (no commands/, no nested skills)
├── removals.test.js                4.0.0 removals guard
├── git-skill.test.js               git skill standing-approval guard
├── plan-feature.test.js            plan-feature research-rules + migration-plan guard
├── init-project.test.js            init-project /init path guard
├── execute.test.js                 execute workflow (Step 4a) guard
├── review-checklist.test.js        project review-checklist guard
├── review-plan.test.js             review-plan completeness-check guard
├── code-review.test.js             code-review file guard (execute, pyramid, skill, agents)
├── global-rules.test.js            global-rules.md cost section guard
├── high-risk-guard.test.js         guard/high-risk-guard.js deny/allow tables + hostile dir
└── hooks/
    ├── env-protect.test.js         table-driven: dotenv reads blocked, mentions/templates allowed
    ├── tsc-check.test.js           PostToolUse recorder + Stop type check
    ├── session-prime.test.js       minimal SessionStart context
    ├── precompact-snapshot.test.js PreCompact snapshot + round trip
    └── statusline.test.js          statusline segments (model, effort, ultracode, cache)
```

## Conventions

- Each `*.test.js` file is self-contained — no global setup/teardown across files.
- File-system tests use `os.tmpdir()` for a fake `$HOME`. Cleanup runs in `afterEach`.
- Hook tests spawn the hook script as a child process and pipe JSON to stdin (mirrors how Claude Code invokes it).
- Assertions use `node:assert/strict` for explicit equality checks.

## Adding a new test file

1. Place it in `tests/` (or `tests/hooks/` for hook-specific tests).
2. Export nothing — `node --test` discovers and runs `test()` calls directly.
3. Run `npm test` to confirm it passes locally.
4. The CI workflow in `.github/workflows/ci.yml` will pick it up automatically on the next PR.
