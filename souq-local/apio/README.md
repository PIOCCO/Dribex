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

This starts **`apio-server`**, **`apio-web`**, and **`apio-admin`**, and publishes admin on **`127.0.0.1:7217`** on the host.

## 4. Super-admin UI (Tailscale — not public `/APIO/admin`)

The public site at `https://dribex.ma/APIO/admin/*` intentionally shows **403** (admin was removed from the public React app). Use the **admin listener** instead:

| Service | URL |
|---------|-----|
| Public storefront | `https://dribex.ma/APIO/` |
| Public API | `https://dribex.ma/APIO/api/health` |
| **Super-admin** | **`http://<tailscale-ip>:7217/`** (after step 5) |

Log in with **`SUPER_ADMIN_EMAIL`** / **`SUPER_ADMIN_PASSWORD`** from `.env.apio.prod`.

## 5. Expose 7217 on Tailscale (pick one)

**Option A — Tailscale Serve (simplest on piocco):**

```bash
tailscale serve --bg --http=7217 http://127.0.0.1:7217
tailscale serve status
```

From a device on the tailnet: `http://100.x.y.z:7217/` (use `tailscale ip -4` on the server).

**Option B — Host nginx** on the Tailscale IP: copy `nginx/snippets/apio-admin-tailscale.example.conf`, replace `TS_IP`, reload nginx.

Do **not** expose port 7217 on the public WAN interface.

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

## Env names (easy to confuse)

| Variable | Where it applies |
|----------|------------------|
| `APIO_ADMIN_IP_ALLOWLIST` | Dribex **nginx** on `/APIO/admin` (legacy path; public SPA still 403) |
| `APIO_ADMIN_ALLOWED_NETWORKS` | **`apio-admin`** app middleware on port **7217** |
| `APIO_ADMIN_JWT_SECRET` | Admin cookies/JWT only (separate from `JWT_SECRET`) |
