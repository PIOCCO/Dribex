# Cloudflare **521** on dribex.ma (incl. Espace promoteur / APIO)

**Symptom:** Browser shows Cloudflare **“Web server is down” (521)**. HTML from Cloudflare, not your app.  
**Espace promoteur:** `https://dribex.ma/APIO/owner/login` — same origin as the public site; if 521, **nothing** on dribex.ma works until the host is fixed.

**Meaning:** Cloudflare reached your DNS, but **nothing on the origin accepted TCP** on the configured port (usually **443**). This is **not** an APIO admin Tailscale issue and **not** a wrong member password.

## On piocco (SSH)

```bash
cd ~/MarGem/souq-local/infra/onprem

# 1) Is anything listening on 80/443?
sudo ss -lntp | grep -E ':443|:80'

# 2) Stack status (nginx must be Up)
docker compose -f docker-compose.prod.yml --env-file .env.prod ps

# 3) Local health (bypasses Cloudflare)
curl -sI http://127.0.0.1/health
curl -skI https://127.0.0.1/ -H 'Host: dribex.ma' | head -5

# 4) Full gate
./scripts/production-gate-check.sh
```

## Common fixes

| Cause | Fix |
|--------|-----|
| **nginx container down** | `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d nginx api web` |
| **api/web unhealthy** → nginx never started | `docker logs margem-prod-api-1 --tail 50`; `docker logs margem-prod-web-1 --tail 50`; fix env/DB, then `up -d` |
| **Tailscale owns 443** | `tailscale serve reset` — see `docs/TAILSCALE_PUBLIC_COEXISTENCE.md` |
| **Host reboot, compose not up** | `docker compose … up -d` (full stack or at least nginx+api+web) |
| **APIO nginx snippet broken** | `docker logs margem-prod-nginx-1 --tail 30`; test `nginx -t` inside container; restore snippet from git |

After nginx answers locally, re-test:

```bash
curl -sI https://dribex.ma/ | head -3
curl -sI https://dribex.ma/APIO/ | head -3
curl -sI https://dribex.ma/APIO/api/health | head -3
```

## APIO stack (owner login after site is up)

Promoteur login uses **public** APIO, not Tailscale admin:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  --env-file .env.prod ps apio-server apio-web
curl -s https://dribex.ma/APIO/api/health
```

Member accounts created in **super-admin** (Tailscale) log in at **`https://dribex.ma/APIO/owner/login`** with the email/password set at creation.
