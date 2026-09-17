#!/usr/bin/env bash
# Run marketplace restore with the same Python deps as the API (Docker or backend venv).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOUQ_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"

run_in_venv() {
  cd "${BACKEND_DIR}"
  if [[ ! -d .venv ]]; then
    python3 -m venv .venv
    # shellcheck disable=SC1091
    source .venv/bin/activate
    pip install -q -r requirements.txt
  else
    # shellcheck disable=SC1091
    source .venv/bin/activate
  fi
  PYTHONPATH=. python scripts/restore_casablanca_marketplaces.py
}

run_in_compose() {
  local compose_file="$1"
  local project_dir="$2"
  cd "${project_dir}"
  docker compose -f "${compose_file}" exec -T api \
    bash -lc 'PYTHONPATH=/app python3 /app/scripts/restore_casablanca_marketplaces.py'
}

if [[ -n "${RESTORE_VIA_VENV:-}" ]]; then
  run_in_venv
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  if [[ -f "${SOUQ_ROOT}/docker-compose.yml" ]] && docker compose -f "${SOUQ_ROOT}/docker-compose.yml" ps api 2>/dev/null | grep -qE 'running|Up'; then
    run_in_compose "docker-compose.yml" "${SOUQ_ROOT}"
    exit 0
  fi
  PROD_COMPOSE="${SOUQ_ROOT}/infra/onprem/docker-compose.prod.yml"
  if [[ -f "${PROD_COMPOSE}" ]]; then
    if docker compose -f "${PROD_COMPOSE}" ps api 2>/dev/null | grep -qE 'running|Up'; then
      run_in_compose "docker-compose.prod.yml" "${SOUQ_ROOT}/infra/onprem"
      exit 0
    fi
  fi
fi

echo "No running 'api' container found. Using backend/.venv (RESTORE_VIA_VENV=1 to force)." >&2
run_in_venv
