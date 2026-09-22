# Reusing this deployment blueprint for another project

This repository is **Dribex-specific**. You can reuse the on-prem Docker blueprint for another client or product, but you must change identifiers manually. It is **not** vendor-neutral out of the box.

## 1. Public domains and URLs

| Item | Typical Dribex value | Where to change |
|------|---------------------|-----------------|
| Storefront | `https://dribex.ma`, `www.dribex.ma` | `infra/onprem/env.prod.example` → `.env.prod` (`PUBLIC_APP_URL`, `CORS_ORIGINS`, `ALLOWED_HOSTS`) |
| API | `https://api.dribex.ma` | `.env.prod` (`PUBLIC_API_URL`), mobile `scripts/mobile-production-dart-defines.sh` default, `mobile/lib/core/config/app_config.dart` |
| QR links | `https://qr.dribex.ma` | `.env.prod`, mobile dart-defines |
| Nginx `server_name` | `dribex.ma`, `api.dribex.ma` | `infra/onprem/nginx/nginx.conf` |
| TLS bootstrap SANs | `api.dribex.ma`, `dribex.ma`, … | `infra/onprem/scripts/deploy.sh` (openssl `-subj` / `-addext`) |
| Deep links | `dribex://`, host `dribex.ma` | `mobile/android/.../AndroidManifest.xml`, `mobile/ios/Runner/Info.plist`, `scripts/validate-production-safety.sh` expectations |
| Email sender | `@dribex.ma` | `.env.prod` Brevo fields |

After changes, run `./scripts/validate-production-safety.sh` and update checks if your canonical API host is no longer `api.dribex.ma`.

## 2. Database and Docker naming (`margem`)

| Item | Dribex default | Where |
|------|----------------|--------|
| Postgres user/db | `margem` | `.env.prod`, `docker-compose.prod.yml` |
| Compose project / volumes | `margem-prod`, volume names | `docker-compose.prod.yml` |
| Backup directory | `/var/backups/margem` | `infra/onprem/scripts/backup.sh`, `restore.sh` |
| MinIO buckets | `margem-media`, `dribex-*` | `.env.prod` bucket env vars |
| MinIO root user prefix | `margem-minio` | `.env.prod` |

Search the repo for `margem` and `dribex` after rebranding.

## 3. Mobile and OAuth

| Item | Where |
|------|--------|
| `GOOGLE_OAUTH_CLIENT_ID` | `infra/onprem/.env.prod`, Google Cloud Console (Android/iOS/Web clients) |
| `GOOGLE_MAPS_API_KEY` | `.env.prod`, `mobile/android/local.properties` / iOS Secrets |
| Production API URL | `scripts/mobile-production-dart-defines.sh`, CI `.github/workflows/margem-ci.yml` |
| App ID / package | `mobile/android/app/build.gradle`, `applicationId`, Play Console |

## 4. Azure / blueprint (optional, dormant)

| Item | Where |
|------|--------|
| `name_prefix`, `domain_name` | `infra/blueprint/terraform/variables.tf`, `*.tfvars.example` |
| Tags `project = margem` | `infra/blueprint/terraform/variables.tf` |
| Active small Azure stack | `infra/terraform/` (separate from dormant blueprint) |

Do **not** enable `blueprint_enabled` unless you intend to provision enterprise Azure modules.

## 5. Operational paths

| Path | Purpose |
|------|---------|
| `/var/backups/margem` | On-prem backup output (configurable via `BACKUP_DIR`) |
| `infra/onprem/nginx/certs/` | TLS certificates (not in git) |

## 6. Suggested rebrand checklist

1. Choose new domains; update `.env.prod`, nginx, mobile, web, and legal URLs.
2. Regenerate all secrets (JWT, upload token, MFA key, DB, MinIO, Grafana).
3. Replace TLS certificates; do not ship bootstrap self-signed certs publicly.
4. Create new OAuth and Maps keys for the new package/bundle IDs.
5. Run `validate-production-env.sh`, `validate-production-safety.sh`, `validate-compose-ports.sh`.
6. Deploy with **`souq-local/scripts/production-deploy.sh`** only.

## 7. What stays coupled to Dribex

- Product name strings in Flutter l10n and legal markdown under `/legal`.
- Production safety script currently asserts `api.dribex.ma` for release builds — update if your API host differs.
- Historical docs referencing `dribex.ma` in `docs/` and `HOME_SERVER.md`.

Treat this blueprint as a **fork-and-replace** template, not a multi-tenant framework.
