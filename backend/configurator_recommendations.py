"""Backend-authoritative multi-variant configurator recommendations."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional


MAX_RECOMMENDATIONS = 5
DEFAULT_RECOMMENDATIONS = 3


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
    if price <= int(budget * 1.10):
        return "slightly_over_budget", 0.35
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
    if preferred_fuel and _fuel(candidate) and _fuel(candidate) != preferred_fuel:
        return False
    preferred_segment = _normalized(request.get("preferred_segment"))
    if preferred_segment and _segment(candidate) and _segment(candidate) != preferred_segment:
        return False
    budget = request.get("max_budget")
    price = _price(candidate)
    if isinstance(budget, (int, float)) and price is not None and price > int(budget * 1.10):
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
