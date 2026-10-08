# Dribex / MarGem — Full production audit (2026-04-08)

This document records **what was inspected**, **what was fixed in-repo**, **what was verified in this environment**, and **what still requires production-only validation**. It is not a certification of zero risk.

## A. Architecture discovered

| Layer | Component | Technology | Production entry |
|--------|-----------|------------|------------------|
| Public edge | Nginx | TLS 443, rate limits | `dribex.ma`, `www.dribex.ma` → web; `api.dribex.ma` → FastAPI |
| Storefront | `souq-local/web` | Next.js 15, next-intl (ar/fr/en) | Proxied at `/` on dribex.ma |
| Core API | `souq-local/backend` | FastAPI, async SQLAlchemy, Alembic | `api.dribex.ma` / internal `api:8000` |
| Data | PostgreSQL, Redis, MinIO | Docker internal network | Not published on public host ports |
| Mobile | `souq-local/mobile` | Flutter | Uses public API URL |
| APIO public | `souq-local/apio` (Vite SPA + Node API) | SQLite on `apio_data` volume | `https://dribex.ma/APIO/` + `/APIO/api/*` |
| APIO super-admin | `apio-admin` container | Express, host network, port 7217/7218 | Tailscale / loopback only — **not** public `/APIO/admin` |
| Ops | `souq-local/infra/onprem` | Compose, scripts, nginx snippets | piocco-style bare-metal / VM |
| CI | `.github/workflows/margem-ci.yml` | pytest, web build, gitleaks, pip-audit, compose config | GitHub Actions |
| Demo / portfolio | `app/`, SCAD terraform | Separate from Dribex prod path | Not Dribex production |

**Git baseline (audit run):** branch `cursor/apio-admin-i18n-8c79`; **large APIO tree present on disk but mostly untracked** (~34 tracked paths under `souq-local/apio/` vs full app on disk). Uncommitted modifications preserved (no `git reset --hard` / `git clean`).

---

## B. Critical findings

| Severity | Component | Evidence | Impact | Resolution |
|----------|-----------|----------|--------|------------|
| **High** | APIO `nodemailer` | `npm audit`: multiple GHSA on ≤10.0.5 | SMTP/header injection, DoS via address parsing | **Fixed:** bump to `^10.0.16` in `apio/server/package.json` |
| **High** | APIO JWT verification | `jwt.verify` without `algorithms` | Algorithm confusion / `none` class issues | **Fixed:** pin `HS256` in `auth.js` + `adminAuth.js` |
| **High** | APIO source in Git | `git ls-files souq-local/apio` ≪ files on disk | Deploy/rebuild drift, piocco out of sync | **Open:** commit full APIO tree (exclude `.env*`) via dedicated PR; use `apio-sync-source.sh` on server until then |
| **Medium** | Admin member list UX | Live search refetch; count = filtered only | Operators see « 1 membre(s) » while DB has more | **Fixed** (prior commit): apply search on button/Enter; API `total`; filter banner |
| **Medium** | APIO public routing | Next.js 404 on `/APIO/api/auth/owner/login` | Wrong URL / missing nginx `/APIO` | **Fixed:** nginx redirect, Next fallback, `apio-prod-status.sh` |
| **Medium** | Dribex backend tests | pytest requires PostgreSQL | CI validates; local agent had no DB/Docker | **Verified in CI workflow definition**; local run **skipped** (no Postgres/Docker here) |
| **Medium** | `uuid` (APIO transitive) | npm audit moderate via `gaxios` | Low direct exploitability for APIO mail path | **Open:** monitor; upgrade when `google-auth-library` chain allows |
| **Low** | Vault in on-prem compose | README: file mode, no TLS | Secret store not enterprise-grade | **Documented** in `infra/onprem/README.md`; use `.env.prod` rotation process |
| **Info** | SCAD root README | Describes demo `app/` not Dribex | Confusion for new operators | Use `souq-local/README.md` + `infra/onprem/README.md` as canonical |

---

## C. Changes made (this audit)

| File | Action | Reason |
|------|--------|--------|
| `apio/server/src/auth.js` | Modified | JWT `HS256` only for sign/verify |
| `apio/server/src/adminAuth.js` | Modified | Admin JWT `HS256` only |
| `apio/server/package.json` | Modified | `nodemailer@^10.0.16`, `test:admin-members-list` |
| `apio/server/package-lock.json` | Modified | Lock nodemailer upgrade |
| `apio/server/scripts/test-admin-members-list.js` | Added | Offline regression for list + `total` |
| `apio/server/src/db.js` | Modified | Read `DATABASE_PATH` at `openDb()` time (tests + runtime consistency) |
| `infra/onprem/scripts/audit-baseline.sh` | Added | Safe baseline runner for operators |
| `docs/DRIBEX-FULL-PRODUCTION-AUDIT.md` | Added | This report |

Prior branch commits (same effort): APIO nginx/owner login, admin members list, Postgres sync scripts, jinja2 for Sentry, etc.

**Not done:** mass deletion of “unused” files; production deploy; credential rotation; full `git add` of untracked APIO without review.

---

## D. Security improvements (verified in code)

- JWT algorithm pinning (APIO public + admin cookies).
- Nodemailer upgraded to patched 10.x line.
- Existing controls retained: APIO `assertServerConfig()` (production exit unless `STRICT_CONFIG=false`), admin network allowlist, separate admin JWT + cookie, rate limits, Helmet CSP, bcrypt passwords, server-side admin authorization on `/api/admin/*`.
- Dribex backend: extensive authz tests in tree (`test_admin_security`, `test_sellers_authz`, `test_ops_security`, …) — **execution depends on Postgres**.

---

## E. Bug fixes and cleanup

- Admin members: total vs filtered counts, search behavior, company/phone in server filter.
- Owner login 404: routing documentation and redirects.
- Operational scripts: `apio-prod-status.sh`, `audit-baseline.sh`, Postgres password sync helpers.

---

## F. Validation results (this environment)

| Check | Result |
|-------|--------|
| APIO `test-admin-members-list.js` | **Passed** |
| APIO `npm audit` (direct deps) | **Passed** after nodemailer bump; **moderate** remains on transitive `uuid` |
| APIO `build:apio` | **Passed** (earlier on branch) |
| Dribex `web` `npm run build` | **Passed** with `NEXT_PUBLIC_API_BASE_URL=https://api.dribex.ma` |
| Dribex backend `pytest` | **Not run** — PostgreSQL/Docker unavailable on audit VM |
| `pip-audit` | **Unavailable** (`pip-audit` not installed); CI runs it in `margem-ci.yml` |
| Gitleaks / Trivy | **Not run locally**; defined in GitHub workflows |
| Production gate on piocco | **Not run** — requires host access |

---

## G. Remaining risks / manual checks

1. **Commit full APIO source** to Git and align piocco with `git pull` (not only `apio-sync-source.sh` tar).
2. **Production secrets:** rotate if ever exposed; confirm `JWT_SECRET`, `APIO_ADMIN_JWT_SECRET`, `POSTGRES_PASSWORD` match volumes.
3. **APIO admin exposure:** confirm Tailscale Serve vs bind IP; run `apio-admin-status.sh` after every recreate.
4. **Cloudflare 521/522:** origin health — `production-gate-check.sh`, nginx up, API `/ready`.
5. **Backups:** confirm cron for `infra/onprem/scripts/backup.sh` and off-site copy.
6. **Legal/compliance:** privacy retention and DPA — organizational, not fully auditable from code alone.

---

## H. Deployment plan (safest order)

On **piocco** (or staging with same compose):

```bash
cd ~/MarGem/souq-local
git fetch && git checkout <audit-branch> && git pull

# 1) Backup (do not skip on prod)
cd infra/onprem
./scripts/backup.sh

# 2) Validate env (example → your .env.prod)
./scripts/validate-production-env.sh .env.prod

# 3) Dribex core
./scripts/dribex-postgres-verify-env.sh
./scripts/dribex-postgres-sync-password.sh   # if api auth errors
./scripts/production-deploy.sh               # migrations + rolling up

# 4) APIO
./scripts/apio-prod-deploy.sh
./scripts/apio-admin-rebuild.sh

# 5) Baseline
./scripts/audit-baseline.sh
./scripts/production-gate-check.sh
curl -s https://dribex.ma/APIO/api/health
curl -sI https://dribex.ma/APIO/owner/login
```

**Rollback:** restore previous images via compose; DB restore only with `./scripts/restore.sh` and typed confirmation; never truncate SQLite/Postgres without backup.

---

## I. Final assessment

**Classification: Conditionally ready for production** for the **verified scope**:

- Dribex on-prem stack **when** CI-green, env validated, backups current, Postgres password synced, nginx/API healthy.
- APIO public + Tailscale admin **when** full source is deployed, `apio_data` shared, nginx `/APIO` snippets installed, secrets set per `assertServerConfig()`.

**Not ready** as a **single-click “fully audited”** claim: APIO Git tracking gap, unverified pytest/pip-audit on this VM, and production-only networking/Tailscale checks remain operator responsibilities.

---

*Generated as part of a repository audit pass; re-run `./infra/onprem/scripts/audit-baseline.sh` after pulls or infra changes.*
