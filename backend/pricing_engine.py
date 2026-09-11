"""
Auto AI India — Pricing Engine
================================
Backend-authoritative pricing for vehicle configurations.

Design rules:
  - The frontend is NEVER the source of truth for pricing.
  - AI must NEVER invent prices.
  - City components are additive on top of ex-showroom.
  - All prices are integers in Indian Rupees (paise not used).
  - Unknown components are omitted, not invented.

Formula:
    base_ex_showroom
    + SUM(option price deltas)
    = subtotal_ex_showroom
    + rto
    + insurance_approx
    + tcs
    + other_charges
    - SUM(offer discounts)
    = estimated_on_road

Status: IMPLEMENTED (engine logic complete)
  - Base price lookup from variant_pricing collection: IMPLEMENTED
  - Option delta calculation: IMPLEMENTED
  - City component lookup: FOUNDATION (city data is DATA REQUIRED)
  - Offer/discount engine: FOUNDATION (structure defined, eval in Phase 3+)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from configurator_schemas import (
    ConfigurationPriceRequest,
    ConfigurationPriceResponse,
    PriceComponent,
    PurchasableConfiguration,
)

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorDatabase


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def calculate_configuration_price(
    request: ConfigurationPriceRequest,
    db: "AsyncIOMotorDatabase",
) -> ConfigurationPriceResponse:
    """
    Calculate the authoritative price for a vehicle configuration.

    Raises ValueError if the variant cannot be found.
    Never invents prices for unknown components.
    """
    config = request.configuration
    variant_id = config.variant_id

    # 1. Look up base pricing from normalized variant_pricing collection
    pricing_doc = await db.variant_pricing.find_one(
        {"variant_id": variant_id}, {"_id": 0}
    )

    # Fallback: look up in legacy flat cars collection for backward compat
    if pricing_doc is None:
        legacy = await db.cars.find_one({"id": variant_id}, {"_id": 0})
        if legacy is None:
            raise ValueError(f"Variant not found: {variant_id}")
        base_ex_showroom = legacy.get("price_ex_showroom", 0)
    else:
        base_ex_showroom = pricing_doc.get("base_ex_showroom", 0)

    option_deltas: List[PriceComponent] = []

    # 2. Paint delta
    if config.paint_id:
        color_doc = await db.variant_colors.find_one(
            {"color_id": config.paint_id, "variant_id": variant_id},
            {"_id": 0},
        )
        if color_doc and color_doc.get("price_delta", 0) > 0:
            option_deltas.append(PriceComponent(
                name=color_doc.get("display_name", "Paint option"),
                amount=color_doc["price_delta"],
            ))

    # 3. Wheel delta
    if config.wheel_id:
        wheel_doc = await db.variant_wheels.find_one(
            {"wheel_id": config.wheel_id, "variant_id": variant_id},
            {"_id": 0},
        )
        if wheel_doc and wheel_doc.get("price_delta", 0) > 0:
            option_deltas.append(PriceComponent(
                name=wheel_doc.get("name", "Wheel option"),
                amount=wheel_doc["price_delta"],
            ))

    # 4. Interior delta
    if config.interior_id:
        interior_doc = await db.variant_interiors.find_one(
            {"interior_id": config.interior_id, "variant_id": variant_id},
            {"_id": 0},
        )
        if interior_doc and interior_doc.get("price_delta", 0) > 0:
            option_deltas.append(PriceComponent(
                name=interior_doc.get("name", "Interior option"),
                amount=interior_doc["price_delta"],
            ))

    # 5. Roof delta
    if config.roof_id:
        roof_doc = await db.configurator_options.find_one(
            {
                "option_id": config.roof_id,
                "variant_id": variant_id,
                "option_type": "roof",
            },
            {"_id": 0},
        )
        if roof_doc and roof_doc.get("price_delta", 0) > 0:
            option_deltas.append(PriceComponent(
                name=roof_doc.get("display_name", "Roof option"),
                amount=roof_doc["price_delta"],
            ))

    # 6. Accessory deltas
    for acc_id in config.accessory_ids:
        acc_doc = await db.configurator_options.find_one(
            {
                "option_id": acc_id,
                "variant_id": variant_id,
                "option_type": "accessory",
            },
            {"_id": 0},
        )
        if acc_doc and acc_doc.get("price_delta", 0) > 0:
            option_deltas.append(PriceComponent(
                name=acc_doc.get("display_name", "Accessory"),
                amount=acc_doc["price_delta"],
            ))

    # 7. City-specific components
    # FOUNDATION: city pricing data is DATA REQUIRED.
    # The structure is defined; real RTO/insurance data needs Phase 3+ population.
    rto: Optional[int] = None
    insurance_approx: Optional[int] = None
    tcs: Optional[int] = None
    other_charges: Optional[int] = None

    if request.city and pricing_doc:
        city_pricing_list = pricing_doc.get("city_pricing", [])
        city_entry = next(
            (
                cp for cp in city_pricing_list
                if cp.get("city", "").lower() == request.city.lower()
            ),
            None,
        )
        if city_entry:
            rto = city_entry.get("rto")
            insurance_approx = city_entry.get("insurance_approx")
            tcs = city_entry.get("tcs")
            other_charges = city_entry.get("handling")

    # 8. Offers
    # FOUNDATION: offer engine is DATA REQUIRED.
    offers_applied: List[PriceComponent] = []

    # 9. Compute final on-road estimate
    subtotal = base_ex_showroom + sum(c.amount for c in option_deltas)
    on_road_components = [
        subtotal,
        rto or 0,
        insurance_approx or 0,
        tcs or 0,
        other_charges or 0,
    ]
    estimated_on_road = sum(on_road_components) - sum(
        c.amount for c in offers_applied
    )

    return ConfigurationPriceResponse(
        variant_id=variant_id,
        city=request.city,
        base_ex_showroom=base_ex_showroom,
        option_deltas=option_deltas,
        rto=rto,
        insurance_approx=insurance_approx,
        tcs=tcs,
        other_charges=other_charges,
        offers_applied=offers_applied,
        estimated_on_road=max(estimated_on_road, 0),
        price_is_estimate=True,
        effective_date=_utcnow_iso(),
        source="auto_ai_india_pricing_engine_v1",
    )


async def validate_asset_url(url: str) -> Dict[str, Any]:
    """
    Validate a 3D asset URL structurally.

    Does NOT download the file (that happens during admin asset ingest).
    Returns a dict with 'valid', 'errors', 'warnings'.
    """
    from urllib.parse import urlparse
    errors: List[str] = []
    warnings: List[str] = []

    if not url:
        errors.append("URL is required")
        return {"valid": False, "errors": errors, "warnings": warnings}

    parsed = urlparse(url)

    if parsed.scheme != "https":
        errors.append("Asset URL must use HTTPS")

    if not parsed.netloc:
        errors.append("Asset URL must include a hostname")

    path = parsed.path.lower()
    if not any(path.endswith(ext) for ext in (".glb", ".gltf")):
        errors.append(
            "Asset URL must end with .glb or .gltf — "
            "image files, .jpg, .png, .mp4 etc. are not valid 3D assets"
        )

    if parsed.username or parsed.password:
        errors.append("Asset URL must not contain credentials")

    if parsed.fragment:
        warnings.append("Asset URL contains a fragment identifier — this may cause issues")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }
