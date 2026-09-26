# APIO on Dribex production (`https://dribex.ma/APIO/`)

Full **APIO** (Vite SPA + Express API) lives here. It is **not** part of `./scripts/production-deploy.sh`.

## 1. Copy finished app from Azelos

```bash
AZELos_BRANCH=cursor/client-security-hardening-3967
git clone --branch "$AZELos_BRANCH" --depth 1 https://github.com/PIOCCO/Azelos.git /tmp/Azelos-apio

rsync -a --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude server/node_modules \
  --exclude server/data \
  /tmp/Azelos-apio/maisonmaroc/ \
  /path/to/MarGem/souq-local/apio/
```

Required layout after sync:

```text
souq-local/apio/
  package.json          # npm run build:apio
  server/               # Express API
  Dockerfile.web        # (from this repo — do not overwrite)
  Dockerfile.server
  nginx-default.conf
```

## 2. Configure secrets (never commit)

```bash
cd souq-local/infra/onprem
cp env.apio.prod.example .env.apio.prod
# Edit JWT_SECRET, SUPER_ADMIN_*, GOOGLE_*, SMTP_*
chmod 600 .env.apio.prod
```

Google Cloud Console (Web OAuth client for APIO):

- **JavaScript origins:** `https://dribex.ma`
- **Redirect URI:** `https://dribex.ma/APIO/api/auth/google/callback`

Dribex **mobile** OAuth clients stay unchanged.

## 3. Deploy on the server

Disable the old static `/AIPO` demo if it was enabled:

```bash
./scripts/aipo-demo-disable.sh
```

Deploy APIO:

```bash
./scripts/apio-prod-deploy.sh
```

## 4. Verify

- `https://dribex.ma/` — Dribex storefront
- `https://dribex.ma/APIO/` — APIO SPA
- `https://dribex.ma/APIO/api/health` — API OK
- Google sign-in on APIO — users only in APIO SQLite volume

## Data

APIO uses its **own** database file on Docker volume `apio_data` (`/data/apio.sqlite`). It does **not** use Dribex Postgres.

## Super-admin only on Tailscale (nginx)

In `.env.apio.prod`:

```env
APIO_ADMIN_IP_ALLOWLIST=100.64.0.0/10,YOUR.OFFICE.IP.IF.ANY
```

Redeploy: `./scripts/apio-prod-deploy.sh`

Blocked paths for everyone else (403): `/APIO/admin`, `/APIO/api/admin`, `/APIO/api/auth/admin`.

**How to open admin:** connect **Tailscale** on your laptop/phone, then hit the **origin** so nginx sees a `100.x` address — not only the public Cloudflare URL.

1. On the server: `tailscale ip -4` → e.g. `100.x.y.z`
2. On a device with Tailscale on, browse:  
   `https://100.x.y.z/APIO/admin/login`  
   (certificate may warn unless you use a name that matches your cert — see below)
3. Or add a **hosts** / split-DNS entry for a name on your cert that resolves to the **Tailscale IP** while on the tailnet.

If `https://dribex.ma/APIO/admin` goes through **Cloudflare orange cloud**, nginx usually sees **Cloudflare’s IP**, not your Tailscale IP — the allowlist will **403**. Use direct Tailscale-to-origin access above, or Cloudflare Access for that path.

Public client/owner pages at `/APIO/` stay open.
