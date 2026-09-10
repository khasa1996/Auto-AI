"""Auto AI India configurator API routes."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

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
from vehicle_schemas import BrandSummary, ModelSummary, VariantDetail, VariantSummary, ConfiguratorStatus
from pricing_engine import calculate_configuration_price, validate_asset_url
from rules_engine import validate_configuration, get_available_options_for_variant


async def _resolve_optional_user_phone(
    authorization: Optional[str] = Header(None),
) -> Optional[str]:
    """Resolve the application's canonical optional auth dependency lazily.

    server.py imports this router, so importing the canonical dependency at
    module-import time would create a cycle. Runtime resolution keeps the
    existing token/session validation in one place.
    """
    from server import optional_user_phone
    return await optional_user_phone(authorization)


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_configurator_router(
    db: AsyncIOMotorDatabase,
    optional_user_phone: Optional[Callable[..., Any]] = None,
) -> APIRouter:
    """Build the versioned configurator router with database/auth dependencies."""
    auth_dependency = optional_user_phone or _resolve_optional_user_phone
    router = APIRouter(prefix="/api/v1", tags=["configurator"])

    @router.get("/brands", response_model=List[BrandSummary])
    async def list_brands(active_only: bool = Query(True)):
        query: Dict[str, Any] = {"active_in_india": True} if active_only else {}
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
        query: Dict[str, Any] = {}
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
        query: Dict[str, Any] = {}
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
                "wheel_mesh_names": asset.get("wheel_mesh_names", {}),
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
            {"active": True, "$or": [{"variant_id": variant_id}, {"variant_id": None}]},
            {"_id": 0},
        ).to_list(200)
        return {"variant_id": variant_id, "rules": rules}

    @router.post("/configurator/validate", response_model=ValidationResult)
    async def validate_config(request: ConfigurationValidationRequest):
        return await validate_configuration(request, db)

    @router.post("/configurator/price", response_model=ConfigurationPriceResponse)
    async def calculate_price(request: ConfigurationPriceRequest):
        try:
            return await calculate_configuration_price(request, db)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))

    @router.post("/configurator/configurations")
    async def save_configuration(
        request: SavedConfigurationCreate,
        auth_phone: Optional[str] = Depends(auth_dependency),
    ):
        """Persist a configuration and bind ownership to the authenticated user."""
        config_id = str(uuid.uuid4())
        share_token = uuid.uuid4().hex
        now = _utcnow_iso()
        doc = {
            "config_id": config_id,
            "owner_phone": auth_phone,
            "share_token": share_token,
            "configuration": request.configuration.model_dump(),
            "city": request.city,
            "price_snapshot": request.price_snapshot,
            "asset_id": request.asset_id,
            "asset_version": request.asset_version,
            "stale": False,
            "stale_reason": None,
            "created_at": now,
            "updated_at": now,
        }
        await db.configurations.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.get("/configurator/configurations/{config_id}")
    async def get_configuration(
        config_id: str,
        auth_phone: Optional[str] = Depends(auth_dependency),
    ):
        """Load a private configuration by owner or a public share token."""
        shared_doc = await db.configurations.find_one({"share_token": config_id}, {"_id": 0})
        if shared_doc:
            return _public_configuration_response(shared_doc)

        doc = await db.configurations.find_one({"config_id": config_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Configuration not found")
        if not auth_phone:
            raise HTTPException(status_code=401, detail="Authentication required")
        if doc.get("owner_phone") != auth_phone:
            raise HTTPException(status_code=403, detail="Configuration access denied")
        return doc

    @router.post("/configurator/ai", response_model=AIConfiguratorResponse)
    async def ai_configurator(intent: AIConfiguratorIntent):
        return AIConfiguratorResponse(
            configuration=None,
            price=None,
            explanation=(
                "AI configuration is a Phase 3 feature. The contract is defined and validated. "
                "When implemented, the AI will select only from backend-provided options "
                "and validate through the rules engine."
            ),
            unavailable_options=[],
            valid=False,
        )

    @router.post("/configurator/assets/validate-url")
    async def validate_asset_url_endpoint(payload: Dict[str, str]):
        return await validate_asset_url(payload.get("url", ""))

    return router


def _public_configuration_response(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Return only fields intentionally exposed through a share link."""
    public_fields = (
        "config_id",
        "configuration",
        "city",
        "price_snapshot",
        "asset_id",
        "asset_version",
        "stale",
        "stale_reason",
        "created_at",
        "updated_at",
    )
    return {key: doc[key] for key in public_fields if key in doc}


def _status_message(status: ConfiguratorStatus) -> str:
    messages = {
        ConfiguratorStatus.AVAILABLE: "3D Configurator Available",
        ConfiguratorStatus.COMING_SOON: "3D Configurator Coming Soon",
        ConfiguratorStatus.UNAVAILABLE: "3D Configurator Unavailable",
        ConfiguratorStatus.UNDER_REVIEW: "3D Configurator Under Review",
        ConfiguratorStatus.DISABLED: "3D Configurator Disabled",
    }
    return messages.get(status, "3D Configurator Status Unknown")
