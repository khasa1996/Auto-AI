"""Backend contracts for premium configurator conversion and comparison flows."""

from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel, Field


class ConfiguredLeadPayload(BaseModel):
    source: str = Field("configurator", max_length=40)
    variant_id: str = Field(..., max_length=100)
    configuration: Dict[str, Any]
    city: str | None = Field(None, max_length=80)
    estimated_on_road: int | None = Field(None, ge=0)
    price_effective_date: str | None = Field(None, max_length=40)


class ConfigurationComparison(BaseModel):
    left: Dict[str, Any]
    right: Dict[str, Any]
    differences: List[str] = Field(default_factory=list)


def compare_purchasable_configurations(left: Dict[str, Any], right: Dict[str, Any]) -> ConfigurationComparison:
    """Compare only purchasable state; interaction state never affects a build comparison."""
    differences: List[str] = []
    for key in ("paint_id", "wheel_id", "interior_id", "roof_id"):
        if left.get(key) != right.get(key):
            differences.append(key)
    if sorted(left.get("accessory_ids", [])) != sorted(right.get("accessory_ids", [])):
        differences.append("accessory_ids")
    return ConfigurationComparison(left=left, right=right, differences=differences)
