# Guide: Publishing a New Version to npm

## When to Use This Guide

Load this guide when: publishing a new release of `@hopla/claude-setup` to npm.

---

## One-time setup (already done? skip)

Automatic publishing needs a trusted publisher on npmjs.com, configured once by a package owner with 2FA:

1. npmjs.com → **@hopla/claude-setup → Settings → Trusted publishing → GitHub Actions**.
2. Organization or user `HOPLAtools`, Repository `claude-setup`, Workflow filename `publish.yml`, Environment name **blank**.
3. Under allowed actions, tick **`npm publish`** (configurations created after Sep 3, 2026 allow only `npm stage publish` by default, which would need a manual 2FA approval for every release).
4. Nothing is needed on GitHub (no secret, no environment).

npm does not validate the configuration when you save it: a typo only shows up on the first real publish, and an existing connection cannot be edited — delete it and create it again.

## Step-by-Step Implementation

### 1. Confirm all changes are committed
```bash
git status
```
No uncommitted changes should remain.

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

### 3. Test the CLI locally
```bash
node cli.js --force      # Full install without prompts
node cli.js --uninstall  # Verify uninstall removes the right files
node cli.js --version    # Verify version string matches package.json
```

### 4. Commit the version bump and open a PR
```bash
git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json CHANGELOG.md
git commit -m "chore: bump version to x.x.x"
```
Open the PR to `main` and wait for CI (Node 20 and 24) to be green.

### 5. Merge — publishing is automatic
Merging the PR pushes to `main`, and `.github/workflows/publish.yml` publishes the new version with npm trusted publishing (OIDC, no token, provenance included). It first checks that the version is not on npm yet, repeats the CI checks, and runs `npm publish`, which runs `prepublishOnly` (`check-versions` + `npm test`). A push without a version bump ends green doing nothing.

If the workflow fails with `ENEEDAUTH` or an unexpected `E404`, the trusted publisher on npmjs.com does not match (owner `HOPLAtools`, repository `claude-setup`, workflow `publish.yml`, direct `npm publish` allowed) — fix it there, then re-run the workflow. Manual fallback from an up-to-date `main`:
```bash
npm publish --otp=<6-digit code>
```

### 6. Tag the release (optional)
```bash
git tag -a v[x.x.x] -m "Release [x.x.x]"
git push origin v[x.x.x]
```

### 7. Verify the publish
```bash
npm info @hopla/claude-setup version
```
Should show the new version.

---

## Common Pitfalls

- **Publishing without bumping version:** the publish workflow does nothing (and a manual `npm publish` is rejected)
- **Renaming `.github/workflows/publish.yml`:** npm trusts that exact filename; a rename breaks publishing until the trusted publisher is recreated on npmjs.com
- **Forgetting to bump all 3 files:** Plugin users won't see the update if `plugin.json` or `marketplace.json` are out of sync
- **Tags are optional:** if you tag, do it from an up-to-date `main` (`git checkout main && git pull`) after the publish workflow succeeds.
- **Forgetting to test `--uninstall`:** This flow is rarely tested and can break silently

---

## Validation

After publishing, verify:
- [ ] `npm info @hopla/claude-setup version` shows the new version
- [ ] `npm install -g @hopla/claude-setup@latest --prefer-online && hopla-claude-setup --version` prints the new version
