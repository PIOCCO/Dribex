#!/usr/bin/env bash
# Fail if APIO tree on disk is missing Dribex admin UX (sidebar layout + i18n bootstrap).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APIO_ROOT="${APIO_ROOT:-$ROOT/../../apio}"
fail=0
need_file() {
  if [[ ! -f "$1" ]]; then
    echo "MISSING: $1" >&2
    fail=1
  fi
}

need_file "$APIO_ROOT/admin/src/main.tsx"
need_file "$APIO_ROOT/admin/src/App.tsx"
need_file "$APIO_ROOT/src/components/admin/layout/AdminLayout.tsx"
need_file "$APIO_ROOT/src/i18n/fr.ts"
need_file "$APIO_ROOT/src/i18n/index.ts"

if ! rg -q '@shared/i18n' "$APIO_ROOT/admin/src/main.tsx" 2>/dev/null; then
  echo "FAIL: admin/src/main.tsx must import @shared/i18n (raw adminDash.* keys otherwise)" >&2
  fail=1
fi

if ! rg -q 'AdminLayout' "$APIO_ROOT/admin/src/App.tsx" 2>/dev/null; then
  echo "FAIL: admin/src/App.tsx must use AdminLayout (old tabbed dashboard otherwise)" >&2
  fail=1
fi

if ! rg -q 'Administration APIO' "$APIO_ROOT/src/i18n/fr.ts" 2>/dev/null; then
  echo "FAIL: src/i18n/fr.ts missing adminDash strings — overlay from Dribex git failed" >&2
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "Run: $ROOT/scripts/apio-sync-source.sh from branch cursor/apio-admin-i18n-8c79" >&2
  exit 1
fi

echo "Dribex admin UX source OK under $APIO_ROOT"

verify_container_bundle() {
  local cid="${1:-}"
  [[ -n "$cid" ]] || cid=$(docker ps -qf 'name=apio-admin' | head -1)
  [[ -n "$cid" ]] || return 0
  local js
  js=$(docker exec "$cid" sh -c 'ls /app/admin/dist/assets/index-*.js 2>/dev/null | head -1' || true)
  [[ -n "$js" ]] || { echo "WARN: no admin JS bundle in container" >&2; return 0; }
  if ! docker exec "$cid" sh -c "grep -q 'admin-shell' '$js' && grep -q 'Administration APIO' '$js'"; then
    echo "FAIL: running apio-admin image has OLD UI bundle (no sidebar / French strings)" >&2
    echo "  Run: $ROOT/scripts/apio-admin-rebuild.sh" >&2
    return 1
  fi
  echo "Container admin bundle OK ($js)"
}

if [[ "${1:-}" == "--container" ]]; then
  verify_container_bundle "${2:-}"
fi
