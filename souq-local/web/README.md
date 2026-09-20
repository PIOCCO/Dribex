# Azelos public web (Next.js)

Public-facing **Azelos Blueprint Seller Platform** storefront at `https://dribex.ma` (site URL configured via `PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL`).

The Dribex marketplace UI has been replaced with a static blueprint catalog (no dependency on marketplace API routes for browsing). Existing **api-proxy** and **seller API** routes remain for backward compatibility with the Dribex backend and are unchanged in behavior.

## Local development

```bash
cd souq-local/web
npm run setup
npm run dev
```

Open http://localhost:3000

## Production build

```bash
NODE_ENV=production \
  NEXT_PUBLIC_API_BASE_URL=https://api.dribex.ma \
  NEXT_PUBLIC_SITE_URL=https://dribex.ma \
  npm run build
```

Docker production builds inject the same variables from `infra/onprem/.env.prod` (`PUBLIC_API_URL`, `PUBLIC_APP_URL`).

## Scope

- **In scope:** `souq-local/web/` public pages and Azelos components.
- **Out of scope:** `souq-local/admin-dashboard/`, mobile app, backend API (unless explicitly extended later).
