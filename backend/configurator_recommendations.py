"""Backend-authoritative multi-variant configurator recommendations."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, Iterable, List, Optional

from llm_provider import LLMProviderError, LlmChat, UserMessage, resolve_model


MAX_RECOMMENDATIONS = 5
DEFAULT_RECOMMENDATIONS = 3
MAX_FEATURE_REQUIREMENTS = 20

_ALLOWED_FUELS = {"petrol", "diesel", "electric", "hybrid", "cng"}
_ALLOWED_SEGMENTS = {"suv", "hatchback", "sedan", "mpv"}


def _normalized(value: Any) -> str:
    return str(value or "").strip().lower()


def _price(candidate: Dict[str, Any]) -> Optional[int]:
    for key in ("price", "base_price", "ex_showroom"):
        value = candidate.get(key)
        if isinstance(value, (int, float)) and value >= 0:
            return int(value)
    pricing = candidate.get("pricing")
    if isinstance(pricing, dict):
        for key in ("base_ex_showroom", "ex_showroom", "price"):
            value = pricing.get(key)
            if isinstance(value, (int, float)) and value >= 0:
                return int(value)
    return None


def _fuel(candidate: Dict[str, Any]) -> str:
    specs = candidate.get("specs")
    if isinstance(specs, dict):
        return _normalized(specs.get("fuel_type"))
    return _normalized(candidate.get("fuel_type"))


def _segment(candidate: Dict[str, Any]) -> str:
    return _normalized(candidate.get("market_segment") or candidate.get("segment"))


def _feature_tokens(candidate: Dict[str, Any]) -> set[str]:
    values = candidate.get("features") or []
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, list):
        return set()
    return {_normalized(value) for value in values if value}


def _budget_fit(price: Optional[int], budget: Optional[int]) -> tuple[str, float]:
    if budget is None:
        return "unknown", 0.5
    if price is None:
        return "unknown", 0.5
    if price <= budget:
        return "within_budget", 1.0
    return "over_budget", 0.0


def _fit_signal(candidate: Dict[str, Any], request: Dict[str, Any]) -> tuple[str, float]:
    preferred = _normalized(request.get("preferred_segment"))
    if not preferred:
        return "unknown", 0.5
    segment = _segment(candidate)
    if not segment:
        return "unknown", 0.5
    return ("match", 1.0) if segment == preferred else ("mismatch", 0.0)


def _fuel_signal(candidate: Dict[str, Any], request: Dict[str, Any]) -> tuple[str, float]:
    preferred = _normalized(request.get("preferred_fuel"))
    if not preferred:
        return "unknown", 0.5
    fuel = _fuel(candidate)
    if not fuel:
        return "unknown", 0.5
    return ("match", 1.0) if fuel == preferred else ("mismatch", 0.0)


def _feature_fit(candidate: Dict[str, Any], request: Dict[str, Any]) -> float:
    requested = request.get("required_features") or []
    if isinstance(requested, str):
        requested = [requested]
    if not requested:
        return 0.5
    available = _feature_tokens(candidate)
    if not available:
        return 0.5
    wanted = {_normalized(value) for value in requested if value}
    return len(wanted & available) / len(wanted) if wanted else 0.5


def _eligible(candidate: Dict[str, Any], request: Dict[str, Any]) -> bool:
    if candidate.get("active") is False:
        return False
    preferred_fuel = _normalized(request.get("preferred_fuel"))
    if preferred_fuel:
        fuel = _fuel(candidate)
        if not fuel or fuel != preferred_fuel:
            return False
    preferred_segment = _normalized(request.get("preferred_segment"))
    if preferred_segment:
        segment = _segment(candidate)
        if not segment or segment != preferred_segment:
            return False
    budget = request.get("max_budget")
    price = _price(candidate)
    if isinstance(budget, (int, float)):
        if price is None or price > int(budget):
            return False
    requested_features = request.get("required_features") or []
    if isinstance(requested_features, str):
        requested_features = [requested_features]
    wanted = {_normalized(value) for value in requested_features if value}
    if wanted and not wanted.issubset(_feature_tokens(candidate)):
        return False
    return bool(candidate.get("variant_id"))


def _why(candidate: Dict[str, Any], budget_fit: str, fuel_fit: str, requirement_fit: str) -> str:
    name = str(candidate.get("name") or candidate.get("display_name") or candidate["variant_id"])
    reasons = []
    if requirement_fit == "match":
        reasons.append("matches the requested segment")
    if fuel_fit == "match":
        reasons.append("matches the requested fuel type")
    if budget_fit == "within_budget":
        reasons.append("fits the stated budget")
    if not reasons:
        reasons.append("best available match from the verified catalog")
    return f"{name} " + " and ".join(reasons) + "."


def _budget_from_text(request: str) -> Optional[int]:
    match = re.search(r"(?:under|below|within|max(?:imum)?|budget(?:\s+of)?)\s*₹?\s*([0-9]+(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac|k)?", request.lower())
    if not match:
        return None
    value = float(match.group(1))
    multiplier = {"crore": 10_000_000, "cr": 10_000_000, "lakh": 100_000, "lac": 100_000, "k": 1_000}.get(match.group(2) or "", 1)
    return int(value * multiplier)


def _infer_preference(raw_request: str, values: tuple[tuple[str, tuple[str, ...]], ...]) -> Optional[str]:
    normalized = raw_request.lower()
    for canonical, aliases in values:
        if any(re.search(rf"\b{re.escape(alias)}\b", normalized) for alias in aliases):
            return canonical
    return None


def _fallback_recommendation_intent(raw_request: str) -> Dict[str, Any]:
    return {
        "preferred_segment": _infer_preference(
            raw_request,
            (("suv", ("suv",)), ("hatchback", ("hatchback",)), ("sedan", ("sedan",)), ("mpv", ("mpv", "muv"))),
        ),
        "preferred_fuel": _infer_preference(
            raw_request,
            (("diesel", ("diesel",)), ("petrol", ("petrol", "gasoline")), ("electric", ("electric", "ev")), ("hybrid", ("hybrid",)), ("cng", ("cng",))),
        ),
        "max_budget": _budget_from_text(raw_request),
        "required_features": [],
        "ai_assisted": False,
    }


def _extract_json(text: str) -> Dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE | re.DOTALL).strip()
    value = json.loads(cleaned)
    if not isinstance(value, dict):
        raise ValueError("AI response must be a JSON object")
    return value


def _feature_vocabulary(candidates: Optional[Iterable[Dict[str, Any]]]) -> List[str]:
    values: Dict[str, str] = {}
    for candidate in candidates or []:
        features = candidate.get("features") or []
        if isinstance(features, str):
            features = [features]
        if not isinstance(features, list):
            continue
        for feature in features:
            if feature:
                text = str(feature).strip()
                if text:
                    values[_normalized(text)] = text
    return [values[key] for key in sorted(values)][:100]


async def extract_recommendation_intent(
    raw_request: str,
    candidates: Optional[Iterable[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Use AI for natural-language intent extraction while keeping catalog ranking authoritative."""
    fallback = _fallback_recommendation_intent(raw_request)
    features = _feature_vocabulary(candidates)
    feature_contract = json.dumps(features, separators=(",", ":"))
    prompt = (
        "You extract structured vehicle-shopping preferences for Auto AI India. Return JSON only. "
        "Do not select a vehicle or invent vehicle IDs. Only return preferred_segment from "
        "[suv,hatchback,sedan,mpv], preferred_fuel from [petrol,diesel,electric,hybrid,cng], "
        "max_budget as a non-negative integer INR amount, and required_features using only exact "
        "strings from the supplied feature vocabulary. Unknown fields must be null or []. "
        f"Feature vocabulary: {feature_contract}\n"
        f"User request: {raw_request[:2000]}"
    )
    try:
        provider, model = resolve_model()
        chat = LlmChat(None, "configurator:multi-variant-recommendations", "You extract strict vehicle-shopping preferences.").with_model(provider, model)
        response = await chat.send_message(UserMessage(prompt))
        parsed = _extract_json(response)
        segment = _normalized(parsed.get("preferred_segment"))
        fuel = _normalized(parsed.get("preferred_fuel"))
        budget = parsed.get("max_budget")
        if not isinstance(budget, (int, float)) or budget < 0:
            budget = fallback["max_budget"]
        requested_features = parsed.get("required_features")
        if not isinstance(requested_features, list):
            requested_features = []
        allowed_features = {_normalized(value): value for value in features}
        safe_features = [allowed_features[_normalized(value)] for value in requested_features if _normalized(value) in allowed_features][:MAX_FEATURE_REQUIREMENTS]
        return {
            "preferred_segment": segment if segment in _ALLOWED_SEGMENTS else fallback["preferred_segment"],
            "preferred_fuel": fuel if fuel in _ALLOWED_FUELS else fallback["preferred_fuel"],
            "max_budget": int(budget),
            "required_features": safe_features,
            "ai_assisted": True,
        }
    except (LLMProviderError, ValueError, TypeError, json.JSONDecodeError, RuntimeError):
        return fallback


def rank_variant_recommendations(
    candidates: Iterable[Dict[str, Any]],
    request: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Filter and deterministically rank backend-provided variant candidates."""
    limit_value = request.get("limit", DEFAULT_RECOMMENDATIONS)
    limit = max(1, min(int(limit_value), MAX_RECOMMENDATIONS))
    scored: List[Dict[str, Any]] = []

    for candidate in candidates:
        if not _eligible(candidate, request):
            continue
        budget_fit, budget_score = _budget_fit(_price(candidate), request.get("max_budget"))
        fuel_fit, fuel_score = _fuel_signal(candidate, request)
        requirement_fit, requirement_score = _fit_signal(candidate, request)
        feature_score = _feature_fit(candidate, request)
        fit_score = round((requirement_score * 0.35 + budget_score * 0.30 + fuel_score * 0.20 + feature_score * 0.15) * 100, 2)
        scored.append({
            "variant_id": str(candidate["variant_id"]),
            "rank": 0,
            "fit_score": fit_score,
            "requirement_fit": requirement_fit,
            "budget_fit": budget_fit,
            "fuel_fit": fuel_fit,
            "why_it_fits": _why(candidate, budget_fit, fuel_fit, requirement_fit),
        })

    scored.sort(key=lambda item: (-item["fit_score"], item["variant_id"]))
    for rank, item in enumerate(scored[:limit], start=1):
        item["rank"] = rank
    return scored[:limit]
