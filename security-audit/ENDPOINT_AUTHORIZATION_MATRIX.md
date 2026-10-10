# Endpoint authorization matrix

**Note:** Dribex has ~210 HTTP routes across routers; this matrix summarizes **families**. Full inventory: run `openapi.json` from running API or static analysis of `souq-local/backend/app/routers/`. APIO routes below are from **workspace source** (may differ on prod if deploy drift — see DRB-H-002).

**Exposure key:** Public = internet via Cloudflare/nginx; Admin-private = Tailscale/loopback 7217/7218; Internal = Docker network only.

---

## APIO public API (`apio-server`, `/APIO/api/`)

| Method | Route pattern | Auth | Role | Exposure | Sensitive data | Verified |
|--------|---------------|------|------|----------|----------------|----------|
| GET | `/api/health` | None | — | Public | No | Code |
| GET | `/api/properties*` | None | — | Public | Listing metadata | Code |
| GET | `/api/public/members`, `/api/listings/*` | None | — | Public | Public profiles | Code |
| GET | `/api/content/*` | None | — | Public | CMS content | Code |
| POST | `/api/contact` | None | — | Public | User message | Code + rate limit |
| POST | `/api/auth/client/register` | None | — | Public | Creates user | Code + tests |
| POST | `/api/auth/client/login` | None | — | Public | Sets cookie | Code + tests |
| POST | `/api/auth/owner/login` | None | — | Public | Sets cookie | Code + tests |
| POST | `/api/auth/owner/register` | — | — | Public | **403 denied** | Code |
| GET/POST | `/api/auth/google*` | Partial | — | Public | OAuth | Code |
| GET | `/api/auth/me` | Cookie/Bearer | ACTIVE user | Public | Profile | Code |
| POST | `/api/auth/logout` | Optional | — | Public | Clears cookie | Code |
| POST | `/api/auth/password/*`, verify-email | None/token | — | Public | Reset/verify | Code + offline tests |
| GET | `/api/owner/*` | Cookie | REAL_ESTATE_OWNER | Public | Owner data | Code + IDOR tests |
| POST/PATCH/DELETE | `/api/owner/projects*` | Cookie | OWNER + ownership | Public | Listings | `test-authorization.js` |
| GET/POST | `/api/messages/*` | Cookie | CLIENT/OWNER + conversation ACL | Public | Messages | `test-security.js` |
| GET/POST | `/api/admin/*` | — | — | Public listener | **404 hidden** | `publicAdminGuard.js` + tests |

---

## APIO admin API (`apio-admin`, port 7217/7218)

| Method | Route pattern | Auth | Role | Exposure | Verified |
|--------|---------------|------|------|----------|----------|
| GET | `/api/health` | None | — | Admin-private | Code |
| POST | `/api/auth/admin/login` | None | — | Admin-private | Code + tests |
| GET | `/api/auth/me` | Admin cookie | SUPER_ADMIN | Admin-private | Code |
| GET/PATCH/DELETE | `/api/admin/owners*` | Admin cookie | SUPER_ADMIN | Admin-private | Code |
| GET/POST/PATCH | `/api/admin/members*` | Admin cookie | SUPER_ADMIN | Admin-private | Code |
| GET/PATCH/POST | `/api/admin/users*` | Admin cookie | SUPER_ADMIN | Admin-private | Code + offline tests |
| GET | `/api/admin/stats`, `/api/admin/audit` | Admin cookie | SUPER_ADMIN | Admin-private | Code |
| GET/POST/PATCH/DELETE | `/api/admin/news|events|documents*` | Admin cookie | SUPER_ADMIN | Admin-private | Code |
| GET/PATCH | `/api/admin/member-projects*` | Admin cookie | SUPER_ADMIN | Admin-private | Code |
| * | `/api/*` | Network guard first | — | Admin-private | `adminNetwork.js` |

**Network guard:** Requests from IPs outside `APIO_ADMIN_ALLOWED_NETWORKS` → **403** (unless `APIO_ADMIN_NETWORK_GUARD=false`).

---

## Dribex API (FastAPI) — route families

| Prefix / family | Auth dependency | Roles | Exposure | Notes |
|-----------------|-----------------|-------|----------|-------|
| `/auth/*` | Mixed | — | Public | Register, login, MFA, sessions |
| `/catalog`, `/search`, `/geography` | Mostly public | — | Public | Read-only catalog |
| `/sellers/*`, `/seller/*` | `require_seller`, verified email | PROVIDER | Public | Seller operations |
| `/discovery/*`, `/favorites`, `/follows` | `get_current_user` | CUSTOMER+ | Public | User-specific reads/writes |
| `/uploads/*` | Authenticated | Seller/user | Public | Upload tokens |
| `/admin/advertisements/*` | `require_admin` | ADMIN | Public API + **IP/origin guard** | Ad CRUD |
| `/admin/marketplaces/*` | `require_admin` | ADMIN | Guarded | |
| `/admin/*` moderation | `require_staff` / `require_admin` | STAFF/ADMIN | Guarded | Reports, privacy |
| `/billing/admin/*` | staff/admin | STAFF/ADMIN | Guarded | |
| `/seller_ops` `/admin/users` | staff/admin | STAFF/ADMIN | Guarded | User admin |
| `/community/admin/*` | staff/admin | STAFF/ADMIN | Guarded | |
| `/live`, `/ready`, `/health` | None | — | Public/ops | No secrets in body |
| `/metrics` | Internal network check | — | Restricted | Not JWT |

**Middleware:** `AdminIpGuardMiddleware`, `AdminOriginGuardMiddleware` on admin paths (`admin_paths.py`).

---

## Role vs capability (summary)

| Capability | Dribex | APIO public | APIO admin |
|------------|--------|-------------|------------|
| Browse listings | All | All | — |
| Client messaging | CUSTOMER | CLIENT | — |
| Owner listings | PROVIDER | REAL_ESTATE_OWNER | — |
| Platform admin | ADMIN/STAFF + guards | — | SUPER_ADMIN + network |
| Change any user role | ADMIN (Dribex) | — | SUPER_ADMIN (APIO) |

**Frontend hiding is not authorization.** All checks above must be enforced in Node/Python handlers (verified by code review + tests where run).
