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

### 2. Bump the version in `package.json`
Follow semver:
- **patch** (1.2.x) — bug fixes, content updates to commands or `files/CLAUDE.md`
- **minor** (1.x.0) — new commands, new CLI features, new permissions
- **major** (x.0.0) — breaking changes to install structure or command names

Edit `"version"` in `package.json`.

### 3. Test the CLI locally
```bash
node cli.js --force      # Full install without prompts
node cli.js --uninstall  # Verify uninstall removes the right files
node cli.js --version    # Verify version string matches package.json
```

### 4. Commit the version bump
```bash
git add package.json
git commit -m "chore: bump version to x.x.x"
```

### 5. Publish to npm
```bash
npm publish
```

### 6. Verify the publish
```bash
npm info @hopla/claude-setup version
```
Should show the new version.

---

## Common Pitfalls

- **Publishing without bumping version:** npm will reject a publish with the same version
- **Publishing with uncommitted changes:** Creates a mismatch between git and npm
- **Forgetting to test `--uninstall`:** This flow is rarely tested and can break silently

---

## Validation

After publishing, verify:
- [ ] `npm info @hopla/claude-setup version` shows the new version
- [ ] `npm install -g @hopla/claude-setup@latest --prefer-online && claude-setup` works correctly
