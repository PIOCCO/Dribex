#!/usr/bin/env bash
# Full APIO (maisonmaroc) source required for Docker builds — not just Dockerfile.*.
# Sync from Azelos, keep Dribex-specific Docker/nginx files, then overlay Dribex admin UX from git if present.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APIO_ROOT="${APIO_ROOT:-$ROOT/../../apio}"
REPO_ROOT="$(cd "$ROOT/../.." && pwd)"
AZELos_REPO="${AZELos_REPO:-https://github.com/PIOCCO/Azelos.git}"
AZELos_BRANCH="${AZELos_BRANCH:-cursor/production-audit-3967}"
TMP="${TMPDIR:-/tmp}/Azelos-apio-sync-$$"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1" >&2; exit 1; }
}
need git
need tar

echo "==> Clone Azelos (${AZELos_BRANCH})"
rm -rf "$TMP"
git clone --depth 1 --branch "$AZELos_BRANCH" "$AZELos_REPO" "$TMP"

SRC="$TMP/maisonmaroc"
if [[ ! -f "$SRC/package.json" || ! -f "$SRC/server/package.json" ]]; then
  echo "Branch $AZELos_BRANCH has no maisonmaroc/ with server/ — try another AZELos_BRANCH" >&2
  exit 1
fi

mkdir -p "$APIO_ROOT"
echo "==> Sync maisonmaroc -> $APIO_ROOT"
tar -C "$SRC" -cf - \
  --exclude node_modules \
  --exclude dist \
  --exclude admin/dist \
  --exclude server/node_modules \
  --exclude server/data \
  . | tar -xf - -C "$APIO_ROOT"

preserve=(
  Dockerfile.admin Dockerfile.server Dockerfile.web nginx-default.conf .dockerignore
)
for f in "${preserve[@]}"; do
  if [[ -f "$REPO_ROOT/souq-local/apio/$f" ]]; then
    cp "$REPO_ROOT/souq-local/apio/$f" "$APIO_ROOT/$f"
  fi
done

echo "==> Overlay Dribex admin/i18n/UX files from git checkout (if tracked)"
if git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$REPO_ROOT" checkout HEAD -- \
    souq-local/apio/admin/src/main.tsx \
    souq-local/apio/admin/src/App.tsx \
    souq-local/apio/src/i18n/index.ts \
    souq-local/apio/src/i18n/fr.ts \
    souq-local/apio/src/i18n/ar.ts \
    souq-local/apio/src/index.css \
    souq-local/apio/tailwind.config.js \
    souq-local/apio/src/pages/AdminLoginPage.tsx \
    souq-local/apio/src/pages/admin \
    souq-local/apio/src/components/admin \
    2>/dev/null || true
  for rel in admin/src/main.tsx admin/src/App.tsx src/i18n/index.ts src/i18n/fr.ts src/i18n/ar.ts \
    src/index.css tailwind.config.js src/pages/AdminLoginPage.tsx; do
    if [[ -f "$REPO_ROOT/souq-local/apio/$rel" ]]; then
      mkdir -p "$APIO_ROOT/$(dirname "$rel")"
      cp "$REPO_ROOT/souq-local/apio/$rel" "$APIO_ROOT/$rel"
    fi
  done
  if [[ -d "$REPO_ROOT/souq-local/apio/src/pages/admin" ]]; then
    cp -a "$REPO_ROOT/souq-local/apio/src/pages/admin" "$APIO_ROOT/src/pages/"
  fi
  if [[ -d "$REPO_ROOT/souq-local/apio/src/components/admin" ]]; then
    cp -a "$REPO_ROOT/souq-local/apio/src/components/admin" "$APIO_ROOT/src/components/"
  fi
fi

rm -rf "$TMP"

echo "==> Verify layout"
for req in package.json server/package.json server/src/adminIndex.js admin/vite.config.ts; do
  if [[ ! -f "$APIO_ROOT/$req" ]]; then
    echo "MISSING $APIO_ROOT/$req" >&2
    exit 1
  fi
done

echo "OK: APIO source ready at $APIO_ROOT"
echo "Next:"
echo "  cd $ROOT && docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml --env-file .env.prod build apio-admin"
