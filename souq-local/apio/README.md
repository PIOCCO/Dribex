# APIO on Dribex production (`https://dribex.ma/APIO/`)

Full **APIO** (public Vite SPA + Express API + **standalone admin** on port **7217**) lives here. It is **not** part of `./scripts/production-deploy.sh`.

## 1. Copy finished app from Azelos

Use a branch that includes **split admin** (`admin/`, `server/src/adminIndex.js`, `npm run build:admin`), e.g. **`cursor/production-audit-3967`**.

```bash
AZELos_BRANCH=cursor/production-audit-3967
git clone --branch "$AZELos_BRANCH" --depth 1 https://github.com/PIOCCO/Azelos.git /tmp/Azelos-apio

rsync -a --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude admin/dist \
  --exclude server/node_modules \
  --exclude server/data \
  /tmp/Azelos-apio/maisonmaroc/ \
  /path/to/MarGem/souq-local/apio/
```

Required layout after sync:

```text
souq-local/apio/
  package.json          # npm run build:apio, build:admin
  admin/                # standalone super-admin SPA
  server/               # index.js (public) + adminIndex.js (admin)
  Dockerfile.web        # from this repo — do not overwrite
  Dockerfile.server
  Dockerfile.admin
  nginx-default.conf
```

## 2. Configure secrets (never commit)

```bash
cd souq-local/infra/onprem
cp env.apio.prod.example .env.apio.prod
# JWT_SECRET, APIO_ADMIN_JWT_SECRET, SUPER_ADMIN_*, GOOGLE_*, SMTP_*
# APIO_ADMIN_ALLOWED_NETWORKS=100.64.0.0/10,127.0.0.0/8
chmod 600 .env.apio.prod
```

Google Cloud Console (Web OAuth client for APIO):

- **JavaScript origins:** `https://dribex.ma`
- **Redirect URI:** `https://dribex.ma/APIO/api/auth/google/callback`

Dribex **mobile** OAuth clients stay unchanged.

## 3. Deploy on the server

```bash
cd ~/MarGem/souq-local/infra/onprem
./scripts/apio-prod-deploy.sh
```

This starts **`apio-server`**, **`apio-web`**, and **`apio-admin`**. Admin is published on the host only when **`TAILSCALE_IP`** is set in `.env.prod` (same pattern as Dribex admin on port 7215).

## 4. Super-admin UI (Tailscale — not public `/APIO/admin`)

The public site at `https://dribex.ma/APIO/admin/*` intentionally shows **403** (admin was removed from the public React app). Use the **admin listener** instead:

| Service | URL |
|---------|-----|
| Public storefront | `https://dribex.ma/APIO/` |
| Public API | `https://dribex.ma/APIO/api/health` |
| **Super-admin** | **`http://<tailscale-ip>:7217/`** (after step 5) |

Log in with **`SUPER_ADMIN_EMAIL`** / **`SUPER_ADMIN_PASSWORD`** from `.env.apio.prod`.

## 5. Publish admin on Tailscale (recommended — same as Dribex admin)

In `.env.prod`:

```env
TAILSCALE_IP=100.x.y.z   # output of: tailscale ip -4
```

Redeploy (or recreate admin only):

```bash
export TAILSCALE_IP=$(tailscale ip -4)
docker compose -f docker-compose.prod.yml \
  -f docker-compose.apio.prod.yml \
  -f docker-compose.apio-admin-tailscale.yml \
  --env-file .env.prod up -d --force-recreate apio-admin
```

From a device on the tailnet: **`http://100.x.y.z:7217/login`**

Optional: `sudo tailscale set --operator=$USER` then `tailscale serve` — not required if Docker binds **`TAILSCALE_IP:7217`** directly.

Do **not** publish `0.0.0.0:7217` on the public WAN.

## 6. Verify

```bash
curl -s http://127.0.0.1:7217/api/health
# {"ok":true,"service":"apio-admin"}
```

- `https://dribex.ma/APIO/` — homepage
- `https://dribex.ma/APIO/api/health` — public API
- `http://100.x.y.z:7217/login` — admin login (Tailscale)

## Data

APIO uses its **own** SQLite file on Docker volume `apio_data` (`/data/apio.sqlite`). It does **not** use Dribex Postgres. **`apio-server`** and **`apio-admin`** share that volume.

## Outbound network (Google OAuth, SMTP)

`apio-server` must join Docker network **`edge`** (see `docker-compose.apio.prod.yml`) so it can reach `www.googleapis.com` and your SMTP relay. **`internal` only** causes `EAI_AGAIN` / HTTP 500 on `POST /api/auth/google`.

## Env names (easy to confuse)

| Variable | Where it applies |
|----------|------------------|
| `APIO_ADMIN_IP_ALLOWLIST` | Dribex **nginx** on `/APIO/admin` (legacy path; public SPA still 403) |
| `APIO_ADMIN_ALLOWED_NETWORKS` | **`apio-admin`** app middleware on port **7217** |
| `APIO_ADMIN_JWT_SECRET` | Admin cookies/JWT only (separate from `JWT_SECRET`) |
