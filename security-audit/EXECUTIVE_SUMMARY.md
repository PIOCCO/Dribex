# Executive summary — Dribex & APIO production security audit

**Audit date:** 2026-10-10 (UTC)  
**Scope:** Repository inspection (`/workspace`, branch `cursor/apio-admin-i18n-8c79`, commit `b21cea3`), safe local tests on audit VM. **No production host access, no container restarts, no credential rotation, no destructive testing.**  
**Auditor mode:** Read-only defensive assessment per owner authorization.

## Verdict

**READY AFTER SPECIFIED FIXES**

The architecture shows intentional separation of public marketplace (Dribex FastAPI + Next.js), public APIO real-estate stack, and high-value APIO super-admin on a **separate listener** with network guards. Code review and local APIO regression tests support **server-side authorization** for admin and owner flows. **Production readiness cannot be fully certified** from this VM because: (1) the on-prem Ubuntu host, Cloudflare edge, and live port bindings were **not inspected live**; (2) Dribex backend `pytest` was **not executed** here (Postgres unavailable); (3) **APIO server source is largely untracked in Git** (~10 tracked files under `souq-local/apio/server/src/` vs full tree on disk), creating **deploy drift** risk.

## Critical blockers (release)

| ID | Issue | Why it blocks “unqualified READY” |
|----|--------|-----------------------------------|
| — | **No confirmed Critical** remote-compromise finding in static review | — |

Treat as **release gates** (High / operational):

1. **DRB-H-001** — Verify production APIO admin is **not** internet-reachable except via Tailscale/VPN; confirm `APIO_ADMIN_BIND`, `APIO_ADMIN_ALLOWED_NETWORKS`, and Tailscale Serve mapping on piocco (**Not tested live**).
2. **DRB-H-002** — Commit and deploy **full APIO source**; until then, `apio-sync-source.sh` overlay must stay correct or admin API routes/UI diverge (**Confirmed drift mechanism**).
3. **DRB-H-003** — Confirm production secrets: `JWT_SECRET`, `APIO_ADMIN_JWT_SECRET`, `JWT_SECRET_KEY`, `SUPER_ADMIN_PASSWORD`, DB passwords — **not** defaults; rotation if ever exposed (**Not verified on host**).

## Confirmed vulnerabilities / weaknesses (summary)

| Severity | Count | Examples |
|----------|-------|----------|
| Critical | 0 | — |
| High | 2 | Deploy/source drift (APIO); production exposure of admin port **unverified** |
| Medium | 6 | JWT sessions not revoked on password change (APIO); Vault TLS disabled internal; partial nginx admin allowlist dependency; npm moderate (APIO uuid); APIO CSRF model (cookie + SameSite only); Git tracking gap |
| Low | 5+ | Dev LAN CORS bypass when non-production; health endpoints public; etc. |

Full detail: `FINDINGS.md`.

## Major unknowns (must not be marked “pass”)

- Live **Cloudflare → origin** health (historical 522/521).
- **Origin IP** bypass of Cloudflare WAF.
- **UFW/SSH** posture on Ubuntu production host.
- **Backup restore** drill on piocco.
- **Google OAuth** production client SHA / redirect URIs on live deploy.
- Whether **`margem-prod-apio-admin`** was stopped or recreated since last operator change.

## Recommended release decision

| Stakeholder action | Recommendation |
|--------------------|----------------|
| **Owner / ops** | Run `PRODUCTION_READINESS_CHECKLIST.md` on piocco with evidence screenshots/redacted logs; fix **DRB-H-001–003** before marketing “continuous production.” |
| **Engineering** | Merge full APIO tree to Git; keep CI green (`margem-ci.yml`); pin dependency upgrades with tests. |
| **Security** | Re-audit after deploy sync fix and live admin port scan from outside Tailscale. |

## Evidence basis

- Architecture: `ARCHITECTURE_AND_ATTACK_SURFACE.md`
- 40+ findings: `FINDINGS.md`
- Tests run: `TEST_EVIDENCE.md`
- Scans: `DEPENDENCY_AND_SECRET_SCAN.md`
