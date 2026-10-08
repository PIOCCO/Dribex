#!/usr/bin/env bash
# Refresh super-admin UI: sync Dribex admin source, rebuild Docker image, recreate container.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/scripts/apio-admin-rebuild.sh"
