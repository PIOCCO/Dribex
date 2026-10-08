#!/usr/bin/env bash
# Full APIO (maisonmaroc) source required for Docker builds — not just Dockerfile.*.
# Sync from Azelos, keep Dribex-specific Docker/nginx files, then overlay Dribex admin UX from git if present.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APIO_ROOT="${APIO_ROOT:-$ROOT/../../apio}"
GIT_ROOT="$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null || cd "$ROOT/../.." && pwd)"
# Dribex layout: <git-root>/souq-local/apio — fallback: sibling apio/ next to infra/
resolve_dribex_apio() {
  local c
  for c in "$GIT_ROOT/souq-local/apio" "$ROOT/../../apio"; do
    if [[ -f "$c/admin/src/App.tsx" ]]; then
      echo "$c"
      return 0
    fi
  done
  return 1
}
DRIBEX_APIO="$(resolve_dribex_apio || true)"
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
  if [[ -n "${DRIBEX_APIO:-}" && -f "$DRIBEX_APIO/$f" ]]; then
    cp "$DRIBEX_APIO/$f" "$APIO_ROOT/$f"
  fi
done

echo "==> Overlay Dribex admin/i18n/UX from git checkout (replaces Azelos admin shell)"
if [[ -z "${DRIBEX_APIO:-}" ]]; then
  echo "WARN: No Dribex souq-local/apio in git checkout — Azelos admin UI will remain (raw i18n keys / old layout)" >&2
  echo "      git pull cursor/apio-admin-i18n-8c79 on the host repo, then re-run." >&2
elif git -C "$GIT_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$GIT_ROOT" checkout HEAD -- souq-local/apio 2>/dev/null || true
  DRIBEX_APIO="$(resolve_dribex_apio || echo "$DRIBEX_APIO")"
fi
if [[ -n "${DRIBEX_APIO:-}" && -d "$DRIBEX_APIO/admin/src" ]]; then
  echo "    from $DRIBEX_APIO"
  rm -rf "$APIO_ROOT/admin/src"
  cp -a "$DRIBEX_APIO/admin/src" "$APIO_ROOT/admin/"
  for rel in admin/vite.config.ts server/src/security.js src/vite-env.d.ts src/index.css tailwind.config.js \
    src/pages/AdminLoginPage.tsx src/i18n/index.ts src/i18n/fr.ts src/i18n/ar.ts src/lib/useLocale.ts; do
    if [[ -f "$DRIBEX_APIO/$rel" ]]; then
      mkdir -p "$APIO_ROOT/$(dirname "$rel")"
      cp "$DRIBEX_APIO/$rel" "$APIO_ROOT/$rel"
    fi
  done
  for dir in src/components/admin src/pages/admin; do
    if [[ -d "$DRIBEX_APIO/$dir" ]]; then
      mkdir -p "$APIO_ROOT/$(dirname "$dir")"
      rm -rf "$APIO_ROOT/$dir"
      cp -a "$DRIBEX_APIO/$dir" "$APIO_ROOT/$dir"
    fi
  done
fi

rm -rf "$TMP"

chmod +x "$ROOT/scripts/apio-patch-admin-http-security.sh" "$ROOT/scripts/apio-patch-admin-i18n.sh" 2>/dev/null || true
"$ROOT/scripts/apio-patch-admin-i18n.sh" || true
"$ROOT/scripts/apio-patch-admin-http-security.sh" || true
chmod +x "$ROOT/scripts/apio-verify-admin-ui.sh" 2>/dev/null || true
"$ROOT/scripts/apio-verify-admin-ui.sh"

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
