#!/usr/bin/env bash
# Standalone admin app must import i18n before render (fixes raw adminDash.* keys in UI).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAIN="${APIO_ROOT:-$ROOT/../../apio}/admin/src/main.tsx"

if [[ ! -f "$MAIN" ]]; then
  echo "Missing $MAIN" >&2
  exit 1
fi

if grep -Fq '@shared/i18n' "$MAIN" 2>/dev/null; then
  echo "Already patched: $MAIN"
  exit 0
fi

python3 - <<PY
from pathlib import Path
path = Path("""$MAIN""")
text = path.read_text()
needle = 'import "@shared/index.css";'
insert = 'import "@shared/i18n";\nimport "@shared/index.css";'
if needle not in text:
    raise SystemExit("Unexpected main.tsx layout")
path.write_text(text.replace(needle, insert, 1))
print(f"Patched {path}")
PY

echo "Rebuild apio-admin: npm run build:admin (in apio/) then docker compose build apio-admin"
