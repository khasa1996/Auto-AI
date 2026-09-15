"""API routes for backend-authoritative multi-variant recommendations."""

from __future__ import annotations

import re
from typing import Any, Dict, Optional

from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorDatabase

from configurator_recommendation_schemas import AIRecommendationRequest, AIRecommendationResponse
from configurator_recommendations import rank_variant_recommendations


def _budget_from_text(request: str) -> Optional[int]:
    match = re.search(r"(?:under|below|within|max(?:imum)?|budget(?:\s+of)?)\s*₹?\s*([0-9]+(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac|k)?", request.lower())
    if not match:
        return None
    value = float(match.group(1))
    multiplier = {"crore": 10_000_000, "cr": 10_000_000, "lakh": 100_000, "lac": 100_000, "k": 1_000}.get(match.group(2) or "", 1)
    return int(value * multiplier)


def _candidate_price(pricing: Dict[str, Any]) -> Optional[int]:
    if pricing.get("verification_status") not in {"verified", "VERIFIED"}:
        return None
    for key in ("base_ex_showroom", "ex_showroom", "price"):
        value = pricing.get(key)
        if isinstance(value, (int, float)) and value >= 0:
            return int(value)
    return None


def make_configurator_recommendation_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/api/v1/configurator", tags=["configurator-recommendations"])

    @router.post("/recommendations", response_model=AIRecommendationResponse)
    async def recommend_variants(request: AIRecommendationRequest) -> AIRecommendationResponse:
        max_budget = request.max_budget if request.max_budget is not None else _budget_from_text(request.raw_request)
        variants = await db.variants.find({"active": True}, {"_id": 0}).to_list(500)
        if not variants:
            return AIRecommendationResponse(recommendations=[], explanation="No active vehicle variants are available for this request.", ai_assisted=False, valid=True)

        variant_ids = [str(item.get("variant_id")) for item in variants if item.get("variant_id")]
        pricing_rows = await db.variant_pricing.find({"variant_id": {"$in": variant_ids}}, {"_id": 0}).to_list(500)
        pricing_by_variant = {str(item.get("variant_id")): item for item in pricing_rows if item.get("variant_id")}

        candidates = []
        for variant in variants:
            variant_id = str(variant.get("variant_id"))
            pricing = pricing_by_variant.get(variant_id, {})
            candidate = dict(variant)
            price = _candidate_price(pricing)
            if price is not None:
                candidate["price"] = price
            candidate["pricing"] = pricing if price is not None else {}
            candidates.append(candidate)

        ranking_request = request.model_dump()
        ranking_request["max_budget"] = max_budget
        ranked = rank_variant_recommendations(candidates, ranking_request)
        by_id = {str(item.get("variant_id")): item for item in candidates}
        recommendations = []

        for item in ranked:
            candidate = by_id[item["variant_id"]]
            status = str(candidate.get("configurator_status", "COMING_SOON"))
            asset_id = candidate.get("configurator_asset_id")
            asset = None
            if asset_id:
                asset = await db.configurator_assets.find_one(
                    {"asset_id": asset_id, "variant_id": item["variant_id"], "published": True, "validation_passed": True},
                    {"_id": 0, "asset_id": 1, "version": 1},
                )
            configurator_available = status == "AVAILABLE" and asset is not None
            vehicle = {key: candidate[key] for key in ("variant_id", "brand_id", "model_id", "name", "display_name", "slug", "body_type", "market_segment") if key in candidate}
            recommendations.append({
                **item,
                "availability_status": status,
                "configurator_available": configurator_available,
                "vehicle": vehicle,
                "pricing": candidate.get("pricing") or None,
                "tradeoff": "3D configurator is not currently available for this variant." if not configurator_available else None,
            })

        explanation = "No eligible variants matched the explicit requirements. Try a wider budget or remove one strict filter." if not recommendations else "Recommendations are ranked deterministically from active backend catalog data; pricing, availability and configurator readiness remain backend-authoritative."
        return AIRecommendationResponse(recommendations=recommendations, explanation=explanation, ai_assisted=False, valid=True)

    return router
