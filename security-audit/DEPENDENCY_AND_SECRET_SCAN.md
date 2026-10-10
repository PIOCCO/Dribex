# Dependency and secret scan

**Audit VM date:** 2026-10-10

## Tools

| Tool | Version / source | Run on audit VM? | Scope |
|------|------------------|------------------|--------|
| npm audit | npm bundled | **Yes** — APIO server, Dribex web (partial output) | JS dependencies |
| gitleaks | v8.24.2 per CI | **No** (not installed locally) | `souq-local/` in CI |
| pip-audit | CI | **No** (Postgres/tests N/A) | `backend/requirements.txt` |
| bandit | CI | **No** | Python `app/` |
| Trivy | — | **No** | — |
| Semgrep | — | **No** | — |

**Canonical automated scans:** `.github/workflows/margem-ci.yml` (backend job).

## npm audit — APIO server (`souq-local/apio/server`)

**Command:** `npm audit --json`  
**Result:** 2 **moderate**, 0 high/critical (direct tree).

| Package | Severity | Advisory | Fix |
|---------|----------|----------|-----|
| uuid | Moderate | GHSA-w5hq-g745-h8pq | Major bump available (14.x) — breaking |
| gaxios (transitive) | Moderate | via uuid | Chain from google-auth-library |

## npm audit — Dribex web (`souq-local/web`)

**Result:** Multiple findings in **devDependencies** (eslint/next toolchain), e.g. brace-expansion DoS advisories. **Production runtime bundle** may not include these; treat as CI/dev hardening, not necessarily prod RCE.

## Secret patterns in tracked examples

| File | Variables (names only, values redacted) |
|------|----------------------------------------|
| `souq-local/backend/.env.example` | `JWT_SECRET_KEY`, `UPLOAD_TOKEN_SECRET`, `BREVO_API_KEY` |
| `souq-local/apio/server/.env.example` | `JWT_SECRET`, `APIO_ADMIN_JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, `SUPER_ADMIN_PASSWORD` |
| `souq-local/.env.example` | `POSTGRES_PASSWORD` placeholder comment |

**No live secret values** were printed in this audit.

## Git history scan

**Not executed** on audit VM (gitleaks absent). CI runs gitleaks on push/PR.

## Limitations

- Untracked APIO files on disk are **not** in CI until committed.
- Container image CVE scan (Trivy) not run.
- Lockfile drift between Azelos sync and Git not audited automatically.

## Recommendations

1. Keep CI mandatory on `main`/release branches.
2. Add APIO `npm audit` to CI when APIO is fully tracked.
3. Periodic Trivy on `margem-prod-*` images on piocco (read-only scan).
