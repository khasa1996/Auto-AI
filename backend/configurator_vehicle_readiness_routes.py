"""Readiness API for promoting a vehicle variant into the production configurator."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from configurator_vehicle_readiness import assess_vehicle_configurator_readiness


def make_vehicle_readiness_router(db: Any) -> APIRouter:
    router = APIRouter(prefix="/api/v1", tags=["configurator-readiness"])

    @router.get("/configurator/variants/{variant_id}/readiness")
    async def vehicle_readiness(variant_id: str) -> Dict[str, Any]:
        vehicle = await db.variants.find_one({"variant_id": variant_id}, {"_id": 0})
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle variant not found")

        pricing = await db.variant_pricing.find_one({"variant_id": variant_id}, {"_id": 0})
        colors = await db.variant_colors.find({"variant_id": variant_id}, {"_id": 0}).to_list(100)
        wheels = await db.variant_wheels.find({"variant_id": variant_id}, {"_id": 0}).to_list(100)
        interiors = await db.variant_interiors.find({"variant_id": variant_id}, {"_id": 0}).to_list(100)

        asset_id = vehicle.get("configurator_asset_id")
        asset = None
        if asset_id:
            # Fetch by identity first so readiness can distinguish a missing asset
            # from an unpublished or unvalidated revision.
            asset = await db.configurator_assets.find_one(
                {"asset_id": asset_id, "variant_id": variant_id},
                {"_id": 0},
            )

        result = assess_vehicle_configurator_readiness(vehicle, pricing, colors, wheels, interiors, asset)
        return {
            "variant_id": variant_id,
            "ready": result["ready"],
            "blockers": result["blockers"],
            "warnings": result["warnings"],
            "asset_id": asset.get("asset_id") if asset else None,
            "asset_version": asset.get("version") if asset else None,
        }

    return router
