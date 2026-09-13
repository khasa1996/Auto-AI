"""Authoritative city/state catalog for configurator pricing selection."""

from __future__ import annotations

from typing import Dict, List

from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorDatabase


def _normalize(value: str) -> str:
    return " ".join(value.strip().casefold().split())


async def get_pricing_locations(db: AsyncIOMotorDatabase, variant_id: str) -> List[Dict[str, str]]:
    """Return unique verified pricing locations available for a variant."""
    pricing = await db.variant_pricing.find_one({"variant_id": variant_id}, {"_id": 0, "city_pricing": 1})
    if not pricing:
        return []

    locations: Dict[str, Dict[str, str]] = {}
    for entry in pricing.get("city_pricing", []):
        city = str(entry.get("city", "")).strip()
        state = str(entry.get("state", "")).strip()
        if not city or not state:
            continue
        if str(entry.get("verification_status", "unverified")).casefold() != "verified":
            continue
        key = f"{_normalize(city)}|{_normalize(state)}"
        # Keep the first verified display spelling for case-insensitive duplicates.
        # This preserves the canonical catalog label instead of letting a later
        # differently-cased duplicate replace it.
        if key not in locations:
            locations[key] = {"city": city, "state": state}

    return sorted(locations.values(), key=lambda item: (item["state"].casefold(), item["city"].casefold()))


async def validate_pricing_location(db: AsyncIOMotorDatabase, variant_id: str, city: str | None) -> bool:
    """Return whether the requested city has verified pricing for the variant."""
    if not city:
        return True
    normalized = _normalize(city)
    locations = await get_pricing_locations(db, variant_id)
    return any(_normalize(item["city"]) == normalized for item in locations)


def make_city_pricing_router(db: AsyncIOMotorDatabase) -> APIRouter:
    """Build read-only city/state endpoints used by the configurator."""
    router = APIRouter(prefix="/api/v1/configurator", tags=["configurator-pricing"])

    @router.get("/{variant_id}/pricing-locations")
    async def list_pricing_locations(variant_id: str):
        locations = await get_pricing_locations(db, variant_id)
        return {"variant_id": variant_id, "locations": locations}

    return router


def mount_city_pricing_routes(app, db):
    """Mount authoritative configurator pricing-location routes."""
    app.include_router(make_city_pricing_router(db))
