# Incident recovery runbook

**Use when:** suspected compromise, ransomware, credential leak, or total host failure. **Do not** skip backups.

## 1. Suspected compromise — contain (operator)

1. **Document** time, symptoms (unusual admin actions, new users, outbound spam).
2. **Preserve evidence:** copy container logs (`docker logs … --since …`) and nginx access logs to offline storage — redact cookies/tokens in shared copies.
3. **Network contain (approval required):**
   - Tailscale: disable affected node or revoke admin Serve.
   - Cloudflare: enable “Under Attack” or pause origin routes if active exploitation.
   - Do **not** expose admin port to public as a “fix.”
4. **Do not** delete SQLite/Postgres until snapshot taken.

## 2. Credential rotation order

Rotate in this order after contain:

1. Cloudflare / DNS API tokens (if leaked).
2. `JWT_SECRET_KEY`, `UPLOAD_TOKEN_SECRET` (Dribex) — **invalidates all sessions**.
3. `JWT_SECRET`, `APIO_ADMIN_JWT_SECRET` (APIO) — invalidates APIO cookies.
4. `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`, `BREVO_API_KEY`, Google OAuth client secret.
5. `SUPER_ADMIN_PASSWORD` and all staff MFA re-enrollment.

Update `.env.prod` / `.env.apio.prod` from vault; recreate containers (`production-deploy.sh`, `apio-prod-deploy.sh`).

## 3. Service restoration (piocco)

```bash
cd ~/MarGem/souq-local/infra/onprem
./scripts/backup.sh                    # if still healthy
./scripts/validate-production-env.sh .env.prod
./scripts/production-deploy.sh         # Dribex core
./scripts/apio-prod-deploy.sh
./scripts/apio-admin-rebuild.sh
./scripts/production-gate-check.sh
```

Verify:

- `curl -sS https://dribex.ma/APIO/api/health`
- `curl -sS http://127.0.0.1:7217/api/health` (on host)
- Dribex `/ready` via internal or nginx

## 4. Backup restore

1. Stop write traffic (maintenance page via Cloudflare or nginx).
2. Restore Postgres from latest **tested** backup (`restore.sh` — requires typed confirmation).
3. Restore APIO volume `apio_data` from snapshot if SQLite tampered.
4. Run migrations only if restoring **older** DB into **newer** code — follow Alembic notes.
5. Re-run secret rotation (old DB may contain attacker sessions).

## 5. Recovery verification

| Check | Expected |
|-------|----------|
| Admin login | Super-admin only; audit log sane |
| Public register/login | Works; no default passwords |
| `/api/admin/*` on public APIO port | 404 |
| External scan 7217 | Closed or Tailscale-only |
| gitleaks / audit | No new secrets in Git |

## 6. Post-incident

- Root cause in `FINDINGS.md` style.
- Add regression test for failure mode.
- Update `security-audit/TEST_EVIDENCE.md` with replay steps.

## 7. Cloudflare 522 / origin down (availability)

See `souq-local/infra/onprem/docs/DRIBEX-CLOUDFLARE-521.md`: nginx up, origin reachable, TLS mode, API health — **not a security bypass** but blocks users.
