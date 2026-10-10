# Infrastructure hardening review

**Scope:** Files in repo only. **Production host not accessed.**

## Docker — Dribex (`docker-compose.prod.yml`)

| Control | Status | Evidence |
|---------|--------|----------|
| DB not published to host | **Pass (design)** | `postgres` on `internal` network only |
| API not directly published | **Pass (design)** | nginx front door comment L6–7 |
| Non-root API user | Review Dockerfile | Not fully re-audited in this pass |
| Resource limits | Partial | postgres 1G, APIO 512M |
| Restart policy | `unless-stopped` | Present |
| Privileged mode | Not on core app | Vault `IPC_LOCK` only |
| Docker socket mount | Not seen on app services | — |
| Secrets in compose | Env substitution from `.env.prod` | Placeholders in `env.prod.example` |
| Health checks | postgres, redis, minio, vault, apio | Defined |
| Vault TLS | **Fail (internal)** | `tls_disable: true` — DRB-M-002 |

## Docker — APIO (`docker-compose.apio.prod.yml`)

| Control | Status | Evidence |
|---------|--------|----------|
| `apio-server` / `apio-web` on internal+edge | **Pass** | Outbound HTTPS for OAuth/SMTP |
| `apio-admin` host network | **Risk if misconfigured** | Binds per `.env.apio.prod`; DRB-H-001 |
| Shared volume `apio_data` | SQLite + uploads | Single-writer assumption |
| Compose env override bug | Documented | Comment L52–54: do not override `APIO_ADMIN_*` from wrong env file |
| Depends_on admin → server | **N/A** | Host network cannot resolve service names |

## Nginx / Cloudflare (repo snippets)

| Control | Status | Evidence |
|---------|--------|----------|
| `/APIO/api/admin/` allowlist | **Pass (config)** | `apio-prod.server.conf` + `apio-admin-allow.conf` include |
| `/APIO/admin` SPA blocked default | deny all + allowlist | Same file |
| Rate limit zone `api` | Present | burst 60 |
| TLS termination | At Cloudflare/nginx | **Live cert renewal not tested** |
| Origin IP protection | **Not verified** | Need Cloudflare orange-cloud + firewall |

## Tailscale

| Control | Status | Evidence |
|---------|--------|----------|
| Admin via Serve | Documented | `APIO-ADMIN-TROUBLESHOOTING.md` |
| Wrong Serve → 404 plain text | Documented | Distinct from apio-admin HTML |

## Ubuntu host

| Control | Status |
|---------|--------|
| SSH configuration | **Not tested** |
| UFW / nftables | **Not tested** |
| Listening ports (7217, 5432) | **Not tested** |
| File permissions on `.env.prod` | **Not tested** |
| Backups (`backup.sh`) | Script exists; **restore not tested** |
| Log rotation | **Not tested** |

## Database

| Engine | Exposure | App credentials | Notes |
|--------|----------|-----------------|-------|
| PostgreSQL 16 | Internal Docker | `POSTGRES_USER` / app `DATABASE_URL` | Alembic migrations in CI |
| SQLite APIO | Volume `apio_data` | File path `/data/apio.sqlite` | FK ON in `db.js` |

## Recommendations (no prod changes made)

1. Run port scan **from internet** and **from Tailscale**; compare to expected.
2. Confirm `APIO_ADMIN_BIND=127.0.0.1` inside running container.
3. Encrypt Vault or decommission if unused.
4. Schedule backup restore drill to staging.
