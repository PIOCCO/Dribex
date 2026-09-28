#!/usr/bin/env bash
# Diagnose + fix missing host publish for apio-admin (port 7217).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APIO_PROD="$ROOT/docker-compose.apio.prod.yml"
DRIBEX_ENV="${ENV_FILE_DRIBEX:-$ROOT/.env.prod}"
TS_IP=""
if command -v tailscale >/dev/null 2>&1; then
  TS_IP="$(tailscale ip -4 2>/dev/null || true)"
fi
if [[ -f "$DRIBEX_ENV" ]]; then
  # shellcheck source=/dev/null
  set -a
  source "$DRIBEX_ENV"
  set +a
fi
[[ -n "${TAILSCALE_IP:-}" ]] || TAILSCALE_IP="$TS_IP"
export TAILSCALE_IP

echo "==> 1) Container health (inside Docker network)"
CID="$(docker ps -qf 'name=apio-admin' | head -1 || true)"
if [[ -z "$CID" ]]; then
  echo "No apio-admin container running." >&2
  exit 1
fi
CIP="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$CID")"
echo "Container ID=$CID IP=$CIP"
docker exec "$CID" wget -qO- "http://127.0.0.1:7217/api/health" || true
echo ""
curl -sf --connect-timeout 2 "http://${CIP}:7217/api/health" && echo " (host -> container IP OK)" || echo "host -> container IP failed (unexpected)"

echo ""
echo "==> 2) Host port publish (this is usually what's broken)"
docker port "$CID" 7217 2>/dev/null || echo "NO host publish for 7217"

echo ""
echo "==> 3) Ensure compose declares ports"
if ! grep -q '127.0.0.1:7217:7217' "$APIO_PROD" 2>/dev/null; then
  echo "Patching $APIO_PROD — adding 127.0.0.1:7217 publish"
  if grep -q '^  apio-admin:' "$APIO_PROD"; then
    python3 <<'PY'
from pathlib import Path
path = Path("docker-compose.apio.prod.yml")
text = path.read_text()
needle = "  apio-admin:"
if needle not in text:
    raise SystemExit("apio-admin service not found")
if "127.0.0.1:7217:7217" in text:
    raise SystemExit(0)
block = """    ports:
      - \"127.0.0.1:7217:7217\"
"""
# Insert after apio-admin volumes line (first volumes: under apio-admin)
lines = text.splitlines(keepends=True)
out = []
i = 0
in_admin = False
inserted = False
while i < len(lines):
    line = lines[i]
    out.append(line)
    if line.startswith("  apio-admin:"):
        in_admin = True
    elif in_admin and line.startswith("  ") and not line.startswith("    ") and not line.strip().startswith("#"):
        in_admin = False
    if in_admin and not inserted and line.strip() == "- apio_data:/data":
        out.append(block)
        inserted = True
    i += 1
if not inserted:
    raise SystemExit("Could not find apio-admin volumes: apio_data:/data to insert ports")
path.write_text("".join(out))
print("Patched ports into docker-compose.apio.prod.yml")
PY
  else
    echo "ERROR: no apio-admin in $APIO_PROD" >&2
    exit 1
  fi
else
  echo "docker-compose.apio.prod.yml already has 127.0.0.1:7217"
fi

COMPOSE=(docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml)
if [[ -n "${TAILSCALE_IP:-}" ]] && [[ -f docker-compose.apio-admin-tailscale.yml ]]; then
  COMPOSE+=(-f docker-compose.apio-admin-tailscale.yml)
  echo "TAILSCALE_IP=$TAILSCALE_IP (Tailscale publish overlay enabled)"
else
  echo "TAILSCALE_IP unset — only 127.0.0.1 will bind"
fi

echo ""
echo "==> 4) Recreate apio-admin"
"${COMPOSE[@]}" --env-file "$DRIBEX_ENV" up -d --force-recreate apio-admin

sleep 2
echo ""
echo "==> 5) Verify"
docker port "$CID" 7217 2>/dev/null || docker port "$(docker ps -qf 'name=apio-admin' | head -1)" 7217 || true
curl -sf "http://127.0.0.1:7217/api/health" && echo || echo "127.0.0.1:7217 still not reachable"

if [[ -n "${TAILSCALE_IP:-}" ]]; then
  curl -sf --connect-timeout 2 "http://${TAILSCALE_IP}:7217/api/health" && echo " (Tailscale IP OK)" || \
    echo "Tailscale IP not reachable yet — check APIO_ADMIN_ALLOWED_NETWORKS and ufw"
fi

echo ""
echo "==> If host ports STILL fail: use SSH tunnel from your laptop (works without publish):"
echo "  APIO_IP=$CIP"
echo "  ssh -N -L 7217:${CIP}:7217 piocco@${TAILSCALE_IP:-YOUR_TS_IP}"
echo "  Then open http://127.0.0.1:7217/login on the laptop."
