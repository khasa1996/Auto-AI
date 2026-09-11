"""Premium configurator conversion, history and comparison routes."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from configurator_premium import ConfiguredLeadPayload, compare_purchasable_configurations
from configurator_schemas import ConfigurationValidationRequest
from pricing_engine import calculate_configuration_price
from rules_engine import validate_configuration


OptionalUserPhone = Optional[Callable[..., Awaitable[Optional[str]]]]


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_history_item(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Expose saved configuration history without ownership secrets."""
    fields = (
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
    return {key: doc[key] for key in fields if key in doc}


def build_conversion_document(
    payload: ConfiguredLeadPayload,
    owner_phone: str,
    server_price: int,
    now: str,
) -> Dict[str, Any]:
    """Build a conversion lead from validated configuration data."""
    purchasable = payload.configuration.get("purchasable", {})
    if purchasable.get("variant_id") != payload.variant_id:
        raise ValueError("configuration variant does not match conversion variant")
    return {
        "lead_id": str(uuid.uuid4()),
        "owner_phone": owner_phone,
        "source": payload.source,
        "variant_id": payload.variant_id,
        "configuration": payload.configuration,
        "city": payload.city,
        "estimated_on_road": server_price,
        "price_effective_date": payload.price_effective_date,
        "status": "NEW",
        "created_at": now,
        "updated_at": now,
    }


def mount_premium_configurator_routes(
    app,
    db: AsyncIOMotorDatabase,
    auth_dependency: OptionalUserPhone = None,
) -> None:
    """Mount authenticated premium configurator workflows."""
    if auth_dependency is None:
        from configurator_routes import _resolve_optional_user_phone

        auth_dependency = _resolve_optional_user_phone

    router = APIRouter(prefix="/api/v1/configurator", tags=["configurator-premium"])

    @router.get("/history")
    async def history(
        limit: int = Query(20, ge=1, le=100),
        auth_phone: Optional[str] = Depends(auth_dependency),
    ):
        if not auth_phone:
            raise HTTPException(status_code=401, detail="Authentication required")
        docs = await db.configurations.find(
            {"owner_phone": auth_phone}, {"_id": 0}
        ).sort("updated_at", -1).to_list(limit)
        return {"items": [build_history_item(doc) for doc in docs]}

    @router.post("/compare")
    async def compare(
        payload: Dict[str, Dict[str, Any]],
        auth_phone: Optional[str] = Depends(auth_dependency),
    ):
        if not auth_phone:
            raise HTTPException(status_code=401, detail="Authentication required")
        left = payload.get("left")
        right = payload.get("right")
        if not isinstance(left, dict) or not isinstance(right, dict):
            raise HTTPException(status_code=422, detail="left and right configurations are required")
        return compare_purchasable_configurations(left, right)

    @router.post("/conversion-lead")
    async def conversion_lead(
        payload: ConfiguredLeadPayload,
        auth_phone: Optional[str] = Depends(auth_dependency),
    ):
        if not auth_phone:
            raise HTTPException(status_code=401, detail="Authentication required")
        validation = await validate_configuration(
            ConfigurationValidationRequest(configuration=payload.configuration["purchasable"]), db
        )
        if not validation.valid:
            raise HTTPException(
                status_code=422,
                detail={"message": "Invalid configuration", "errors": validation.errors},
            )
        try:
            price_request = type("PriceRequest", (), {})()
            price_request.configuration = type("Configuration", (), payload.configuration["purchasable"])()
            price_request.city = payload.city
            price = await calculate_configuration_price(price_request, db)
        except (ValueError, TypeError, KeyError) as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        document = build_conversion_document(
            payload,
            auth_phone,
            price.estimated_on_road,
            _utcnow_iso(),
        )
        await db.configurator_conversion_leads.insert_one(document)
        document.pop("_id", None)
        document.pop("owner_phone", None)
        return document

    app.include_router(router)
