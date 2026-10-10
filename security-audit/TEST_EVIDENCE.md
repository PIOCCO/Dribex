# Test evidence

**Environment:** Cursor cloud audit VM, Linux, 2026-10-10. **Not production.**

## Tests executed

| ID | Component | Preconditions | Expected | Actual | Result |
|----|-----------|---------------|----------|--------|--------|
| T-001 | APIO offline admin users | Temp SQLite, `DATABASE_PATH` | Guards for self-suspend, delete confirm, promote client | All assertions OK | **Pass** |
| T-002 | APIO session resolution | Temp SQLite, JWT test secrets | Forged role ignored; suspend rejects | 6/6 OK | **Pass** |
| T-003 | APIO live suite (prior session) | Local servers + SMTP capture | 108 integration assertions | Passed in earlier audit turn | **Pass** (not re-run this turn) |
| T-004 | Dribex pytest | Postgres | Full suite green | Connection refused — no DB | **Not tested** |
| T-005 | gitleaks | repo | No secrets | Tool not installed locally | **Not tested** (CI only) |
| T-006 | pip-audit | backend venv | No vulns | Not run | **Not tested** |
| T-007 | npm audit APIO server | `npm install` | Report only | 2 moderate | **Pass (scan)** |
| T-008 | Production port scan | Internet | 7217 closed | No host access | **Not tested** |
| T-009 | Cloudflare health | dribex.ma | 200/JSON | Not run | **Not tested** |

## Commands (exact)

```bash
# Git context
cd /workspace && git rev-parse --short HEAD
# b21cea3 on cursor/apio-admin-i18n-8c79

# Tracked APIO server files count
git ls-files 'souq-local/apio/server/src' | wc -l
# 10

# APIO offline tests
cd /workspace/souq-local/apio/server
node scripts/test-admin-users.js
node scripts/test-auth-session-offline.js

# npm audit (summary)
npm audit --json  # apio/server: metadata.vulnerabilities.total = 2 moderate
```

## Sample redacted output (T-001)

```
OK  lists all roles
OK  cannot suspend own admin account
OK  suspend client
OK  super admin count
OK  cannot demote own super admin role
OK  delete requires matching confirm email
OK  cannot delete own admin account
OK  client promoted to owner with auto profile
admin users regression passed
```

## Sample redacted output (T-002)

```
OK  valid token resolves client
OK  forged JWT role ignored (still CLIENT)
OK  suspended user rejected
OK  role change reflected without re-login
OK  admin token resolves super admin
OK  demoted admin token invalidated
auth session offline tests passed
```

## Limitations

- Workspace **≠** piocco; Docker compose on prod may differ.
- Large APIO tree **untracked** — tests ran against disk copy, which may exceed what Git deploys.
- No browser DAST, no Burp, no load testing.

## Recommended follow-up tests (operator)

1. From laptop **without** Tailscale: `curl -m 5 http://<public-ip>:7217/api/health` → expect failure.
2. With Tailscale: admin login + role change on test user.
3. Trigger CI on release branch and archive artifacts.
