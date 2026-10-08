#!/usr/bin/env bash
# APIO admin over plain HTTP (Tailscale) must not send CSP upgrade-insecure-requests or HSTS.
# Patches maisonmaroc server/src/security.js (idempotent). Rebuild apio-admin after running.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APIO_ROOT="${APIO_ROOT:-$ROOT/../../apio}"
SEC="$APIO_ROOT/server/src/security.js"

if [[ ! -f "$SEC" ]]; then
  echo "Missing $SEC — sync APIO from Azelos first (see souq-local/apio/README.md)" >&2
  exit 1
fi

if grep -Fq 'APIO_ADMIN_ALLOW_HTTP' "$SEC" 2>/dev/null; then
  echo "Already patched: $SEC"
  exit 0
fi

python3 - <<PY
from pathlib import Path
path = Path("""$SEC""")
text = path.read_text()
needle = "export function buildHelmetOptions() {"
if needle not in text:
    raise SystemExit(f"Unexpected {path} layout — patch manually")
insert = """const adminHttpOnTailscale =
  process.env.APIO_ADMIN_ALLOW_HTTP === "true" ||
  process.env.APIO_ADMIN_ALLOW_HTTP === "1";

"""
text = text.replace(needle, insert + needle, 1)
text = text.replace(
    "upgradeInsecureRequests: isProduction() ? [] : null,",
    "upgradeInsecureRequests: isProduction() && !adminHttpOnTailscale ? [] : null,",
    1,
)
text = text.replace(
    "hsts: isProduction()\n      ? { maxAge: 31536000, includeSubDomains: true, preload: false }\n      : false,",
    "hsts:\n      isProduction() && !adminHttpOnTailscale\n        ? { maxAge: 31536000, includeSubDomains: true, preload: false }\n        : false,",
    1,
)
path.write_text(text)
print(f"Patched {path}")
PY

echo "Add to .env.apio.prod:  APIO_ADMIN_ALLOW_HTTP=true"
echo "Then: docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml --env-file .env.prod build apio-admin"
echo "      docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml --env-file .env.prod up -d --force-recreate apio-admin"
