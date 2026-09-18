#!/usr/bin/env bash
# Restore PostgreSQL and/or MinIO from on-prem backup.sh artifacts.
#
# Usage:
#   ./restore.sh --postgres /var/backups/margem/postgres-YYYYMMDD-HHMMSS.sql.gz
#   ./restore.sh --minio /var/backups/margem/minio-YYYYMMDD-HHMMSS
#   ./restore.sh --full /var/backups/margem/postgres-YYYYMMDD-HHMMSS.sql.gz
#     (auto-detects matching minio-YYYYMMDD-HHMMSS from the postgres timestamp)
#
# Destructive: requires typing RESTORE (or CONFIRM=RESTORE for automation).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.prod}"
COMPOSE="docker compose -f $ROOT/docker-compose.prod.yml --env-file $ENV_FILE"
MC_IMAGE="${MC_IMAGE:-minio/mc:RELEASE.2025-01-17T23-25-50Z}"

MODE=""
POSTGRES_DUMP=""
MINIO_DIR=""

usage() {
  echo "Usage: $0 --postgres DUMP.sql.gz | --minio MINIO_DIR | --full DUMP.sql.gz" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --postgres)
      MODE="postgres"
      POSTGRES_DUMP="${2:-}"
      shift 2
      ;;
    --minio)
      MODE="minio"
      MINIO_DIR="${2:-}"
      shift 2
      ;;
    --full)
      MODE="full"
      POSTGRES_DUMP="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

[[ -n "$MODE" ]] || usage

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

BUCKETS=(
  "${MINIO_BUCKET:-margem-media}"
  "${MINIO_BUCKET_PROFILES:-dribex-profiles}"
  "${MINIO_BUCKET_PRODUCTS:-dribex-products}"
  "${MINIO_BUCKET_LISTINGS:-dribex-listings}"
  "${MINIO_BUCKET_PRIVATE:-dribex-private}"
)

require_confirm() {
  if [[ "${CONFIRM:-}" == "RESTORE" ]]; then
    return 0
  fi
  echo "This operation can overwrite production PostgreSQL and/or MinIO data." >&2
  read -r -p "Type RESTORE to continue: " answer
  [[ "$answer" == "RESTORE" ]] || { echo "Cancelled."; exit 1; }
}

stamp_from_postgres_dump() {
  local base
  base="$(basename "$1")"
  if [[ "$base" =~ ^postgres-([0-9]{8}-[0-9]{6})\.sql\.gz$ ]]; then
    echo "${BASH_REMATCH[1]}"
    return 0
  fi
  return 1
}

resolve_minio_dir_for_stamp() {
  local stamp="$1"
  local candidate="${BACKUP_DIR:-/var/backups/margem}/minio-${stamp}"
  if [[ -d "$candidate" ]]; then
    echo "$candidate"
    return 0
  fi
  return 1
}

if [[ "$MODE" == "full" ]]; then
  [[ -n "$POSTGRES_DUMP" && -f "$POSTGRES_DUMP" ]] || {
    echo "Missing postgres dump: $POSTGRES_DUMP" >&2
    exit 1
  }
  stamp="$(stamp_from_postgres_dump "$POSTGRES_DUMP")" || {
    echo "Cannot parse timestamp from postgres dump filename (expected postgres-YYYYMMDD-HHMMSS.sql.gz)" >&2
    exit 1
  }
  MINIO_DIR="$(resolve_minio_dir_for_stamp "$stamp")" || {
    echo "No matching MinIO backup directory for stamp $stamp under ${BACKUP_DIR:-/var/backups/margem}" >&2
    exit 1
  }
  MODE="both"
fi

if [[ "$MODE" == "postgres" || "$MODE" == "both" ]]; then
  [[ -n "$POSTGRES_DUMP" && -f "$POSTGRES_DUMP" ]] || {
    echo "Missing postgres dump: $POSTGRES_DUMP" >&2
    exit 1
  }
fi

if [[ "$MODE" == "minio" || "$MODE" == "both" ]]; then
  [[ -n "$MINIO_DIR" && -d "$MINIO_DIR" ]] || {
    echo "Missing MinIO backup directory: $MINIO_DIR" >&2
    exit 1
  }
fi

require_confirm

echo "Stopping API to release database connections..."
$COMPOSE stop api web admin 2>/dev/null || true

restore_postgres() {
  local dump="$1"
  local db="${POSTGRES_DB:-margem}"
  local user="${POSTGRES_USER:-margem}"

  echo "Recreating empty database ${db}..."
  $COMPOSE exec -T postgres psql -v ON_ERROR_STOP=1 -U "$user" -d postgres <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${db}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${db};
CREATE DATABASE ${db} OWNER ${user};
SQL

  echo "Restoring PostgreSQL from $dump"
  gunzip -c "$dump" | $COMPOSE exec -T postgres psql -v ON_ERROR_STOP=1 -U "$user" -d "$db"
}

restore_minio() {
  local dir="$1"
  MINIO_NET="$($COMPOSE ps -q minio | xargs -r docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' | head -1)"
  if [[ -z "$MINIO_NET" ]]; then
    echo "ERROR: cannot resolve Docker network for MinIO — is the stack running?" >&2
    exit 1
  fi

  for bucket in "${BUCKETS[@]}"; do
    if [[ ! -d "$dir/$bucket" ]]; then
      echo "WARNING: bucket backup missing in archive: $dir/$bucket (skipped)" >&2
      continue
    fi
    echo "Restoring MinIO bucket: $bucket"
    docker run --rm \
      --network "$MINIO_NET" \
      -v "$dir:/backup:ro" \
      -e "MC_HOST_local=http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@minio:9000" \
      "$MC_IMAGE" \
      mirror --overwrite --remove "/backup/${bucket}" "local/${bucket}"
  done
}

case "$MODE" in
  postgres)
    restore_postgres "$POSTGRES_DUMP"
    ;;
  minio)
    restore_minio "$MINIO_DIR"
    ;;
  both)
    restore_postgres "$POSTGRES_DUMP"
    restore_minio "$MINIO_DIR"
    ;;
esac

echo "Starting application services..."
$COMPOSE up -d api web
echo "Restore complete. Verify: $ROOT/scripts/verify-public-api.sh"
