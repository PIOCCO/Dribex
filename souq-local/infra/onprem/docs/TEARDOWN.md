# On-prem teardown and uninstall

Use this when decommissioning a VPS or resetting a lab host. **Several steps are destructive and irreversible.**

## Non-destructive stop

```bash
cd souq-local/infra/onprem
docker compose -f docker-compose.prod.yml --env-file .env.prod stop
```

Containers stop; **data volumes remain**.

## Remove containers (keep data)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod down
```

Removes containers and default network. **Named volumes (Postgres, MinIO, etc.) are kept** unless you add `-v`.

## Destructive — delete all application data

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod down -v
```

**Deletes:** PostgreSQL data, Redis, MinIO objects, Vault file storage, Prometheus/Grafana/Loki data inside Docker volumes.

**Does not delete:** host backups under `/var/backups/margem`, TLS files in `nginx/certs/`, or `.env.prod`.

Confirm you have off-server backups before `-v`.

## TLS certificates

```bash
rm -f nginx/certs/fullchain.pem nginx/certs/privkey.pem
```

Only removes local cert files on the server. Does not revoke Cloudflare or Let's Encrypt credentials.

## Backups on disk

```bash
sudo rm -rf /var/backups/margem
```

**Destructive** — removes Postgres dumps and MinIO mirror directories created by `backup.sh`.

## Optional host firewall rules

If you applied Docker hardening:

```bash
cd souq-local/infra/onprem/scripts
sudo CONFIRM=1 ./rollback-docker-user.sh
```

## Environment secrets

Remove `infra/onprem/.env.prod` from the server when decommissioning. Never commit it to git.

## Tailscale admin overlay

If you used `docker-compose.admin-tailscale.yml`, run `down` with the same `-f` files you used for `up`. Admin publishes only on `TAILSCALE_IP`, not the public Internet.

## After teardown

- DNS A records may still point at the VPS — update at your registrar.
- Mobile apps may still target the old API URL until you ship a new build.
