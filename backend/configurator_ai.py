"""Safe AI resolution for purchasable configurator options."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, Iterable, List, Optional, Set

from configurator_schemas import AIConfiguratorIntent, InteractionState, PurchasableConfiguration
from llm_provider import LLMProviderError, LlmChat, UserMessage, resolve_model
from rules_engine import get_available_options_for_variant


def _option_id(option: Dict[str, Any]) -> Optional[str]:
    value = option.get("option_id") or option.get("color_id") or option.get("wheel_id") or option.get("interior_id")
    return str(value) if value else None


def _option_label(option: Dict[str, Any]) -> str:
    return str(option.get("display_name") or option.get("name") or option.get("label") or _option_id(option) or "")


def _flatten_catalog(catalog: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    for option_type, options in catalog.items():
        for option in options:
            option_id = _option_id(option)
            if option_id:
                rows.append({"type": option_type, "id": option_id, "label": _option_label(option)})
    return rows


def _extract_json(text: str) -> Dict[str, Any]:
    """Extract one JSON object from a provider response without executing it."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE | re.DOTALL).strip()
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("AI response did not contain a JSON object")
        value = json.loads(cleaned[start:end + 1])
    if not isinstance(value, dict):
        raise ValueError("AI response must be a JSON object")
    return value


def _pick_by_description(description: Optional[str], options: Iterable[Dict[str, Any]]) -> Optional[str]:
    if not description:
        return None
    query = set(re.findall(r"[a-z0-9]+", description.lower()))
    if not query:
        return None
    best_id: Optional[str] = None
    best_score = 0
    for option in options:
        option_id = _option_id(option)
        label = _option_label(option)
        tokens = set(re.findall(r"[a-z0-9]+", label.lower()))
        score = len(query & tokens)
        if score > best_score and option_id:
            best_score, best_id = score, option_id
    return best_id


def resolve_textual_preferences(request: str, catalog: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Optional[str]]:
    """Resolve obvious natural-language option preferences without trusting model output."""
    return {
        "paint_id": _pick_by_description(request, catalog.get("colors", [])),
        "wheel_id": _pick_by_description(request, catalog.get("wheels", [])),
        "interior_id": _pick_by_description(request, catalog.get("interiors", [])),
        "roof_id": _pick_by_description(request, catalog.get("roofs", [])),
    }


def _allowed_ids(catalog: Dict[str, List[Dict[str, Any]]]) -> Dict[str, set[str]]:
    allowed: Dict[str, set[str]] = {}
    for key, values in catalog.items():
        ids: set[str] = set()
        for item in values:
            option_id = _option_id(item)
            if option_id:
                ids.add(option_id)
        allowed[key] = ids
    return allowed


def _safe_selection(candidate: Dict[str, Any], catalog: Dict[str, List[Dict[str, Any]]], variant_id: str) -> PurchasableConfiguration:
    allowed = _allowed_ids(catalog)

    def pick(field: str, catalog_key: str) -> Optional[str]:
        value = candidate.get(field)
        return str(value) if value is not None and str(value) in allowed.get(catalog_key, set()) else None

    accessory_ids = candidate.get("accessory_ids", [])
    if not isinstance(accessory_ids, list):
        accessory_ids = []
    safe_accessories = [str(value) for value in accessory_ids if str(value) in allowed.get("accessories", set())][:30]
    return PurchasableConfiguration(
        variant_id=variant_id,
        paint_id=pick("paint_id", "colors"),
        wheel_id=pick("wheel_id", "wheels"),
        interior_id=pick("interior_id", "interiors"),
        roof_id=pick("roof_id", "roofs"),
        accessory_ids=safe_accessories,
    )


def build_ai_prompt(intent: AIConfiguratorIntent, catalog: Dict[str, List[Dict[str, Any]]]) -> str:
    """Build a bounded prompt that exposes only backend-approved option IDs."""
    rows = _flatten_catalog(catalog)
    return (
        "You are Auto AI India's configurator selection engine.\n"
        "Select only IDs present in the supplied catalog. Never invent an ID or price.\n"
        "Return JSON only with keys: variant_id, paint_id, wheel_id, interior_id, roof_id, "
        "accessory_ids, explanation, open_hood, open_doors, open_boot, open_sunroof, lights_on, camera_preset. "
        "Use null for an unselected option and [] for no accessories. Interaction flags are showroom state only "
        "and must never change pricing.\n\n"
        f"Variant: {intent.variant_id}\n"
        f"User request: {intent.raw_request}\n"
        f"Preferred color: {intent.preferred_color_description or 'none'}\n"
        f"Preferred interior: {intent.preferred_interior_description or 'none'}\n"
        f"Maximum budget: {intent.max_budget if intent.max_budget is not None else 'none'}\n"
        f"Catalog: {json.dumps(rows, separators=(',', ':'))}"
    )


def _supported_camera_preset(preset: Optional[str], supported: Set[str]) -> Optional[str]:
    if not preset:
        return None
    required = {"exterior", "front", "rear", "left", "right", "top", "wheel", "boot"}
    if preset in required and "camera_exterior" in supported:
        return preset
    if preset in {"interior", "cockpit"} and "camera_interior" in supported:
        return preset
    return None


def build_interaction_state(intent: AIConfiguratorIntent, supported_interactions: Optional[Iterable[str]] = None) -> InteractionState:
    """Convert safe interaction intent into capability-gated, non-purchasable showroom state."""
    supported = set(supported_interactions or [])
    gate = bool(supported_interactions is not None)
    state = InteractionState(camera_preset=_supported_camera_preset(intent.camera_preset, supported) if gate else intent.camera_preset)
    if intent.open_hood and (not gate or "hood" in supported):
        state.hood_open = True
    if intent.open_boot and (not gate or "boot" in supported):
        state.boot_open = True
    if intent.open_sunroof and (not gate or "sunroof" in supported):
        state.sunroof_open = True
    if intent.open_doors and (not gate or "doors" in supported):
        state.doors.front_left = True
        state.doors.front_right = True
    if intent.lights_on:
        if not gate or "headlights" in supported:
            state.lighting.headlights = True
        if not gate or "drl" in supported:
            state.lighting.drl = True
    return state


async def resolve_ai_selection(intent: AIConfiguratorIntent, db: Any) -> tuple[PurchasableConfiguration, str, List[Dict[str, str]]]:
    """Resolve AI intent to a backend-catalog-only purchasable configuration."""
    catalog = await get_available_options_for_variant(intent.variant_id, db)
    allowed = _allowed_ids(catalog)
    unavailable: List[Dict[str, str]] = []
    candidate: Dict[str, Any] = {"variant_id": intent.variant_id}

    try:
        provider, model = resolve_model()
        chat = LlmChat(None, f"configurator:{intent.variant_id}", "You are a strict structured option selector.").with_model(provider, model)
        response = await chat.send_message(UserMessage(build_ai_prompt(intent, catalog)))
        candidate = _extract_json(response)
    except (LLMProviderError, ValueError, json.JSONDecodeError):
        candidate = {"variant_id": intent.variant_id}

    fallback = resolve_textual_preferences(intent.raw_request, catalog)
    configuration = _safe_selection(candidate, catalog, intent.variant_id)
    if not configuration.paint_id:
        configuration.paint_id = _pick_by_description(intent.preferred_color_description, catalog.get("colors", [])) or fallback["paint_id"]
    if not configuration.wheel_id:
        configuration.wheel_id = fallback["wheel_id"]
    if not configuration.interior_id:
        configuration.interior_id = _pick_by_description(intent.preferred_interior_description, catalog.get("interiors", [])) or fallback["interior_id"]
    if not configuration.roof_id:
        configuration.roof_id = fallback["roof_id"]

    for field, catalog_key in (("paint_id", "colors"), ("wheel_id", "wheels"), ("interior_id", "interiors"), ("roof_id", "roofs")):
        requested = candidate.get(field)
        if requested and str(requested) not in allowed.get(catalog_key, set()):
            unavailable.append({"option_type": catalog_key.rstrip("s"), "option_id": str(requested)})

    requested_accessories = candidate.get("accessory_ids", [])
    if isinstance(requested_accessories, list):
        for value in requested_accessories:
            if str(value) not in allowed.get("accessories", set()):
                unavailable.append({"option_type": "accessory", "option_id": str(value)})

    explanation = str(candidate.get("explanation") or "Configuration resolved from the verified backend option catalog.")[:2000]
    return configuration, explanation, unavailable
