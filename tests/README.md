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
├── cli.test.js                     unit tests for cli.js helpers
└── hooks/
    ├── env-protect.test.js
    ├── tsc-check.test.js
    └── prompt-route.test.js
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
