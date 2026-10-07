#!/usr/bin/env bash
# Expose loopback apio-admin (network_mode: host, APIO_ADMIN_BIND=127.0.0.1) on the tailnet.
# Without this, http://100.x.y.z:7217 often hits Tailscale Serve's Go handler → "404 page not found".
set -euo pipefail

PORT="${APIO_ADMIN_PORT:-7217}"
BACKEND="http://127.0.0.1:${PORT}"

echo "== Local admin (must work before Tailscale) =="
curl -sf "${BACKEND}/api/health" && echo || {
  echo "FAIL: ${BACKEND}/api/health — fix apio-admin first (docker logs margem-prod-apio-admin-1 --tail 40)" >&2
  exit 1
}
curl -sfI "${BACKEND}/login" | head -5 || {
  echo "WARN: ${BACKEND}/login not OK — rebuild apio-admin if admin/dist is missing" >&2
}

echo
echo "== Tailscale Serve on port ${PORT} -> ${BACKEND} =="
if command -v tailscale >/dev/null 2>&1; then
  tailscale serve reset 2>/dev/null || true
  tailscale serve --bg --http="${PORT}" "${BACKEND}"
  echo
  tailscale serve status || true
  TS_IP="$(tailscale ip -4 2>/dev/null || true)"
  echo
  echo "Open in browser (Tailscale device, HTTP not HTTPS):"
  echo "  http://${TS_IP:-YOUR_TS_IP}:${PORT}/login"
else
  echo "tailscale CLI not found — use SSH tunnel instead:" >&2
  echo "  ssh -N -L ${PORT}:127.0.0.1:${PORT} piocco@YOUR_TS_IP" >&2
  echo "  http://127.0.0.1:${PORT}/login" >&2
  exit 1
fi
