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
