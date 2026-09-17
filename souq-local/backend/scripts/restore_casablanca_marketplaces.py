"""Restore built-in Casablanca marketplaces deleted from the admin UI.

Safe to run on production (idempotent upsert by slug):

  cd souq-local/backend && PYTHONPATH=. python3 scripts/restore_casablanca_marketplaces.py

Or inside the API container (path may vary):

  PYTHONPATH=. python3 scripts/restore_casablanca_marketplaces.py
"""

from __future__ import annotations

import asyncio
import sys

from app.data.casablanca_marketplace_catalog import CASABLANCA_MARKETPLACE_CATALOG
from app.database import SessionLocal
from app.services.casablanca_marketplace_seed import ensure_casablanca_marketplaces


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
