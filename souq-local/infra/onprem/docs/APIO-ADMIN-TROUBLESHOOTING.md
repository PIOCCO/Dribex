# APIO admin (7217) — when nothing works

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

That plain-text **404** is almost always **Tailscale Serve’s Go HTTP handler**, not `apio-admin` (Node would return JSON or HTML).

**Cause:** `apio-admin` uses **`network_mode: host`** and **`APIO_ADMIN_BIND=127.0.0.1`**, so it only listens on **loopback**. Hitting **`http://100.x.y.z:7217`** without a correct Serve (or SSH tunnel) does not reach Node.

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

## F. Super-admin login

Use `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from `.env.apio.prod` on the **7217** login page, not Google client OAuth.

## G. Crash: `getaddrinfo EAI_AGAIN apio-admin`

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
