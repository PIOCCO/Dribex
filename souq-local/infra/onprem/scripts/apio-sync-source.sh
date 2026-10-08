#!/usr/bin/env bash
# Full APIO (maisonmaroc) source required for Docker builds — not just Dockerfile.*.
# Sync from Azelos, keep Dribex-specific Docker/nginx files, then overlay Dribex admin UX from git.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APIO_ROOT="${APIO_ROOT:-$ROOT/../../apio}"
APIO_ROOT="$(cd "$APIO_ROOT" && pwd)"
GIT_ROOT="$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null || true)"
AZELos_REPO="${AZELos_REPO:-https://github.com/PIOCCO/Azelos.git}"
AZELos_BRANCH="${AZELos_BRANCH:-cursor/production-audit-3967}"
TMP="${TMPDIR:-/tmp}/Azelos-apio-sync-$$"
OVERLAY_TMP="${TMPDIR:-/tmp}/dribex-apio-overlay-$$"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1" >&2; exit 1; }
}
need git
need tar

# Git path prefix to APIO inside this repo (Dribex monorepo vs souq-local-only checkout).
git_apio_prefix() {
  [[ -n "${GIT_ROOT:-}" ]] || return 1
  if git -C "$GIT_ROOT" ls-files --error-unmatch souq-local/apio/admin/src/main.tsx >/dev/null 2>&1; then
    echo "souq-local/apio"
    return 0
  fi
  if git -C "$GIT_ROOT" ls-files --error-unmatch apio/admin/src/main.tsx >/dev/null 2>&1; then
    echo "apio"
    return 0
  fi
  return 1
}

same_dir() {
  [[ "$(cd "$1" && pwd -P)" == "$(cd "$2" && pwd -P)" ]]
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

APIO_PREFIX="$(git_apio_prefix || true)"
GIT_APIO_DIR=""
if [[ -n "$APIO_PREFIX" && -n "$GIT_ROOT" ]]; then
  GIT_APIO_DIR="$(cd "$GIT_ROOT/$APIO_PREFIX" && pwd -P)"
fi

preserve=(
  Dockerfile.admin Dockerfile.server Dockerfile.web nginx-default.conf .dockerignore
)
if [[ -n "$GIT_APIO_DIR" && ! same_dir "$GIT_APIO_DIR" "$APIO_ROOT" ]]; then
  for f in "${preserve[@]}"; do
    if [[ -f "$GIT_APIO_DIR/$f" ]]; then
      cp "$GIT_APIO_DIR/$f" "$APIO_ROOT/$f"
    fi
  done
fi

echo "==> Overlay Dribex admin/i18n/UX from git (after Azelos wiped apio/)"
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

restore_overlay_from_git() {
  [[ -n "$APIO_PREFIX" && -n "$GIT_ROOT" ]] || return 1
  local rel
  local paths=()
  for rel in "${OVERLAY_PATHS[@]}"; do
    paths+=("$APIO_PREFIX/$rel")
  done
  git -C "$GIT_ROOT" checkout HEAD -- "${paths[@]}"
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

if [[ -z "$APIO_PREFIX" ]]; then
  echo "WARN: Git checkout has no tracked apio/admin — pull cursor/apio-admin-i18n-8c79" >&2
elif ! restore_overlay_from_git; then
  echo "WARN: git checkout overlay failed" >&2
fi

if [[ -n "$GIT_APIO_DIR" && -d "$GIT_APIO_DIR/admin/src" ]]; then
  if same_dir "$GIT_APIO_DIR" "$APIO_ROOT"; then
    echo "    git tree at $GIT_APIO_DIR (same as APIO_ROOT)"
  else
    copy_overlay_tree "$GIT_APIO_DIR" "$APIO_ROOT"
  fi
else
  # Last resort: extract tracked paths from git into APIO_ROOT (works when apio/ is not in working tree).
  rm -rf "$OVERLAY_TMP"
  mkdir -p "$OVERLAY_TMP"
  if [[ -n "$APIO_PREFIX" && -n "$GIT_ROOT" ]]; then
    archive_paths=()
    for rel in "${OVERLAY_PATHS[@]}"; do
      archive_paths+=("$APIO_PREFIX/$rel")
    done
    (cd "$GIT_ROOT" && git archive HEAD "${archive_paths[@]}" 2>/dev/null) | tar -xf - -C "$OVERLAY_TMP" || true
    if [[ -d "$OVERLAY_TMP/$APIO_PREFIX" ]]; then
      copy_overlay_tree "$OVERLAY_TMP/$APIO_PREFIX" "$APIO_ROOT"
    fi
  fi
  rm -rf "$OVERLAY_TMP"
fi

rm -rf "$TMP"

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
