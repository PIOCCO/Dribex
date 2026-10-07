# Cloudflare Error 522 (connection timed out)

Cloudflare reached your **origin IP** on **443**, but did not get a full HTTP response in time. This is an **origin** problem, not a Cloudflare dashboard toggle.

## Fast recovery on piocco (run in order)

```bash
cd ~/MarGem/souq-local/infra/onprem
export ENV_FILE=.env.prod
```

### 1. Is nginx listening on 443?

```bash
sudo ss -lntp | grep -E ':80|:443'
docker compose -f docker-compose.prod.yml --env-file .env.prod ps nginx api web
```

**Want:** `docker-proxy` or nginx on `0.0.0.0:443`.  
**Bad:** `tailscaled` on 443 → [TAILSCALE_PUBLIC_COEXISTENCE.md](./TAILSCALE_PUBLIC_COEXISTENCE.md):

```bash
sudo tailscale serve reset
sudo tailscale funnel reset 2>/dev/null || true
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d nginx
```

### 2. Start core Dribex (ignore APIO if needed)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postgres redis api web nginx
```

If nginx will not start, check logs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs nginx --tail 50
docker compose -f docker-compose.prod.yml --env-file .env.prod exec nginx nginx -t
```

**Bad nginx config** (often APIO snippets): temporarily remove APIO routes and recreate nginx:

```bash
./scripts/apio-prod-disable.sh
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate nginx
```

### 3. Test origin **without** Cloudflare

From piocco:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' --max-time 10 http://127.0.0.1/health
curl -sS -o /dev/null -w '%{http_code}\n' --max-time 10 -k https://127.0.0.1/ -H 'Host: dribex.ma'
```

From the public Internet (or Cloudflare “DNS only” grey cloud test): hit your **origin IP** with `Host: dribex.ma`.

If localhost works but Cloudflare 522 persists: firewall, wrong origin IP in Cloudflare, or ISP blocking.

### 4. Resource exhaustion

522 during `docker compose build`:

```bash
free -h
docker stats --no-stream
df -h
```

Wait for builds to finish or stop heavy containers, then restart nginx.

### 5. Full gate script

```bash
./scripts/production-gate-check.sh
```

## APIO-specific note

Never tie **nginx startup** to APIO health. If `docker-compose.apio.prod.yml` added `nginx.depends_on: apio-*`, a broken APIO stack can prevent nginx from coming back after `--force-recreate`. Use the updated compose (no nginx depends_on) or run step 2 with **only** `docker-compose.prod.yml`.

After the site is green, redeploy APIO:

```bash
./scripts/apio-prod-deploy.sh
```
