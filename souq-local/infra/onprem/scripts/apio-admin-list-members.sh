#!/usr/bin/env bash
# Compare member rows visible to apio-admin vs apio-server (same apio_data volume).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/apio-load-env.sh
source "$ROOT/scripts/apio-load-env.sh" 2>/dev/null || true

sql() {
  local cid="$1"
  docker exec "$cid" node -e "
const Database=require('better-sqlite3');
const p=process.env.DATABASE_PATH||'/data/apio.sqlite';
const db=new Database(p,{readonly:true});
const rows=db.prepare(\"SELECT email, role, status, owner_profile_id FROM users WHERE role='REAL_ESTATE_OWNER' ORDER BY created_at DESC LIMIT 20\").all();
console.log(JSON.stringify({db:p,count:rows.length,rows},null,2));
"
}

for name in margem-prod-apio-admin-1 margem-prod-apio-server-1; do
  if docker ps --format '{{.Names}}' | grep -qx "$name"; then
    echo "==> $name"
    sql "$name"
    echo
  fi
done

echo "If counts differ, DATABASE_PATH or apio_data volume is not shared between containers."
