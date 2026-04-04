# Guide: Publishing a New Version to npm

## When to Use This Guide

Load this guide when: publishing a new release of `@hopla/claude-setup` to npm.

---

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

### 4. Commit the version bump
```bash
git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore: bump version to x.x.x"
```

### 5. Publish to npm
```bash
npm publish
```

### 6. Tag the release
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

- **Publishing without bumping version:** npm will reject a publish with the same version
- **Publishing with uncommitted changes:** Creates a mismatch between git and npm
- **Forgetting to bump all 3 files:** Plugin users won't see the update if `plugin.json` or `marketplace.json` are out of sync
- **Forgetting to tag:** Tags enable rollback and version history. Always tag after publish.
- **Forgetting to test `--uninstall`:** This flow is rarely tested and can break silently

---

## Validation

After publishing, verify:
- [ ] `npm info @hopla/claude-setup version` shows the new version
- [ ] `npm install -g @hopla/claude-setup@latest --prefer-online && claude-setup` works correctly
