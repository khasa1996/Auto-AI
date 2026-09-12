"""Verified 3D configurator hotspot contracts and API."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, field_validator


class ConfiguratorHotspot(BaseModel):
    """A UI hotspot anchored to a verified configurator asset."""
    id: str = Field(..., min_length=1, max_length=80)
    label: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(None, max_length=500)
    x: float = Field(..., ge=0, le=100)
    y: float = Field(..., ge=0, le=100)
    camera_preset: Optional[str] = Field(None, max_length=40)
    feature_key: Optional[str] = Field(None, max_length=100)

    @field_validator("id", "label")
    @classmethod
    def non_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Hotspot text cannot be blank")
        return value


def validate_hotspots(hotspots: List[ConfiguratorHotspot]) -> List[str]:
    """Return validation errors for an asset hotspot collection."""
    ids = [hotspot.id for hotspot in hotspots]
    errors: List[str] = []
    duplicates = sorted({item for item in ids if ids.count(item) > 1})
    if duplicates:
        errors.append("Duplicate hotspot IDs: " + ", ".join(duplicates))
    return errors


def make_hotspot_router(db: AsyncIOMotorDatabase) -> APIRouter:
    """Build public hotspot routes that only expose verified published assets."""
    router = APIRouter(prefix="/api/v1/configurator", tags=["configurator-hotspots"])

    @router.get("/{variant_id}/hotspots")
    async def get_hotspots(variant_id: str):
        variant = await db.variants.find_one(
            {"variant_id": variant_id},
            {"_id": 0, "configurator_asset_id": 1, "configurator_status": 1},
        )
        if not variant:
            raise HTTPException(status_code=404, detail="Variant not found")

        asset_id = variant.get("configurator_asset_id")
        if not asset_id:
            return {"variant_id": variant_id, "available": False, "hotspots": []}

        asset = await db.configurator_assets.find_one(
            {"asset_id": asset_id, "variant_id": variant_id, "published": True, "validation_passed": True},
            {"_id": 0, "hotspots": 1},
        )
        if not asset:
            return {"variant_id": variant_id, "available": False, "hotspots": []}

        try:
            hotspots = [ConfiguratorHotspot.model_validate(item) for item in asset.get("hotspots", [])]
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Published hotspot metadata is invalid") from exc
        errors = validate_hotspots(hotspots)
        if errors:
            raise HTTPException(status_code=500, detail={"message": "Published hotspot metadata is invalid", "errors": errors})
        return {"variant_id": variant_id, "available": True, "hotspots": [item.model_dump() for item in hotspots]}

    return router


def mount_hotspot_routes(app, db) -> None:
    """Mount verified configurator hotspot routes."""
    app.include_router(make_hotspot_router(db))
