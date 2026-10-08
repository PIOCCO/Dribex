#!/usr/bin/env bash
# Where does this host's git track Dribex apio admin files? (piocco layout varies.)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APIO_ROOT="${APIO_ROOT:-$ROOT/../../apio}"

echo "==> Paths"
echo "  infra/onprem:  $ROOT"
echo "  APIO_ROOT:     $APIO_ROOT"
echo "  MarGem tip:    git root is often ~/MarGem/souq-local, not ~/MarGem"

echo
echo "==> Walk upward for git repos"
d="$ROOT"
found=0
while [[ "$d" != "/" ]]; do
  if git -C "$d" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    br="$(git -C "$d" branch --show-current 2>/dev/null || true)"
    echo "  GIT_ROOT=$d  branch=${br:-?}"
    for prefix in souq-local/apio apio; do
      if git -C "$d" ls-files --error-unmatch "$prefix/admin/src/main.tsx" >/dev/null 2>&1; then
        echo "    OK tracked: $prefix/admin/src/main.tsx"
        found=1
      else
        echo "    -- not tracked: $prefix/admin/src/main.tsx"
      fi
    done
  fi
  d="$(cd "$d/.." && pwd)"
done

echo
if [[ "$found" -eq 0 ]]; then
  echo "No Dribex admin main.tsx in any ancestor git repo."
  echo "  cd ~/MarGem/souq-local && git fetch origin cursor/apio-admin-i18n-8c79 && git checkout cursor/apio-admin-i18n-8c79 && git pull"
  echo "  Or apio-sync-source will clone overlay from GitHub (DRIBEX_OVERLAY_BRANCH)."
  exit 1
fi
echo "Use the OK tracked prefix above; apio-sync-source.sh detects this automatically."
