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


def _database_target_hint() -> str:
    from urllib.parse import urlparse

    from app.config import settings

    parsed = urlparse(settings.database_url.replace("+asyncpg", ""))
    host = parsed.hostname or "?"
    port = parsed.port or 5432
    db = (parsed.path or "").lstrip("/") or "?"
    return f"{host}:{port}/{db}"


def _print_connection_help(exc: BaseException) -> None:
    print(
        f"\nDatabase connection failed ({exc}).\n"
        f"Configured target: {_database_target_hint()}\n\n"
        "On production (Postgres is not on localhost), run inside the API container:\n"
        "  cd ~/MarGem/souq-local/infra/onprem\n"
        "  docker compose -f docker-compose.prod.yml exec api "
        "bash -lc 'PYTHONPATH=/app python3 /app/scripts/restore_casablanca_marketplaces.py'\n\n"
        "If you run from the host with a venv, export DATABASE_URL with a host that "
        "accepts TCP connections (often 127.0.0.1 only when Postgres publishes a port). "
        "Load env from the same file as compose, e.g.:\n"
        "  set -a && source ../infra/onprem/.env.prod && set +a\n"
        "  export DATABASE_URL=\"postgresql+asyncpg://USER:PASS@127.0.0.1:5432/DB\"\n",
        file=sys.stderr,
    )


async def main() -> int:
    try:
        async with SessionLocal() as session:
            created = await ensure_casablanca_marketplaces(session)
            await session.commit()
    except (ConnectionRefusedError, OSError) as exc:
        _print_connection_help(exc)
        return 1
    if created:
        print("Created marketplaces:", ", ".join(created))
    else:
        print("All canonical marketplaces already present (metadata refreshed).")
    print("Slugs:", ", ".join(spec.slug for spec in CASABLANCA_MARKETPLACE_CATALOG))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
