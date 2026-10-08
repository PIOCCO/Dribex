#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APIO_ROOT="${APIO_ROOT:-$ROOT/../../apio}"
missing=0
for req in package.json package-lock.json server/package.json server/src/adminIndex.js admin/vite.config.ts admin/src/main.tsx \
  src/components/admin/layout/AdminLayout.tsx; do
  if [[ ! -f "$APIO_ROOT/$req" ]]; then
    echo "MISSING: $APIO_ROOT/$req" >&2
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  echo "Run: $ROOT/scripts/apio-sync-source.sh" >&2
  exit 1
fi
echo "APIO source OK: $APIO_ROOT"
