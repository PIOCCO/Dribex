"""Idempotent restore of built-in Casablanca marketplaces."""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.casablanca_marketplace_catalog import CASABLANCA_MARKETPLACE_CATALOG, MarketplaceSpec
from app.models.marketplace import Marketplace, MarketplaceCategory
from app.services.marketplace_community_chat import ensure_marketplace_channels


async def ensure_casablanca_marketplaces(session: AsyncSession) -> list[str]:
    """Upsert canonical marketplaces and categories. Returns slugs that were created (not updated)."""
    created_slugs: list[str] = []
    for spec in CASABLANCA_MARKETPLACE_CATALOG:
        created = await _upsert_marketplace(session, spec)
        if created:
            created_slugs.append(spec.slug)
        marketplace = await session.scalar(select(Marketplace).where(Marketplace.slug == spec.slug))
        if marketplace is not None:
            await _upsert_categories(session, marketplace, spec)
            await ensure_marketplace_channels(session, marketplace)
    return created_slugs


async def _upsert_marketplace(session: AsyncSession, spec: MarketplaceSpec) -> bool:
    marketplace = await session.scalar(select(Marketplace).where(Marketplace.slug == spec.slug))
    if marketplace is None:
        marketplace = Marketplace(
            id=uuid4(),
            slug=spec.slug,
            name=spec.name,
            description=spec.description,
            known_for=spec.known_for,
            address=spec.address,
            district=spec.district,
            city=spec.city,
            latitude=spec.latitude,
            longitude=spec.longitude,
            display_order=spec.display_order,
            is_active=True,
        )
        session.add(marketplace)
        await session.flush()
        return True

    marketplace.name = spec.name
    marketplace.description = spec.description
    marketplace.known_for = spec.known_for
    marketplace.address = spec.address
    marketplace.district = spec.district
    marketplace.city = spec.city
    marketplace.latitude = spec.latitude
    marketplace.longitude = spec.longitude
    marketplace.display_order = spec.display_order
    if not marketplace.is_active:
        marketplace.is_active = True
    await session.flush()
    return False


async def _upsert_categories(session: AsyncSession, marketplace: Marketplace, spec: MarketplaceSpec) -> None:
    for cat in spec.categories:
        row = await session.scalar(
            select(MarketplaceCategory).where(
                MarketplaceCategory.marketplace_id == marketplace.id,
                MarketplaceCategory.slug == cat.slug,
            )
        )
        if row is None:
            session.add(
                MarketplaceCategory(
                    id=uuid4(),
                    marketplace_id=marketplace.id,
                    name=cat.name,
                    slug=cat.slug,
                    description=cat.description,
                    icon=cat.icon,
                    display_order=cat.display_order,
                    is_active=True,
                )
            )
            continue
        row.name = cat.name
        row.description = cat.description
        row.icon = cat.icon
        row.display_order = cat.display_order
        if not row.is_active:
            row.is_active = True
    await session.flush()
