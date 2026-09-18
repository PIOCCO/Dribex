#!/usr/bin/env bash
# Fail if production compose files publish dangerous host ports on 0.0.0.0 / ::.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

deny_ports=(5432 6379 9000 9090 8200 3100 3000 8000)

check_compose_file() {
  local compose="$1"
  local label="$2"

  if [[ ! -f "$compose" ]]; then
    echo "Missing $compose" >&2
    FAIL=1
    return
  fi

  echo "Checking $label ..."

  while IFS= read -r line; do
    for port in "${deny_ports[@]}"; do
      if echo "$line" | rg -q "\"0\\.0\\.0\\.0:${port}|:${port}:${port}|\"${port}:${port}|\\[::\\]:${port}"; then
        echo "FAIL [$label]: must not publish port $port on all interfaces: $line" >&2
        FAIL=1
      fi
    done
  done < <(rg '^\s+-\s+"[^"]+:[0-9]+"' "$compose" || true)

  if [[ "$label" == "docker-compose.prod.yml" ]]; then
    nginx_ports="$(rg '^\s+-\s+"' "$compose" | rg ':(80|443)"' || true)"
    if [[ -z "$nginx_ports" ]]; then
      echo "FAIL [$label]: expected nginx to publish 80 and 443" >&2
      FAIL=1
    fi
  fi

  if [[ "$label" == "docker-compose.admin-tailscale.yml" ]]; then
    if rg -q '0\.0\.0\.0:\$\{ADMIN_PORT|0\.0\.0\.0:[0-9]+' "$compose" 2>/dev/null; then
      echo "FAIL [$label]: admin must bind to TAILSCALE_IP, not 0.0.0.0" >&2
      FAIL=1
    fi
    if ! rg -q 'TAILSCALE_IP' "$compose"; then
      echo "FAIL [$label]: expected TAILSCALE_IP-scoped port publish" >&2
      FAIL=1
    fi
  fi
}

check_compose_file "$ROOT/docker-compose.prod.yml" "docker-compose.prod.yml"
check_compose_file "$ROOT/docker-compose.admin-tailscale.yml" "docker-compose.admin-tailscale.yml"

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi

echo "Production compose port policy: OK (nginx 80/443 on prod; admin Tailscale-scoped only)"
