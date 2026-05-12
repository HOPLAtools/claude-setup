#!/bin/bash
#
# Manual sanity test for the hook-audit skill's detection layer.
#
# The skill itself is markdown — an agent (Claude) interprets it. This script
# cannot exercise the full agent flow. What it CAN do is verify that the
# grep-based detection commands from `checklist.md` produce the expected
# candidate matches against the bundled fixtures.
#
# Rules covered by this script:
#   - E-1 (substring error matching) — exact match count
#   - D-1 (cache + inFlight)         — presence check
#
# Rules requiring agent-level structural verification (NOT covered here, by design):
#   - P-5 (return-not-memoized)      — needs hook-scope + useMemo-wrapper filter
#   - S-8 (setLoading inside guard)  — needs brace-balance / above-context filter
# Their grep stage is exercised below but only as a "candidates exist" assertion.
#
# Usage:  bash skills/hook-audit/tests/manual-test.sh
# Exits 0 on success, 1 on the first failed assertion.

set -e
set -u

DIR="$(cd "$(dirname "$0")" && pwd)"
BAD="$DIR/fixtures/use-bad.ts.example"
GOOD="$DIR/fixtures/use-good.ts.example"
PASS=0
FAIL=0

run() {
    local label="$1"
    local expected="$2"
    local actual="$3"
    if [ "$expected" = "$actual" ]; then
        echo "  ✓ $label"
        PASS=$((PASS + 1))
    else
        echo "  ✗ $label — expected '$expected', got '$actual'"
        FAIL=$((FAIL + 1))
    fi
}

count() {
    # `grep -c` already outputs the match count (0 if none). Its exit code is
    # 1 on no matches; the `|| true` keeps `set -e` happy without duplicating
    # output via an explicit `echo 0` fallback.
    grep -cE "$1" "$2" 2>/dev/null || true
}

echo "=== hook-audit detection sanity test ==="
echo

[ -f "$BAD" ]  || { echo "Missing fixture: $BAD"; exit 1; }
[ -f "$GOOD" ] || { echo "Missing fixture: $GOOD"; exit 1; }

echo "BAD fixture ($BAD):"
run "P-5 — return literal candidate present"      "yes" "$([ $(count 'return[[:space:]]*\{' "$BAD") -ge 1 ] && echo yes || echo no)"
run "S-8 — setLoading(false) candidate present"   "yes" "$([ $(count 'setLoading\(false\)' "$BAD") -ge 1 ] && echo yes || echo no)"
run "E-1 — substring matcher detected exactly 1"  "1"   "$(count "\.message\??\.includes\([\"'][a-z]+[\"']\)" "$BAD")"
run "D-1 — module cache present"                  "yes" "$([ $(count '^const cache[[:space:]]*=[[:space:]]*new Map' "$BAD") -ge 1 ] && echo yes || echo no)"
run "D-1 — inFlight ABSENT"                       "yes" "$([ $(count '^const inFlight[[:space:]]*=[[:space:]]*new Map' "$BAD") -eq 0 ] && echo yes || echo no)"

echo
echo "GOOD fixture ($GOOD):"
run "E-1 — no substring matcher (count is 0)"     "0"   "$(count "\.message\??\.includes\([\"'][a-z]+[\"']\)" "$GOOD")"
run "D-1 — module cache present"                  "yes" "$([ $(count '^const cache[[:space:]]*=[[:space:]]*new Map' "$GOOD") -ge 1 ] && echo yes || echo no)"
run "D-1 — inFlight present"                      "yes" "$([ $(count '^const inFlight[[:space:]]*=[[:space:]]*new Map' "$GOOD") -ge 1 ] && echo yes || echo no)"

echo
echo "=== Summary: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] || exit 1
echo "All hook-audit detection tests pass."
