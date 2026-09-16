"""API routes for backend-authoritative multi-variant recommendations."""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorDatabase

from configurator_recommendation_schemas import AIRecommendationRequest, AIRecommendationResponse
from configurator_recommendations import extract_recommendation_intent, rank_variant_recommendations


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

        ai_intent = await extract_recommendation_intent(request.raw_request, candidates)
        ranking_request = request.model_dump()
        ranking_request["max_budget"] = request.max_budget if request.max_budget is not None else ai_intent["max_budget"]
        ranking_request["preferred_fuel"] = request.preferred_fuel or ai_intent["preferred_fuel"]
        ranking_request["preferred_segment"] = request.preferred_segment or ai_intent["preferred_segment"]
        ranking_request["required_features"] = request.required_features or ai_intent["required_features"]
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

        explanation = "No eligible variants matched the explicit requirements. Try a wider budget or remove one strict filter." if not recommendations else "AI extracted the request preferences, then the backend deterministically ranked active catalog candidates. Pricing, availability and configurator readiness remain backend-authoritative."
        return AIRecommendationResponse(recommendations=recommendations, explanation=explanation, ai_assisted=bool(ai_intent["ai_assisted"]), valid=True)

    return router
