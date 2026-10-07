# APIO admin (7217) — when nothing works

## What you should see when it works

```bash
docker port margem-prod-apio-admin-1 7217
# 127.0.0.1:7217
curl -s http://127.0.0.1:7217/api/health
# {"ok":true,"service":"apio-admin"}
```

Logs only show `listening on http://0.0.0.0:7217` **inside** the container. That does **not** mean the host exposes 7217.

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

## E. Crash: `getaddrinfo EAI_AGAIN apio-admin`

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

## F. Super-admin login

Use `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from `.env.apio.prod` on the **7217** login page, not Google client OAuth.
