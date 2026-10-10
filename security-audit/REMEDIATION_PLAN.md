# Remediation plan (prioritized)

**No production changes were made during this audit.** Implement in staging first; rollback via previous Docker image + DB backup.

## P0 — Before claiming “internet-safe production”

| Priority | Finding | Action | Impact | Rollback |
|----------|---------|--------|--------|----------|
| P0 | DRB-H-001 | On piocco: `./scripts/apio-admin-status.sh`; verify loopback bind; external port scan | None if already correct | Revert `.env.apio.prod` bind |
| P0 | DRB-H-002 | `git pull`; `./scripts/apio-sync-source.sh`; `./scripts/apio-admin-rebuild.sh`; verify users API | Brief admin downtime | Previous image tag |
| P0 | DRB-H-003 | Confirm rotated secrets; document in password vault | Invalidates sessions | Restore env backup |

## P1 — High value, low blast radius

| Priority | Finding | Action | Tests |
|----------|---------|--------|-------|
| P1 | DRB-H-002 long-term | Commit full `souq-local/apio` to Git; CI build APIO images | `npm test` in server |
| P1 | DRB-M-001 | Add `token_version` to APIO users + JWT claim | New integration test |
| P1 | DRB-M-006 | Set `ADMIN_IP_ALLOWLIST` to Tailscale CIDRs in `.env.prod` | Admin login from allowed IP only |

## P2 — Medium

| Finding | Action |
|---------|--------|
| DRB-M-002 | Enable Vault TLS or remove service |
| DRB-M-005 | Upgrade uuid/google-auth-library when compatible |
| DRB-M-004 | Stricter Origin checks on APIO POST (admin already Strict SameSite) |

## P3 — Continuous

- Run `margem-ci.yml` on every release branch.
- Monthly backup restore to staging.
- Cloudflare origin lock + WAF rules review.
- Dependency bumps with `npm audit` / `pip-audit` diff review.

## Safe implementation notes

- **APIO rebuild:** uses `--no-cache` in `apio-admin-rebuild.sh`; plan 5–10 min maintenance window.
- **DB migrations:** Dribex via Alembic in `production-deploy.sh`; always backup first.
- **Never** run `git clean` on piocco with uncommitted operator scripts.
