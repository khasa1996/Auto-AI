"""Schemas for safe multi-variant vehicle recommendations."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AIRecommendationRequest(BaseModel):
    raw_request: str = Field(..., min_length=1, max_length=2000)
    max_budget: Optional[int] = Field(None, ge=0)
    preferred_segment: Optional[str] = Field(None, max_length=60)
    preferred_fuel: Optional[str] = Field(None, max_length=40)
    required_features: List[str] = Field(default_factory=list, max_length=20)
    city: Optional[str] = Field(None, max_length=80)
    state: Optional[str] = Field(None, max_length=80)
    limit: int = Field(3, ge=1, le=5)


class AIRecommendation(BaseModel):
    variant_id: str = Field(..., max_length=100)
    rank: int = Field(..., ge=1, le=5)
    fit_score: float = Field(..., ge=0, le=100)
    requirement_fit: str = Field(..., max_length=30)
    budget_fit: str = Field(..., max_length=30)
    fuel_fit: str = Field(..., max_length=30)
    availability_status: Optional[str] = Field(None, max_length=40)
    configurator_available: bool = False
    vehicle: Dict[str, Any] = Field(default_factory=dict)
    pricing: Optional[Dict[str, Any]] = None
    why_it_fits: str = Field(..., max_length=500)
    tradeoff: Optional[str] = Field(None, max_length=500)


class AIRecommendationResponse(BaseModel):
    recommendations: List[AIRecommendation] = Field(default_factory=list, max_length=5)
    explanation: str = Field(..., max_length=2000)
    ai_assisted: bool = False
    valid: bool = True
