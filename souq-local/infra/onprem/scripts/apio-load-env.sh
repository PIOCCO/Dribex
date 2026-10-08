#!/usr/bin/env bash
# Export APIO_ADMIN_* from .env.apio.prod for docker compose interpolation (bind/port in YAML).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${APIO_ENV_FILE:-$ROOT/.env.apio.prod}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
  export APIO_ADMIN_PORT APIO_ADMIN_BIND APIO_ADMIN_ALLOWED_NETWORKS APIO_ADMIN_ALLOW_HTTP
fi
