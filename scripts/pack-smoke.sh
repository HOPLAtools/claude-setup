#!/usr/bin/env bash
# Pack smoke: run the CLI the way users get it — the packed npm package,
# installed globally (its bin is a symlink), with a throwaway HOME.
# Catches what `node cli.js` tests cannot (e.g. the 2.1.0–4.1.0 symlink no-op).
# Usage: bash scripts/pack-smoke.sh   (no network: the package has no dependencies)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cd "$ROOT"
VERSION="$(node -p "require('./package.json').version")"
# publish.yml runs this in its id-token job: installing must download nothing
DEPS="$(node -p "Object.keys(require('./package.json').dependencies || {}).length")"
[ "$DEPS" = "0" ] || { echo "✗ package.json has dependencies: the install would download them (move this smoke out of the id-token job)"; exit 1; }
npm pack --silent --pack-destination "$WORK" >/dev/null
TARBALL="$(ls "$WORK"/*.tgz)"
npm install --global --silent --no-audit --no-fund --prefix "$WORK/prefix" "$TARBALL" >/dev/null

BIN="$WORK/prefix/bin/hopla-claude-setup"
[ -L "$BIN" ] || { echo "✗ installed bin is not a symlink: $BIN"; exit 1; }

export HOME="$WORK/home"
mkdir -p "$HOME"

fail() { echo "✗ $1"; echo "--- output:"; echo "$2"; exit 1; }

out="$("$BIN" --version 2>&1)"
[[ "$out" == *"v$VERSION"* ]] || fail "--version does not print v$VERSION" "$out"

out="$("$BIN" --dry-run --force 2>&1)"
[[ "$out" == *"Global Rules Setup"* ]] || fail "--dry-run --force printed no install header (silent no-op?)" "$out"

out="$("$BIN" status 2>&1)"
[[ "$out" == *"— status ("* ]] || fail "status printed no header (silent no-op?)" "$out"

[ ! -e "$HOME/.claude/CLAUDE.md" ] || fail "--dry-run wrote ~/.claude/CLAUDE.md" "$(ls -la "$HOME/.claude")"

echo "✓ pack smoke: @hopla/claude-setup@$VERSION installed from its tarball; the symlinked bin runs (--version, --dry-run, status)"
