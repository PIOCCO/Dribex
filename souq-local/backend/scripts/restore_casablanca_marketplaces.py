"""Restore built-in Casablanca marketplaces deleted from the admin UI.

Safe to run on production (idempotent upsert by slug):

  cd souq-local/backend && PYTHONPATH=. python3 scripts/restore_casablanca_marketplaces.py

Or inside the API container (path may vary):

  PYTHONPATH=. python3 scripts/restore_casablanca_marketplaces.py
"""

from __future__ import annotations

import asyncio
import sys


def _import_app() -> tuple:
    try:
        from app.data.casablanca_marketplace_catalog import CASABLANCA_MARKETPLACE_CATALOG
        from app.database import SessionLocal
        from app.services.casablanca_marketplace_seed import ensure_casablanca_marketplaces

        return CASABLANCA_MARKETPLACE_CATALOG, SessionLocal, ensure_casablanca_marketplaces
    except ImportError as exc:
        print(
            "Cannot import the API dependencies (usually SQLAlchemy 2.x is missing).\n"
            "Do not use system /usr/bin/python3 for this script.\n\n"
            "Run ONE of:\n"
            "  1) Inside the API container (recommended):\n"
            "     cd souq-local && docker compose exec api "
            "bash -lc 'PYTHONPATH=/app python3 /app/scripts/restore_casablanca_marketplaces.py'\n"
            "     Production compose: cd infra/onprem && docker compose -f docker-compose.prod.yml exec api ...\n\n"
            "  2) Local venv with backend requirements:\n"
            "     cd souq-local/backend && python3 -m venv .venv && source .venv/bin/activate\n"
            "     pip install -r requirements.txt\n"
            "     PYTHONPATH=. python scripts/restore_casablanca_marketplaces.py\n",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc


CASABLANCA_MARKETPLACE_CATALOG, SessionLocal, ensure_casablanca_marketplaces = _import_app()


async def main() -> int:
    async with SessionLocal() as session:
        created = await ensure_casablanca_marketplaces(session)
        await session.commit()
    if created:
        print("Created marketplaces:", ", ".join(created))
    else:
        print("All canonical marketplaces already present (metadata refreshed).")
    print("Slugs:", ", ".join(spec.slug for spec in CASABLANCA_MARKETPLACE_CATALOG))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
