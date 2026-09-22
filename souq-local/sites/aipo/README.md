# APIO demo (Maison Maroc) at `/AIPO` — **temporary**

This app is **optional**. Normal production deploy does **not** expose `/AIPO`.

## Enable demo (client preview)

```bash
cd souq-local/infra/onprem
chmod +x scripts/aipo-demo-enable.sh scripts/aipo-demo-disable.sh
./scripts/aipo-demo-enable.sh
```

Open **https://dribex.ma/AIPO/**

## Disable demo (remove from production)

```bash
./scripts/aipo-demo-disable.sh
```

This stops `aipo-web`, removes nginx routes, and leaves the main Dribex site unchanged.

## Local dev

```bash
cd souq-local/sites/aipo
npm install
npm run dev
```

Open **http://localhost:5173/AIPO/**

## Remove from git entirely (optional)

Delete `souq-local/sites/aipo/` and the aipo compose/scripts on a branch — not required if you only use enable/disable on the server.
