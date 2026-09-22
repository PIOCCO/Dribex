# APIO demo (Maison Maroc) at `/AIPO`

Vite + React app served at **`https://dribex.ma/AIPO/`** via production nginx.

## Local dev

```bash
cd souq-local/sites/aipo
npm install
npm run dev
```

Open **http://localhost:5173/AIPO/** (base path is `/AIPO/`).

## Production (Docker)

Built as service **`aipo-web`** in `infra/onprem/docker-compose.prod.yml`.

After deploy:

```text
https://dribex.ma/AIPO/
```

Rebuild only AIPO:

```bash
cd souq-local/infra/onprem
docker compose -f docker-compose.prod.yml --env-file .env.prod build aipo-web
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d aipo-web nginx
```

Does not use the Dribex API or mobile app.
