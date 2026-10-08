#!/usr/bin/env bash
# Full APIO (maisonmaroc) source required for Docker builds — not just Dockerfile.*.
# Sync from Azelos, keep Dribex-specific Docker/nginx files, then overlay Dribex admin UX from git.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APIO_ROOT="${APIO_ROOT:-$ROOT/../../apio}"
APIO_ROOT="$(cd "$APIO_ROOT" && pwd)"
GIT_ROOT=""
APIO_PREFIX=""
AZELos_REPO="${AZELos_REPO:-https://github.com/PIOCCO/Azelos.git}"
AZELos_BRANCH="${AZELos_BRANCH:-cursor/production-audit-3967}"
DRIBEX_REPO="${DRIBEX_REPO:-https://github.com/PIOCCO/Dribex.git}"
DRIBEX_OVERLAY_BRANCH="${DRIBEX_OVERLAY_BRANCH:-cursor/apio-admin-i18n-8c79}"
TMP="${TMPDIR:-/tmp}/Azelos-apio-sync-$$"
DRIBEX_TMP="${TMPDIR:-/tmp}/dribex-apio-overlay-$$"
OVERLAY_TMP="${TMPDIR:-/tmp}/dribex-apio-archive-$$"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1" >&2; exit 1; }
}
need git
need tar

OVERLAY_PATHS=(
  admin/src
  admin/vite.config.ts
  server/src/security.js
  src/vite-env.d.ts
  src/index.css
  tailwind.config.js
  src/pages/AdminLoginPage.tsx
  src/i18n
  src/lib/useLocale.ts
  src/components/admin
  src/pages/admin
)

# Find a git root (walk up from infra/onprem) that tracks Dribex admin main.tsx.
resolve_git_apio() {
  local d="$ROOT"
  while [[ "$d" != "/" ]]; do
    if git -C "$d" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      local prefix
      for prefix in souq-local/apio apio; do
        if git -C "$d" ls-files --error-unmatch "$prefix/admin/src/main.tsx" >/dev/null 2>&1; then
          GIT_ROOT="$d"
          APIO_PREFIX="$prefix"
          return 0
        fi
      done
    fi
    d="$(cd "$d/.." && pwd)"
  done
  return 1
}

same_dir() {
  [[ "$(cd "$1" && pwd -P)" == "$(cd "$2" && pwd -P)" ]]
}

copy_overlay_tree() {
  local from="$1"
  local to="$2"
  [[ -d "$from/admin/src" ]] || return 1
  echo "    copy overlay $from -> $to"
  rm -rf "$to/admin/src"
  cp -a "$from/admin/src" "$to/admin/"
  for rel in admin/vite.config.ts server/src/security.js src/vite-env.d.ts src/index.css tailwind.config.js \
    src/pages/AdminLoginPage.tsx src/i18n/index.ts src/i18n/fr.ts src/i18n/ar.ts src/lib/useLocale.ts; do
    if [[ -f "$from/$rel" ]]; then
      mkdir -p "$to/$(dirname "$rel")"
      cp "$from/$rel" "$to/$rel"
    fi
  done
  for dir in src/components/admin src/pages/admin src/i18n; do
    if [[ -d "$from/$dir" ]]; then
      mkdir -p "$to/$(dirname "$dir")"
      rm -rf "$to/$dir"
      cp -a "$from/$dir" "$to/$dir"
    fi
  done
}

overlay_has_dribex_admin() {
  [[ -f "$APIO_ROOT/admin/src/main.tsx" && -f "$APIO_ROOT/admin/src/App.tsx" ]] \
    && grep -Fq '@shared/i18n' "$APIO_ROOT/admin/src/main.tsx" \
    && grep -Fq 'AdminLayout' "$APIO_ROOT/admin/src/App.tsx"
}

restore_overlay_from_local_git() {
  [[ -n "$APIO_PREFIX" && -n "$GIT_ROOT" ]] || return 1
  local rel paths=()
  for rel in "${OVERLAY_PATHS[@]}"; do
    paths+=("$APIO_PREFIX/$rel")
  done
  echo "==> Overlay from local git ($GIT_ROOT, prefix=$APIO_PREFIX)"
  git -C "$GIT_ROOT" checkout HEAD -- "${paths[@]}"
  local git_apio_dir
  git_apio_dir="$(cd "$GIT_ROOT/$APIO_PREFIX" && pwd -P)"
  if same_dir "$git_apio_dir" "$APIO_ROOT"; then
    echo "    working tree is APIO_ROOT"
  else
    copy_overlay_tree "$git_apio_dir" "$APIO_ROOT"
  fi
}

restore_overlay_from_dribex_github() {
  echo "==> Overlay from GitHub ($DRIBEX_REPO branch $DRIBEX_OVERLAY_BRANCH)"
  rm -rf "$DRIBEX_TMP"
  git clone --depth 1 --branch "$DRIBEX_OVERLAY_BRANCH" "$DRIBEX_REPO" "$DRIBEX_TMP"
  local src="$DRIBEX_TMP/souq-local/apio"
  if [[ ! -f "$src/admin/src/main.tsx" ]]; then
    echo "Branch $DRIBEX_OVERLAY_BRANCH has no souq-local/apio/admin in Dribex repo" >&2
    rm -rf "$DRIBEX_TMP"
    return 1
  fi
  copy_overlay_tree "$src" "$APIO_ROOT"
  rm -rf "$DRIBEX_TMP"
}

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

resolve_git_apio || true
GIT_APIO_DIR=""
if [[ -n "$APIO_PREFIX" && -n "$GIT_ROOT" ]]; then
  GIT_APIO_DIR="$(cd "$GIT_ROOT/$APIO_PREFIX" && pwd -P)"
fi

preserve=(
  Dockerfile.admin Dockerfile.server Dockerfile.web nginx-default.conf .dockerignore
)
if [[ -n "$GIT_APIO_DIR" ]] && ! same_dir "$GIT_APIO_DIR" "$APIO_ROOT"; then
  for f in "${preserve[@]}"; do
    if [[ -f "$GIT_APIO_DIR/$f" ]]; then
      cp "$GIT_APIO_DIR/$f" "$APIO_ROOT/$f"
    fi
  done
fi

if [[ -n "$APIO_PREFIX" ]]; then
  restore_overlay_from_local_git || echo "WARN: local git checkout overlay failed" >&2
fi

if ! overlay_has_dribex_admin; then
  echo "WARN: Dribex admin UX still missing after local git overlay" >&2
  restore_overlay_from_dribex_github || {
    echo "Run: $ROOT/scripts/apio-diagnose-git.sh" >&2
    exit 1
  }
fi

rm -rf "$TMP" "$OVERLAY_TMP"

chmod +x "$ROOT/scripts/apio-patch-admin-http-security.sh" "$ROOT/scripts/apio-patch-admin-i18n.sh" 2>/dev/null || true
"$ROOT/scripts/apio-patch-admin-i18n.sh" || true
"$ROOT/scripts/apio-patch-admin-http-security.sh" || true
chmod +x "$ROOT/scripts/apio-verify-admin-ui.sh" 2>/dev/null || true
"$ROOT/scripts/apio-verify-admin-ui.sh"

echo "==> Verify layout"
for req in package.json server/package.json server/src/adminIndex.js admin/vite.config.ts admin/src/main.tsx; do
  if [[ ! -f "$APIO_ROOT/$req" ]]; then
    echo "MISSING $APIO_ROOT/$req" >&2
    exit 1
  fi
done

echo "OK: APIO source ready at $APIO_ROOT"
echo "Next:"
echo "  cd $ROOT && docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml --env-file .env.prod build apio-admin"
