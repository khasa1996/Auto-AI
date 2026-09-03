"""
Auto AI India — Configurator API Routes
=========================================
All /api/v1/... endpoints for vehicle data and configurator.

These routes are ADDITIVE — they do not replace or break the
existing /api/cars, /api/news, /api/emi, etc. endpoints.

API versioned under /api/v1/ to allow parallel operation with
the existing /api/ endpoints during migration.

Status summary:
  GET  /api/v1/brands                  IMPLEMENTED
  GET  /api/v1/models                  IMPLEMENTED
  GET  /api/v1/models/{model_id}       IMPLEMENTED
  GET  /api/v1/variants                IMPLEMENTED
  GET  /api/v1/variants/{variant_id}   IMPLEMENTED
  GET  /api/v1/configurator/{variant_id}/availability   IMPLEMENTED
  GET  /api/v1/configurator/{variant_id}/asset          IMPLEMENTED
  GET  /api/v1/configurator/{variant_id}/options        IMPLEMENTED
  GET  /api/v1/configurator/{variant_id}/rules          IMPLEMENTED
  POST /api/v1/configurator/validate                    IMPLEMENTED
  POST /api/v1/configurator/price                       IMPLEMENTED
  POST /api/v1/configurator/configurations              FOUNDATION
  GET  /api/v1/configurator/configurations/{id}         FOUNDATION
  POST /api/v1/configurator/ai                          FOUNDATION
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from configurator_schemas import (
    AIConfiguratorIntent,
    AIConfiguratorResponse,
    ConfigurationPriceRequest,
    ConfigurationPriceResponse,
    ConfigurationValidationRequest,
    ConfiguratorAssetCreate,
    InteractionState,
    PurchasableConfiguration,
    SavedConfigurationCreate,
    ValidationResult,
)
from vehicle_schemas import (
    BrandCreate,
    BrandSummary,
    ModelCreate,
    ModelSummary,
    VariantCreate,
    VariantDetail,
    VariantSummary,
    ConfiguratorStatus,
)
from pricing_engine import calculate_configuration_price, validate_asset_url
from rules_engine import validate_configuration, get_available_options_for_variant


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_configurator_router(db: Any) -> APIRouter:
    """
    Factory function that returns the configurator router
    with the database dependency injected.
    Called once from server.py at startup.
    """
    router = APIRouter(prefix="/api/v1", tags=["configurator"])

    # ── Brands ────────────────────────────────────────────────────────────

    @router.get("/brands", response_model=List[BrandSummary])
    async def list_brands(active_only: bool = Query(True)):
        """List all brands. Optionally filter to India-active brands only."""
        query: Dict[str, Any] = {}
        if active_only:
            query["active_in_india"] = True
        docs = await db.brands.find(query, {"_id": 0}).sort("name", 1).to_list(200)
        return docs

    @router.get("/brands/{brand_id}")
    async def get_brand(brand_id: str):
        doc = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Brand not found")
        return doc

    # ── Models ────────────────────────────────────────────────────────────

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
        docs = await db.models.find(query, {"_id": 0}).sort("name", 1).to_list(500)
        return docs

    @router.get("/models/{model_id}")
    async def get_model(model_id: str):
        doc = await db.models.find_one({"model_id": model_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Model not found")
        return doc

    # ── Variants ──────────────────────────────────────────────────────────

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
        docs = await db.variants.find(query, {"_id": 0}).to_list(500)
        return docs

    @router.get("/variants/{variant_id}", response_model=VariantDetail)
    async def get_variant(variant_id: str):
        doc = await db.variants.find_one({"variant_id": variant_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Variant not found")
        # Enrich with pricing
        pricing = await db.variant_pricing.find_one(
            {"variant_id": variant_id}, {"_id": 0}
        )
        colors = await db.variant_colors.find(
            {"variant_id": variant_id}, {"_id": 0}
        ).to_list(30)
        wheels = await db.variant_wheels.find(
            {"variant_id": variant_id}, {"_id": 0}
        ).to_list(20)
        interiors = await db.variant_interiors.find(
            {"variant_id": variant_id}, {"_id": 0}
        ).to_list(15)
        return {**doc, "pricing": pricing, "colors": colors,
                "wheels": wheels, "interiors": interiors}

    # ── Configurator Availability ─────────────────────────────────────────

    @router.get("/configurator/{variant_id}/availability")
    async def get_configurator_availability(variant_id: str):
        """
        Return the 3D configurator availability status for a variant.

        This is the single source of truth for whether the 3D
        configurator should be shown or a 'Coming Soon' state displayed.
        """
        variant = await db.variants.find_one(
            {"variant_id": variant_id},
            {"_id": 0, "configurator_status": 1, "configurator_asset_id": 1},
        )
        if not variant:
            # Check legacy cars collection
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
        asset_id = variant.get("configurator_asset_id")

        return {
            "variant_id": variant_id,
            "configurator_status": status,
            "asset_id": asset_id,
            "message": _status_message(status),
        }

    # ── Configurator Asset ────────────────────────────────────────────────

    @router.get("/configurator/{variant_id}/asset")
    async def get_configurator_asset(variant_id: str):
        """
        Return the published 3D asset metadata for a variant.

        Only returns assets where published=True and validation_passed=True.
        Never returns an unverified or unpublished asset.
        """
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
            return {
                "variant_id": variant_id,
                "available": False,
                "message": "3D asset not assigned",
            }

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

        # Return safe public fields only — never expose license_url internals
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

    # ── Configurator Options ──────────────────────────────────────────────

    @router.get("/configurator/{variant_id}/options")
    async def get_configurator_options(variant_id: str):
        """
        Return all available purchasable options for a variant.

        The AI must select ONLY from options returned by this endpoint.
        """
        options = await get_available_options_for_variant(variant_id, db)
        variant = await db.variants.find_one(
            {"variant_id": variant_id},
            {"_id": 0, "configurator_status": 1},
        )
        # Also accept legacy car IDs
        if not variant:
            legacy = await db.cars.find_one({"id": variant_id}, {"_id": 0})
            if not legacy:
                raise HTTPException(status_code=404, detail="Variant not found")

        return {
            "variant_id": variant_id,
            **options,
        }

    # ── Configurator Rules ────────────────────────────────────────────────

    @router.get("/configurator/{variant_id}/rules")
    async def get_configurator_rules(variant_id: str):
        """Return active compatibility rules for a variant."""
        rules = await db.configurator_rules.find(
            {
                "active": True,
                "$or": [
                    {"variant_id": variant_id},
                    {"variant_id": None},
                ],
            },
            {"_id": 0},
        ).to_list(200)
        return {"variant_id": variant_id, "rules": rules}

    # ── Validate Configuration ────────────────────────────────────────────

    @router.post("/configurator/validate", response_model=ValidationResult)
    async def validate_config(request: ConfigurationValidationRequest):
        """
        Validate a purchasable configuration against rules.

        The AI must call this before applying any configuration.
        Invalid configurations must be rejected.
        """
        return await validate_configuration(request, db)

    # ── Calculate Price ───────────────────────────────────────────────────

    @router.post("/configurator/price", response_model=ConfigurationPriceResponse)
    async def calculate_price(request: ConfigurationPriceRequest):
        """
        Calculate the authoritative on-road price for a configuration.

        The backend is the ONLY source of truth for pricing.
        The frontend must display this value, not compute its own.
        """
        try:
            return await calculate_configuration_price(request, db)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))

    # ── Save Configuration (Foundation) ──────────────────────────────────

    @router.post("/configurator/configurations")
    async def save_configuration(
        request: SavedConfigurationCreate,
        auth_phone: Optional[str] = None,  # FOUNDATION: will use Depends(optional_user_phone)
    ):
        """
        Save a vehicle configuration.

        Status: FOUNDATION
        Persistence is implemented. Authentication-based ownership
        linking is available when the caller passes a valid bearer token.
        """
        config_id = str(uuid.uuid4())
        share_token = uuid.uuid4().hex  # URL-safe 32-char token
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
    async def get_configuration(config_id: str):
        """
        Load a saved configuration by ID or share token.
        """
        doc = await db.configurations.find_one(
            {"$or": [{"config_id": config_id}, {"share_token": config_id}]},
            {"_id": 0},
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Configuration not found")
        return doc

    # ── AI Configurator (Foundation) ──────────────────────────────────────

    @router.post("/configurator/ai", response_model=AIConfiguratorResponse)
    async def ai_configurator(intent: AIConfiguratorIntent):
        """
        AI-powered configuration from natural language.

        Status: FOUNDATION
        The AI intent model is defined and validated.
        Full NLP → validation → apply flow requires Phase 3+ LLM integration.
        
        Current behavior: returns the intent structure with instructions
        for what the full implementation must do.
        """
        # FOUNDATION: Full implementation in Phase 3.
        # The contract is defined and validated here.
        # When implemented, the flow must be:
        #   1. Parse intent from raw_request using LLM
        #   2. Query valid options via get_available_options_for_variant()
        #   3. Match intent preferences against real option IDs only
        #   4. Call validate_configuration() — AI cannot bypass rules
        #   5. Call calculate_configuration_price() — AI cannot invent prices
        #   6. Return ConfigurationState + PriceResponse
        return AIConfiguratorResponse(
            configuration=None,
            price=None,
            explanation=(
                "AI configuration is a Phase 3 feature. "
                "The contract is defined and validated. "
                "When implemented, the AI will select only from "
                "backend-provided options and validate through the rules engine."
            ),
            unavailable_options=[],
            valid=False,
        )

    # ── Asset URL Validation (Admin utility) ──────────────────────────────

    @router.post("/configurator/assets/validate-url")
    async def validate_asset_url_endpoint(payload: Dict[str, str]):
        """
        Validate a 3D asset URL structurally.
        Used by the admin asset pipeline before ingest.
        """
        url = payload.get("url", "")
        result = await validate_asset_url(url)
        return result

    return router


def _status_message(status: ConfiguratorStatus) -> str:
    messages = {
        ConfiguratorStatus.AVAILABLE: "3D Configurator Available",
        ConfiguratorStatus.COMING_SOON: "3D Configurator Coming Soon",
        ConfiguratorStatus.UNAVAILABLE: "3D Configurator Unavailable",
        ConfiguratorStatus.UNDER_REVIEW: "3D Configurator Under Review",
        ConfiguratorStatus.DISABLED: "3D Configurator Disabled",
    }
    return messages.get(status, "3D Configurator Status Unknown")
