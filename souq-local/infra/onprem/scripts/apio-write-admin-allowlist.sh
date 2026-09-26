#!/usr/bin/env bash
# Generate nginx allow rules for APIO admin from .env.apio.prod
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env.apio.prod}"
OUT="$ROOT/nginx/server.d/dribex-ma/apio-admin-allow.conf"

list="${APIO_ADMIN_IP_ALLOWLIST:-}"
if [[ -f "$ENV_FILE" ]]; then
  line="$(grep -E '^APIO_ADMIN_IP_ALLOWLIST=' "$ENV_FILE" | tail -n 1 || true)"
  if [[ -n "$line" ]]; then
    list="${line#APIO_ADMIN_IP_ALLOWLIST=}"
    list="${list%\"}"
    list="${list#\"}"
  fi
fi

if [[ -z "$list" ]]; then
  list="100.64.0.0/10,127.0.0.1"
fi

{
  echo "# Generated from APIO_ADMIN_IP_ALLOWLIST — do not edit by hand"
  IFS=',' read -ra parts <<< "$list"
  for cidr in "${parts[@]}"; do
    cidr="$(echo "$cidr" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -z "$cidr" ]] && continue
    echo "allow $cidr;"
  done
} > "$OUT"

echo "Wrote $OUT"
