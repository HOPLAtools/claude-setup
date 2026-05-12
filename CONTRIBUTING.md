# Contributing to @hopla/claude-setup

Thanks for considering a contribution. This project is an agentic-coding system for [Claude Code](https://claude.com/claude-code), distributed via two channels: a Claude Code plugin (primary) and an npm CLI (`hopla-claude-setup`) for the global rules template.

## Code of conduct

By participating, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md) (Contributor Covenant v2.1).

## Getting started

### Prerequisites

- Node.js ≥ 18 (the CLI and hooks rely on `node:test`, `node:fs` and other built-ins available since 18).
- Git. No additional package manager beyond `npm` is needed.

### Clone and set up

```bash
git clone https://github.com/HOPLAtools/claude-setup.git
cd claude-setup
# No `npm install` needed — this project has zero external dependencies.
```

## Local development

### CLI (`cli.js`)

```bash
node cli.js --dry-run --force           # preview an install without writing
node cli.js --dry-run --uninstall --force
node cli.js --dry-run --setup-statusline --force
node cli.js --version
```

`--dry-run` composes with every other flag and prints what would change without touching disk.

### Plugin channel (local install)

```bash
# Inside Claude Code:
/plugin marketplace add ./           # registers your local checkout as a marketplace
/plugin install hopla@<marketplace-name>
/reload-plugins                      # re-apply changes after editing
```

### Edit checklist

Any change to `commands/`, `skills/`, `agents/`, `hooks/`, or `global-rules.md` is shipped to every future user — review carefully and consider backwards compatibility.

## Testing

```bash
npm test                             # full unit + integration suite (node:test builtin)
node --test tests/cli.test.js        # one file
bash skills/hook-audit/tests/manual-test.sh   # the hook-audit smoke
```

The CI workflow (`.github/workflows/ci.yml`) runs the same commands on every PR and push to `main`. PRs cannot merge with a red CI.

When adding a new hook or CLI helper, add a corresponding test file under `tests/` so future refactors keep working.

## Submitting changes

### Conventional Commits

```
type(scope): description
```

Types we use: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`.

### Branch naming

- New features: `feature/<short-description>`
- Bug fixes: `fix/<short-description>`
- Hotfixes: `hotfix/<short-description>`

### Release bumps

Versions are tracked in three files and must always match. `scripts/check-versions.js` blocks publish if any diverge.

- `package.json`
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json` (inside `plugins[0].version`)

Bump all three in the same commit. CI verifies the match.

### Opening a PR

- Push your branch and open a pull request against `main`.
- Fill out the PR template (autoloaded from `.github/PULL_REQUEST_TEMPLATE.md`).
- Wait for CI to go green.
- A maintainer reviews and merges.

### Reporting bugs

Open an issue using the **bug report** template at `.github/ISSUE_TEMPLATE/bug_report.md`. Include:

- Claude Code version
- Node version (`node --version`)
- OS and shell
- Exact command run and the full output

### Security issues

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for the disclosure process.

## Coding conventions

- `cli.js` stays as a single ESM file with no external dependencies (Node built-ins only). Helpers are exported for testing; the main dispatcher only fires when the file is the script entrypoint.
- Skills (`skills/<name>/SKILL.md`) declare YAML frontmatter with `name`, `description`, and optional `triggers:`/`allowed-tools:`. Keep the description neutral and language-agnostic — the plugin operates internationally.
- Hooks (`hooks/*.js`) follow the Claude Code hook contract: read JSON from stdin, write to stdout, exit codes `0` (continue) or `2` (block). All paths use `${CLAUDE_PLUGIN_ROOT}` in `hooks.json` so they survive plugin upgrades.
- Markdown documentation in `commands/`, `skills/`, and `agents/` uses GitHub-flavored Markdown.

## Project rules

`CLAUDE.md` at the repo root captures the binding development rules for this project (architecture, distribution channels, release flow). Read it before making non-trivial changes — it covers details this file deliberately keeps brief.
