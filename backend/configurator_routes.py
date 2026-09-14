"""Auto AI India configurator API routes."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Awaitable, Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from configurator_schemas import (
    AIConfiguratorIntent,
    AIConfiguratorResponse,
    ConfigurationPriceRequest,
    ConfigurationPriceResponse,
    ConfigurationValidationRequest,
    SavedConfigurationCreate,
    ValidationResult,
)
from configurator_ai import build_interaction_state, resolve_ai_selection
from vehicle_schemas import BrandSummary, ConfiguratorStatus, ModelSummary, VariantDetail, VariantSummary
from pricing_engine import calculate_configuration_price, validate_asset_url
from rules_engine import get_available_options_for_variant, validate_configuration


async def _resolve_optional_user_phone(
    authorization: Optional[str] = Header(None),
) -> Optional[str]:
    """Resolve the application's canonical optional auth dependency lazily."""
    from server import optional_user_phone

    return await optional_user_phone(authorization)


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_saved_configuration_document(
    request: SavedConfigurationCreate,
    owner_phone: str,
    server_price_snapshot: Dict[str, object],
    server_asset: Optional[Dict[str, object]],
    config_id: str,
    share_token: str,
    now: str,
) -> Dict[str, object]:
    """Build a persisted snapshot from server-authoritative values."""
    configuration = request.configuration.model_dump()
    stale_reason = None if server_asset else "Published verified configurator asset is unavailable"
    estimated_on_road = int(server_price_snapshot.get("estimated_on_road", 0))
    return {
        "config_id": config_id,
        "owner_phone": owner_phone,
        "share_token": share_token,
        "configuration": configuration,
        "city": request.city,
        "price_snapshot": estimated_on_road,
        "price_breakdown": server_price_snapshot,
        "asset_id": server_asset.get("asset_id") if server_asset else None,
        "asset_version": server_asset.get("version") if server_asset else None,
        "stale": bool(stale_reason),
        "stale_reason": stale_reason,
        "created_at": now,
        "updated_at": now,
    }


async def resolve_saved_configuration_asset(
    db: AsyncIOMotorDatabase,
    variant_id: str,
    requested_asset_id: Optional[str],
) -> Optional[Dict[str, object]]:
    """Resolve the published verified asset assigned to a variant for persistence."""
    asset_id = requested_asset_id
    if not asset_id:
        variant = await db.variants.find_one(
            {"variant_id": variant_id},
            {"_id": 0, "configurator_asset_id": 1},
        )
        asset_id = variant.get("configurator_asset_id") if variant else None
    if not asset_id:
        return None
    return await db.configurator_assets.find_one(
        {
            "asset_id": asset_id,
            "variant_id": variant_id,
            "published": True,
            "validation_passed": True,
        },
        {"_id": 0, "asset_id": 1, "version": 1},
    )


def make_configurator_router(
    db: AsyncIOMotorDatabase,
    optional_user_phone: Optional[Callable[..., Awaitable[Optional[str]]]] = None,
) -> APIRouter:
    """Build the versioned configurator router with database/auth dependencies."""
    auth_dependency = optional_user_phone or _resolve_optional_user_phone
    router = APIRouter(prefix="/api/v1", tags=["configurator"])

    @router.get("/brands", response_model=List[BrandSummary])
    async def list_brands(active_only: bool = Query(True)):
        query: Dict[str, object] = {"active_in_india": True} if active_only else {}
        return await db.brands.find(query, {"_id": 0}).sort("name", 1).to_list(200)

    @router.get("/brands/{brand_id}")
    async def get_brand(brand_id: str):
        doc = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Brand not found")
        return doc

    @router.get("/models", response_model=List[ModelSummary])
    async def list_models(
        brand_id: Optional[str] = Query(None, max_length=60),
        body_type: Optional[str] = Query(None, max_length=40),
        segment: Optional[str] = Query(None, max_length=40),
        include_discontinued: bool = Query(False),
    ):
        query: Dict[str, object] = {}
        if brand_id:
            query["brand_id"] = brand_id
        if body_type:
            query["body_type"] = body_type
        if segment:
            query["market_segment"] = segment
        if not include_discontinued:
            query["discontinued"] = False
        return await db.models.find(query, {"_id": 0}).sort("name", 1).to_list(500)

    @router.get("/models/{model_id}")
    async def get_model(model_id: str):
        doc = await db.models.find_one({"model_id": model_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Model not found")
        return doc

    @router.get("/variants", response_model=List[VariantSummary])
    async def list_variants(
        model_id: Optional[str] = Query(None, max_length=80),
        brand_id: Optional[str] = Query(None, max_length=60),
        fuel: Optional[str] = Query(None, max_length=40),
        active_only: bool = Query(True),
    ):
        query: Dict[str, object] = {}
        if model_id:
            query["model_id"] = model_id
        if brand_id:
            query["brand_id"] = brand_id
        if fuel:
            query["specs.fuel_type"] = fuel
        if active_only:
            query["active"] = True
        return await db.variants.find(query, {"_id": 0}).to_list(500)

    @router.get("/variants/{variant_id}", response_model=VariantDetail)
    async def get_variant(variant_id: str):
        doc = await db.variants.find_one({"variant_id": variant_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Variant not found")
        pricing = await db.variant_pricing.find_one({"variant_id": variant_id}, {"_id": 0})
        colors = await db.variant_colors.find({"variant_id": variant_id}, {"_id": 0}).to_list(30)
        wheels = await db.variant_wheels.find({"variant_id": variant_id}, {"_id": 0}).to_list(20)
        interiors = await db.variant_interiors.find({"variant_id": variant_id}, {"_id": 0}).to_list(15)
        return {**doc, "pricing": pricing, "colors": colors, "wheels": wheels, "interiors": interiors}

    @router.get("/configurator/{variant_id}/availability")
    async def get_configurator_availability(variant_id: str):
        variant = await db.variants.find_one(
            {"variant_id": variant_id},
            {"_id": 0, "configurator_status": 1, "configurator_asset_id": 1},
        )
        if not variant:
            legacy = await db.cars.find_one({"id": variant_id}, {"_id": 0})
            if not legacy:
                raise HTTPException(status_code=404, detail="Variant not found")
            return {
                "variant_id": variant_id,
                "configurator_status": ConfiguratorStatus.COMING_SOON,
                "asset_id": None,
                "message": "3D Configurator Coming Soon",
            }
        status = variant.get("configurator_status", ConfiguratorStatus.COMING_SOON)
        return {
            "variant_id": variant_id,
            "configurator_status": status,
            "asset_id": variant.get("configurator_asset_id"),
            "message": _status_message(status),
        }

    @router.get("/configurator/{variant_id}/asset")
    async def get_configurator_asset(variant_id: str):
        variant = await db.variants.find_one(
            {"variant_id": variant_id},
            {"_id": 0, "configurator_status": 1, "configurator_asset_id": 1},
        )
        if not variant or variant.get("configurator_status") != ConfiguratorStatus.AVAILABLE:
            return {
                "variant_id": variant_id,
                "available": False,
                "message": _status_message(
                    variant.get("configurator_status", ConfiguratorStatus.COMING_SOON)
                    if variant else ConfiguratorStatus.COMING_SOON
                ),
            }
        asset_id = variant.get("configurator_asset_id")
        if not asset_id:
            return {"variant_id": variant_id, "available": False, "message": "3D asset not assigned"}
        asset = await db.configurator_assets.find_one(
            {"asset_id": asset_id, "published": True, "validation_passed": True},
            {"_id": 0},
        )
        if not asset:
            return {
                "variant_id": variant_id,
                "available": False,
                "message": "3D asset is not yet published or has not passed validation",
            }
        return {
            "variant_id": variant_id,
            "available": True,
            "asset": {
                "asset_id": asset["asset_id"],
                "url": asset.get("cdn_url") or asset["url"],
                "format": asset["format"],
                "version": asset["version"],
                "lod_level": asset["lod_level"],
                "supported_interactions": asset.get("supported_interactions", []),
                "paint_material_names": asset.get("paint_material_names", []),
                "interior_material_names": asset.get("interior_material_names", []),
                "interior_material_mappings": asset.get("interior_material_mappings", {}),
                "wheel_mesh_names": asset.get("wheel_mesh_names", {}),
                "option_mesh_names": asset.get("option_mesh_names", {}),
                "camera_preset_names": asset.get("camera_preset_names", []),
                "interaction_animation_names": asset.get("interaction_animation_names", {}),
            },
        }

    @router.get("/configurator/{variant_id}/options")
    async def get_configurator_options(variant_id: str):
        options = await get_available_options_for_variant(variant_id, db)
        variant = await db.variants.find_one({"variant_id": variant_id}, {"_id": 0, "configurator_status": 1})
        if not variant:
            legacy = await db.cars.find_one({"id": variant_id}, {"_id": 0})
            if not legacy:
                raise HTTPException(status_code=404, detail="Variant not found")
        return {"variant_id": variant_id, **options}

    @router.get("/configurator/{variant_id}/rules")
    async def get_configurator_rules(variant_id: str):
        rules = await db.configurator_rules.find(
            {"variant_id": variant_id, "active": True},
            {"_id": 0},
        ).sort([("priority", -1), ("rule_id", 1)]).to_list(500)
        return {"variant_id": variant_id, "rules": rules}

    @router.post("/configurator/validate", response_model=ValidationResult)
    async def validate_configurator_configuration(request: ConfigurationValidationRequest):
        result = await validate_configuration(request, db)
        return result

    @router.post("/configurator/price", response_model=ConfigurationPriceResponse)
    async def price_configurator_configuration(request: ConfigurationPriceRequest):
        return await calculate_configuration_price(request, db)

    @router.post("/configurator/ai", response_model=AIConfiguratorResponse)
    async def ai_configurator(request: AIConfiguratorIntent):
        return await resolve_ai_selection(request, db)

    @router.post("/configurator/interactions")
    async def configurator_interactions(request: Dict[str, object]):
        variant_id = str(request.get("variant_id") or "")
        if not variant_id:
            raise HTTPException(status_code=422, detail="variant_id is required")
        return await build_interaction_state(variant_id, request.get("interaction", {}), db)

    @router.post("/configurator/configurations")
    async def save_configuration(request: SavedConfigurationCreate, phone: Optional[str] = Depends(auth_dependency)):
        if not phone:
            raise HTTPException(status_code=401, detail="Authentication required")
        server_asset = await resolve_saved_configuration_asset(db, request.configuration.variant_id, request.asset_id)
        server_price_snapshot = await calculate_configuration_price(request.configuration, db)
        config_id = str(uuid.uuid4())
        share_token = uuid.uuid4().hex
        now = _utcnow_iso()
        document = build_saved_configuration_document(
            request,
            phone,
            server_price_snapshot.model_dump(),
            server_asset,
            config_id,
            share_token,
            now,
        )
        await db.configurations.insert_one(document)
        return {"config_id": config_id, "share_token": share_token, "stale": document["stale"]}

    @router.get("/configurator/configurations/{config_id}")
    async def get_saved_configuration(config_id: str, phone: Optional[str] = Depends(auth_dependency)):
        if not phone:
            raise HTTPException(status_code=401, detail="Authentication required")
        document = await db.configurations.find_one({"config_id": config_id, "owner_phone": phone}, {"_id": 0})
        if not document:
            raise HTTPException(status_code=404, detail="Configuration not found")
        return document

    @router.get("/configurator/share/{share_token}")
    async def get_shared_configuration(share_token: str):
        document = await db.configurations.find_one({"share_token": share_token}, {"_id": 0, "owner_phone": 0})
        if not document:
            raise HTTPException(status_code=404, detail="Shared configuration not found")
        return document

    return router


def _status_message(status: ConfiguratorStatus) -> str:
    messages = {
        ConfiguratorStatus.AVAILABLE: "3D Configurator Ready",
        ConfiguratorStatus.COMING_SOON: "3D Configurator Coming Soon",
        ConfiguratorStatus.UNAVAILABLE: "3D Configurator Temporarily Unavailable",
    }
    return messages.get(status, "3D Configurator Coming Soon")
