# Production readiness checklist

Mark each: **Pass** | **Fail** | **Not tested**. Evidence = file, test ID, or operator log (redacted).

## Authentication & sessions

| Control | Status | Evidence |
|---------|--------|----------|
| Passwords hashed (APIO bcrypt 12) | Pass | `auth.js` |
| Passwords hashed (Dribex) | Pass | backend security module (CI) |
| JWT alg pinned HS256 (APIO) | Pass | `auth.js`, `adminAuth.js` |
| Weak JWT secret blocked in prod (APIO) | Pass | `startup.js` |
| Email verification before login (APIO) | Pass | `authVerification.js`, tests |
| Rate limit on login (APIO) | Pass | `index.js` limiters |
| Staff MFA (Dribex admin) | Not tested | Config `ADMIN_REQUIRE_STAFF_MFA` |
| Session invalidation on suspend (APIO) | Pass | `resolveUserFromPublicToken` + tests |
| Session invalidation on password change (APIO) | Fail | DRB-M-001 |

## Authorization

| Control | Status | Evidence |
|---------|--------|----------|
| APIO admin only SUPER_ADMIN | Pass | `adminAuth.js`, routes |
| APIO public admin routes 404 | Pass | `publicAdminGuard.js`, `test-admin-network.js` |
| APIO owner IDOR checks | Pass | `ownerPortal.js`, `test-authorization.js` (when run) |
| Dribex per-route Depends | Pass | Code review |
| Dribex admin IP allowlist | Not tested | Requires prod env |
| Role escalation via register body rejected | Pass | `rejectRoleInBody`, client tests |

## APIO admin exposure

| Control | Status | Evidence |
|---------|--------|----------|
| Admin not on dribex.ma public SPA path | Pass | nginx + separate container |
| Port 7217/7218 not internet-open | **Not tested** | DRB-H-001 |
| Tailscale Serve correct backend | **Not tested** | Ops docs |
| Admin API routes deployed match UI | Fail/Open | DRB-H-002 until verified post-sync |

## Infrastructure

| Control | Status | Evidence |
|---------|--------|----------|
| Postgres not public | Pass (compose) | `docker-compose.prod.yml` |
| TLS to users (Cloudflare) | Not tested | — |
| Backups scheduled | Not tested | `backup.sh` exists |
| Restore tested | Not tested | — |
| Secrets not in Git | Pass (samples only) | gitleaks in CI |

## Dependencies & CI

| Control | Status | Evidence |
|---------|--------|----------|
| Backend pytest | Not tested (VM) | CI job defined |
| pip-audit strict | Not tested (VM) | CI |
| gitleaks | Not tested (VM) | CI |
| APIO offline security tests | Pass | TEST_EVIDENCE.md |

## Release blockers

1. **DRB-H-001** — Live admin port exposure check.  
2. **DRB-H-002** — Full APIO deploy parity (`apio-sync-source.sh` + rebuild + curl `/api/admin/users`).  
3. **DRB-H-003** — Production secrets not defaults (operator attestation).

## Verification owner

| Area | Owner |
|------|--------|
| piocco / Docker | Platform operator |
| Cloudflare | DNS/admin |
| Application | Engineering + CI |
| APIO admin | APIO on-call / operator |
