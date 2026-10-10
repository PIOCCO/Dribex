# Security findings — Dribex & APIO

**Legend:** Confidence = High (code/config evidence), Medium (inferred), Low (hypothesis). Status = Open / Mitigated / Not verified.

---

## DRB-H-001 — APIO admin network exposure (production unverified)

| Field | Value |
|-------|--------|
| Severity | **High** (if port published to 0.0.0.0 or wrong Tailscale config) |
| Confidence | Medium — design is sound; live state unknown |
| Component | `docker-compose.apio.prod.yml` (`network_mode: host`), `.env.apio.prod`, Tailscale Serve |
| Evidence | Admin service uses host networking; bind defaults `127.0.0.1` in `adminIndex.js`; `requireAdminNetwork` in `adminNetwork.js` checks `APIO_ADMIN_ALLOWED_NETWORKS`. |
| Preconditions | Mis-set `APIO_ADMIN_BIND=0.0.0.0` or broken Serve exposing wrong backend |
| Impact | Full super-admin API + SPA if auth bypass or stolen admin cookie |
| Remediation | Run `apio-admin-status.sh`; probe `/api/admin/users` from non-Tailscale IP (expect timeout/refused); document Serve config |
| Validation | External scan from internet (authorized); status script “OK: /api/admin/users exists (401)” on loopback only |
| Status | **Not verified live** |

---

## DRB-H-002 — APIO deploy/source drift (Git vs disk vs Azelos sync)

| Field | Value |
|-------|--------|
| Severity | **High** (operational security) |
| Confidence | High |
| Component | Git index, `apio-sync-source.sh`, Docker build context `souq-local/apio/` |
| Evidence | `git ls-files souq-local/apio/server/src` → **10 files** tracked; workspace contains full `index.js`, `ownerRoutes.js`, etc. as untracked. Overlay historically copied UI without `adminUserRoutes.js` → `Cannot GET /api/admin/users`. Fixed in `apio-sync-source.sh` (commit `ed05698`) but requires operator pull. |
| Impact | Admin UI/API mismatch, missing auth routes, stale JWT hardening |
| Remediation | Commit full APIO tree (exclude `.env*`); deploy via `git pull` + rebuild; verify `adminUserRoutes.js` in container |
| Validation | `apio-verify-source.sh`; curl admin routes after rebuild |
| Status | **Open** |

---

## DRB-M-001 — APIO JWT sessions not invalidated on password change

| Field | Value |
|-------|--------|
| Severity | Medium |
| Confidence | High |
| Component | `middleware.js`, `auth.js` |
| Evidence | `attachUser` reloads user from DB for role/status; no `token_version` or server-side session store for cookie JWT |
| Impact | Stolen token valid until expiry (7d default) after password reset if account still ACTIVE |
| Remediation | Add `token_version` column bumped on password change; verify in JWT payload |
| Validation | Integration test: reset password, old cookie rejected |
| Status | Open |

---

## DRB-M-002 — Vault listener TLS disabled (internal)

| Field | Value |
|-------|--------|
| Severity | Medium (defense in depth) |
| Confidence | High |
| Component | `docker-compose.prod.yml` vault service |
| Evidence | `"tls_disable": true` on `0.0.0.0:8200` inside internal network |
| Impact | Token sniffing if internal network compromised |
| Remediation | TLS + mTLS or remove Vault from prod if unused |
| Status | Open |

---

## DRB-M-003 — APIO public listener admin path defense relies on 404

| Field | Value |
|-------|--------|
| Severity | Medium |
| Confidence | High |
| Component | `publicAdminGuard.js`, nginx `apio-prod.server.conf` |
| Evidence | Public `index.js` uses `blockPublicAdminAccess()` → 404 for `/api/admin/*`; nginx also allowlists `/APIO/api/admin/` |
| Impact | If guard removed, admin API could appear on public port behind nginx allowlist only |
| Remediation | Keep dual layer; integration test `test-admin-network.js` |
| Status | **Mitigated** (code); verify nginx include on prod |

---

## DRB-M-004 — APIO CSRF for cookie-authenticated mutations

| Field | Value |
|-------|--------|
| Severity | Medium (conditional) |
| Confidence | Medium |
| Component | APIO cookies `SameSite=lax`, CORS credentials |
| Evidence | No CSRF token middleware; state-changing POST/PATCH via cookies |
| Preconditions | Cross-site request from allowed origin or future mis-CORS |
| Impact | Unwanted actions on logged-in user |
| Remediation | SameSite=strict for admin cookie (already strict on admin); Origin check on mutations |
| Status | Partially mitigated |

---

## DRB-M-005 — npm moderate: uuid / gaxios (APIO server)

| Field | Value |
|-------|--------|
| Severity | Medium (supply chain) |
| Confidence | High |
| Component | `souq-local/apio/server/package-lock.json` |
| Evidence | `npm audit`: GHSA-w5hq-g745-h8pq, 2 moderate |
| Impact | Limited direct exploitability in APIO mail path; track upgrades |
| Remediation | Upgrade when google-auth-library chain permits |
| Status | Open |

---

## DRB-M-006 — Dribex admin empty allowlist in strict env

| Field | Value |
|-------|--------|
| Severity | Medium |
| Confidence | High |
| Component | `admin_ip_guard.py` |
| Evidence | Empty `ADMIN_IP_ALLOWLIST` → 403 on admin paths in production |
| Impact | Misconfiguration could deny admin OR if strict check disabled elsewhere, exposure |
| Remediation | Set allowlist to Tailscale CIDR + office IPs in `.env.prod` |
| Status | Not verified on prod |

---

## DRB-L-001 — APIO dev LAN CORS bypass

| Field | Value |
|-------|--------|
| Severity | Low |
| Component | `middleware.js` `isDevLanOrigin` |
| Evidence | Non-production allows RFC1918/Tailscale origins |
| Status | By design; ensure `NODE_ENV=production` in prod |

---

## DRB-L-002 — Default bootstrap credentials in examples

| Field | Value |
|-------|--------|
| Severity | Low / Informational |
| Component | `server/.env.example`, `migrate.js` |
| Evidence | Placeholders `change-me-on-first-login`, `JWT_SECRET=change-me...` |
| Impact | Critical if copied to prod unchanged |
| Remediation | `assertServerConfig()` exits in production for weak secrets |
| Status | Mitigated if STRICT_CONFIG enforced |

---

## DRB-I-001 — APIO role from DB not JWT (positive control)

| Field | Value |
|-------|--------|
| Severity | Informational |
| Evidence | `resolveUserFromPublicToken`; tests `test-auth-session-offline.js` |
| Status | **Mitigated** |

---

## DRB-I-002 — Dribex per-route auth dependencies (positive control)

| Field | Value |
|-------|--------|
| Severity | Informational |
| Evidence | `app/auth.py` `require_admin`, `require_staff`, legal gate on `get_current_user` |
| Status | Design verified in code; pytest not run in audit VM |

---

## DRB-I-003 — bcrypt cost 12 (APIO)

| Field | Value |
|-------|--------|
| Evidence | `auth.js` `hashPassword` rounds 12 |
| Status | Mitigated |

---

## DRB-I-004 — APIO upload validation

| Field | Value |
|-------|--------|
| Evidence | `uploads.js` magic bytes, size limits; tests in `test-security.js` |
| Status | Mitigated (when deployed code matches repo) |

---

## DRB-NT-001 — Cloudflare 522 / origin connectivity

| Status | **Not tested** — document in ops runbooks (`DRIBEX-CLOUDFLARE-521.md` exists) |

---

## DRB-NT-002 — SSH, UFW, unattended upgrades on piocco

| Status | **Not tested** — no host access in this audit |

---

## DRB-NT-003 — gitleaks / pip-audit on this VM

| Status | **Not run locally**; defined in `margem-ci.yml` (CI is canonical for backend secrets/deps)
