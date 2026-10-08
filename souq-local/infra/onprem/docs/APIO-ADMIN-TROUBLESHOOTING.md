# APIO admin (7217) — when nothing works

## 0a. Worked before UI/git pull, broken now (127.0.0.1:7217 in logs)

**Cause:** `.env.apio.prod` has **`APIO_ADMIN_BIND=100.x`** and **`APIO_ADMIN_PORT=7218`**, but the container shows **`127.0.0.1` / `7217`**. That happens when compose **`environment:`** sets **`APIO_ADMIN_*: ${APIO_ADMIN_*:-defaults}`** — interpolation uses **`--env-file .env.prod`** (no APIO keys), so defaults **override** `env_file: .env.apio.prod` on every recreate. **Tailscale Serve** on **`100.x:7217`** can still return **404** while the app listens on loopback only.

**Restore (keeps new UI, fixes network):**

```bash
cd ~/MarGem/souq-local/infra/onprem
chmod +x scripts/apio-admin-restore-network.sh
APIO_ADMIN_PORT=7218 ./scripts/apio-admin-restore-network.sh
./scripts/apio-admin-status.sh
```

Then open **`http://100.x:7218/login`**. For the redesigned UI only (if needed): **`./scripts/apio-admin-rebuild.sh`**.

## 0b. Browser: **ERR_CONNECTION_REFUSED** on `100.x.x.x:7217|7218`

Nothing is listening on that **IP:port** (different from 404/403).

```bash
cd ~/MarGem/souq-local/infra/onprem
chmod +x scripts/apio-admin-status.sh
./scripts/apio-admin-status.sh
```

| Symptom | Fix |
|--------|-----|
| Container **not running** / **Exited** | `docker logs margem-prod-apio-admin-1 --tail 50` then `docker compose … up -d apio-admin` |
| **`APIO_ADMIN_BIND=127.0.0.1`** | Browser on **`100.x` will refuse** — use **`tailscale serve --bg --http=PORT http://127.0.0.1:PORT`** or set **`APIO_ADMIN_BIND=100.x`** in `.env.apio.prod` + recreate |
| Wrong **port** in URL | Match **`APIO_ADMIN_PORT`** in `.env.apio.prod` (7217 vs 7218) |
| **`tailscale serve reset`** left no listener | Re-run serve or direct bind on TS IP |

After UI rebuild, always:

```bash
./scripts/apio-admin-recreate.sh
# or: ./scripts/apio-admin-restore-network.sh  (also resets tailscale serve + .env.apio.prod bind)
./scripts/apio-admin-status.sh
```

## 0. Docker build: `"/server": not found` or `COPY server/` fails

The **Docker build context** is `souq-local/apio/`. It must contain the **full maisonmaroc app**, not only `Dockerfile.admin`.

On piocco:

```bash
cd ~/MarGem/souq-local/infra/onprem
git pull   # get scripts/apio-sync-source.sh
chmod +x scripts/apio-sync-source.sh scripts/apio-verify-source.sh
./scripts/apio-sync-source.sh
./scripts/apio-verify-source.sh
docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  --env-file .env.prod build apio-admin
```

Optional: `AZELos_BRANCH=cursor/production-audit-3967 ./scripts/apio-sync-source.sh`

### UI still looks old after browser refresh

Refreshing the browser **does not** update the admin SPA — it is **baked into the Docker image** at `npm run build:admin`. You must **rebuild and recreate** `apio-admin`.

If `git pull` aborts with **untracked working tree files would be overwritten** (e.g. `admin/vite.config.ts`):

```bash
cd ~/MarGem/souq-local
rm -f souq-local/apio/admin/vite.config.ts souq-local/apio/src/vite-env.d.ts
git pull origin cursor/apio-admin-i18n-8c79
```

Then:

```bash
cd ~/MarGem/souq-local
git pull origin cursor/apio-admin-i18n-8c79

cd infra/onprem
./scripts/apio-admin-rebuild.sh
```

Then open a **private/incognito** window (or hard refresh `Ctrl+Shift+R`).

**New UI checklist** — you should see:

- **Left sidebar** (Members / Projects / Content) on desktop
- Page title **Membres** with description (not only `adminDash.title` at top)
- Footer line **Version interface: &lt;git-sha&gt;**

If footer/version is missing or keys are still raw, run:

```bash
ls ~/MarGem/souq-local/apio/src/components/admin/layout/AdminLayout.tsx
git -C ~/MarGem/souq-local log -1 --oneline
./scripts/apio-sync-source.sh
./scripts/apio-admin-rebuild.sh
```

## What you should see when it works

```bash
curl -s http://127.0.0.1:7217/api/health
# {"ok":true,"service":"apio-admin"}
curl -sI http://127.0.0.1:7217/login | head -3
```

With **`network_mode: host`**, `docker port … 7217` is empty — the process binds the **host** loopback directly. Tailnet access needs **`tailscale serve`** (see **D**) or an SSH tunnel (**B**).

## A. App OK, host ports missing (most common)

Symptom: `docker port … 7217` → `no public port published`.

Fix on piocco:

```bash
cd ~/MarGem/souq-local/infra/onprem
chmod +x scripts/apio-admin-fix-ports.sh
./scripts/apio-admin-fix-ports.sh
```

Or manually add to `docker-compose.apio.prod.yml` under `apio-admin:`:

```yaml
    ports:
      - "127.0.0.1:7217:7217"
```

Then:

```bash
export TAILSCALE_IP=$(tailscale ip -4)
docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  -f docker-compose.apio-admin-tailscale.yml \
  --env-file .env.prod up -d --force-recreate apio-admin
```

**Note:** `TAILSCALE_IP` in `.env.prod` is not always used for compose YAML. **Export it** or put it in `infra/onprem/.env`.

## B. Workaround without host ports (SSH tunnel)

If compose still will not publish ports, the admin process **is** reachable on the container IP:

```bash
CID=$(docker ps -qf 'name=apio-admin' | head -1)
APIO_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$CID")
curl -s "http://${APIO_IP}:7217/api/health"
```

From your laptop (on Tailscale), tunnel:

```bash
ssh -N -L 7217:APIO_IP:7217 piocco@100.x.y.z
```

Open **http://127.0.0.1:7217/login** on the laptop.

Set in `.env.apio.prod`:

```env
APIO_ADMIN_ALLOWED_NETWORKS=100.64.0.0/10,127.0.0.0/8
```

## C. Do not use public dribex.ma

`https://dribex.ma/APIO/admin/login` → **403** by design (public SPA). Admin is only on **7217** (Tailscale / tunnel).

## D. Logs say “listening”, browser shows Go **404 page not found** (black screen)

That plain-text **404** (`Content-Type: text/plain`, body **`404 page not found`**) is **Tailscale Serve on port 7217**, not `apio-admin`. Node returns HTML on `/login` with CSP headers.

**Important:** Changing **`APIO_ADMIN_BIND`** to your **`100.x`** address **does not help** while Serve still owns **7217**. Serve answers first → same Go **404**. You must **`tailscale serve reset`** and then pick **one** exposure mode (below).

**Cause (loopback bind):** `APIO_ADMIN_BIND=127.0.0.1` → only **`http://127.0.0.1:7217`** hits Node; **`http://100.x:7217`** needs Serve or SSH `-L`.

**Check on piocco:**

```bash
curl -s http://127.0.0.1:7217/api/health
# {"ok":true,"service":"apio-admin"}

curl -sI http://127.0.0.1:7217/login
# HTTP/1.1 200 (or 302) — not 404
```

If loopback works, fix Tailscale exposure:

```bash
cd ~/MarGem/souq-local/infra/onprem
chmod +x scripts/apio-admin-tailscale-serve.sh
./scripts/apio-admin-tailscale-serve.sh
```

Or manually:

```bash
tailscale serve reset
tailscale serve --bg --http=7217 http://127.0.0.1:7217
tailscale serve status
```

**Browser:**

- Use **`http://100.x.y.z:7217/login`** — not `https://…` and not only `/` (SPA may look like a black screen).
- Do **not** use `https://dribex.ma/APIO/admin` (public **403** by design).

**Do not** add `docker-compose.apio-admin-tailscale.yml` **`ports:`** while **`network_mode: host`** is set in `docker-compose.apio.prod.yml` — Compose ignores/conflicts; use **Serve** or SSH `-L` instead.

### Mode 1 — Recommended: loopback + Serve

```env
# .env.apio.prod
APIO_ADMIN_BIND=127.0.0.1
APIO_ADMIN_ALLOWED_NETWORKS=100.64.0.0/10,127.0.0.0/8
```

```bash
tailscale serve reset
tailscale serve --bg --http=7217 http://127.0.0.1:7217
curl -sI http://100.x.y.z:7217/login | head -3   # expect 200
```

### Mode 2 — Direct bind on Tailscale IP (no Serve on 7217)

```env
APIO_ADMIN_BIND=100.80.43.124   # tailscale ip -4
APIO_ADMIN_ALLOWED_NETWORKS=100.64.0.0/10,127.0.0.0/8
```

```bash
tailscale serve reset    # required — do not run serve on 7217 in this mode
docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  --env-file .env.prod up -d --force-recreate apio-admin
docker logs margem-prod-apio-admin-1 --tail 3
# must say listening on http://100.80.43.124:7217
sudo ss -lntp | grep 7217
curl -sI http://100.80.43.124:7217/login | head -3
```

**Check bind actually applied:** `docker-compose.apio.prod.yml` must **not** hardcode `APIO_ADMIN_BIND` in `environment:` (that overrides `.env.apio.prod`).

## E. Missing admin UI (empty/black page, loopback `/login` not HTML)

```bash
docker exec margem-prod-apio-admin-1 ls -la /app/admin/dist/index.html
```

If missing, sync Azelos APIO source (`admin/`, `build:admin`) and rebuild:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  --env-file .env.prod build --no-cache apio-admin
docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  --env-file .env.prod up -d --force-recreate apio-admin
```

## F. `100.x:7217/7218` returns **403 Forbidden** (CSP headers present)

You reached **`apio-admin`**; the **network guard** rejected the client IP (not Tailscale Serve).

In `.env.apio.prod`:

```env
APIO_ADMIN_ALLOWED_NETWORKS=100.64.0.0/10,127.0.0.0/8
```

Verify the container actually loaded it:

```bash
docker exec margem-prod-apio-admin-1 printenv APIO_ADMIN_ALLOWED_NETWORKS
./scripts/apio-admin-recreate.sh
```

Use **`--env-file .env.prod`** for compose (Dribex stack). **`--env-file .env.apio.prod` alone** fails with `MINIO_ROOT_USER` and does **not** reload `apio-admin`. APIO vars still load from `.env.apio.prod` via `env_file:` in compose.

```bash
docker logs margem-prod-apio-admin-1 2>&1 | grep admin_network_denied | tail -3
```

**Note:** `APIO_ADMIN_IP_ALLOWLIST` is for **nginx** only — it does **not** affect `apio-admin`.

Testing from **piocco** to **`http://100.80.43.124:…`** can 403 if the kernel uses a source IP outside the allowlist. Prefer a browser on your **laptop (Tailscale)** or:

```bash
curl -sI --interface tailscale0 "http://100.80.43.124:7218/login" | head -3
```

## G2. UI shows **`adminDash.*` / `nav.logout` keys** or **old top-tab layout** (no sidebar)

**Cause:** Docker built from **Azelos-only** tree: missing `import "@shared/i18n"` in `admin/src/main.tsx` and/or old `admin/src/App.tsx`. **`apio-sync-source.sh` extracts Azelos over `../../apio`**, then must **`git checkout`** Dribex admin files. It used to fail with `cp: ... are the same file` (overlay never ran) or wrong path `souq-local/apio` on a checkout where git tracks `apio/` only.

**Fix:**

```bash
cd ~/MarGem/souq-local/infra/onprem   # or your infra/onprem path
git pull origin cursor/apio-admin-i18n-8c79
./scripts/apio-admin-rebuild.sh
./scripts/apio-verify-admin-ui.sh --container
```

**Expect after rebuild:** left **sidebar** (Membres / Projets / Contenu), French labels, footer **Version interface: &lt;git-sha&gt;**. Hard-refresh or private window.

Manual check on disk before build:

```bash
grep '@shared/i18n' ../../apio/admin/src/main.tsx
grep AdminLayout ../../apio/admin/src/App.tsx
```

## G. White screen / `ERR_SSL_PROTOCOL_ERROR` / HTTPS in iframe on **http://100.x:7218**

**Cause:** Production Helmet CSP sends **`upgrade-insecure-requests`**. The browser rewrites asset URLs to **`https://100.x:7218/...`**, but admin only speaks **HTTP** on that port → white page and console errors like **`ERR_SSL_PROTOCOL_ERROR`** / **https login loaded from http frame**.

**Often after `./scripts/apio-admin-rebuild.sh`:** `apio-sync-source.sh` copied Azelos **`server/src/security.js`** without the **`APIO_ADMIN_ALLOW_HTTP`** guard — env var alone does nothing until the image is rebuilt with Dribex `security.js`.

**Verify:**

```bash
./scripts/apio-admin-status.sh   # CSP section must say OK (no upgrade-insecure-requests)
docker exec margem-prod-apio-admin-1 printenv APIO_ADMIN_ALLOW_HTTP
curl -sI http://100.80.43.124:7218/login | tr -d '\r' | grep -i content-security-policy
```

**Fix (on piocco):**

In **`.env.apio.prod`** (you likely already have this):

```env
APIO_ADMIN_ALLOW_HTTP=true
```

```bash
cd ~/MarGem/souq-local/infra/onprem
git pull origin cursor/apio-admin-i18n-8c79
./scripts/apio-admin-rebuild.sh
# or: apio-sync-source.sh + apio-patch-admin-http-security.sh, then compose build apio-admin
./scripts/apio-admin-status.sh
```

Open **`http://100.80.43.124:7218/login`** (not `https://`). If the browser cached HSTS, use a private window or clear site data for `100.80.43.124`.

**Alternative:** Terminate TLS with **`tailscale serve --https=7218 http://127.0.0.1:7218`** and use **`https://`** in the browser (keep `APIO_ADMIN_BIND=127.0.0.1`).

## H. Login flicker → **401** on `/api/auth/me` and `/api/admin/members`

Login POST succeeds but the session cookie is **not stored** on **`http://100.x:7218`**.

**Cause:** Admin auth uses **`ADMIN_COOKIE_*`**, not `COOKIE_SECURE`. In production, `adminAuth.js` defaults to **`Secure` cookies** unless you override:

```env
ADMIN_COOKIE_SECURE=false
ADMIN_COOKIE_SAME_SITE=lax
```

(`COOKIE_SECURE=true` is correct for **public** `https://dribex.ma/APIO` on `apio-server`; keep both.)

Recreate admin after editing `.env.apio.prod`:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  --env-file .env.prod up -d --force-recreate apio-admin
```

**Verify:** DevTools → Application → Cookies → `apio_admin_token` should appear after login (no **Secure** flag on HTTP). Or:

```bash
curl -s -c /tmp/adm.jar -X POST "http://100.80.43.124:7218/api/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_SUPER_ADMIN_EMAIL","password":"YOUR_PASSWORD"}'
grep apio_admin /tmp/adm.jar
curl -s -b /tmp/adm.jar "http://100.80.43.124:7218/api/auth/me"
```

Use **`SUPER_ADMIN_EMAIL`** / **`SUPER_ADMIN_PASSWORD`** from `.env.apio.prod` (must match the user seeded in SQLite on first migrate).

## I. Super-admin login

Use `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from `.env.apio.prod` on the **7217/7218** login page, not Google client OAuth.

## J. Crash: `getaddrinfo EAI_AGAIN apio-admin`

**Cause:** `APIO_ADMIN_BIND=apio-admin` (hostname) in `.env.apio.prod`, or `depends_on: apio-server` with `network_mode: host` (no Docker DNS on host network).

**Fix:**

```env
APIO_ADMIN_BIND=127.0.0.1
```

Remove `depends_on` under `apio-admin` when using `network_mode: host`. Recreate:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  --env-file .env.prod rm -sf apio-admin
docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  --env-file .env.prod up -d --no-deps apio-admin
```
