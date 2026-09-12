"""Contracts and helpers for finance, insurance and dealer conversion intent."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class DealerAction(str, Enum):
    ENQUIRY = "ENQUIRY"
    TEST_DRIVE = "TEST_DRIVE"
    AVAILABILITY = "AVAILABILITY"
    BOOKING = "BOOKING"


class ConversionIntent(BaseModel):
    """User intent attached to an already validated vehicle configuration."""
    finance_required: bool = False
    down_payment: Optional[int] = Field(None, ge=0, le=100_000_000)
    tenure_months: Optional[int] = Field(None, ge=12, le=84)
    annual_rate: Optional[float] = Field(None, ge=0, le=40)
    insurance_required: bool = False
    dealer_action: DealerAction = DealerAction.ENQUIRY
    preferred_dealer_id: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)

    @model_validator(mode="after")
    def validate_finance_fields(self) -> "ConversionIntent":
        if self.finance_required:
            if self.down_payment is None:
                raise ValueError("down_payment is required when finance is requested")
            if self.tenure_months is None:
                raise ValueError("tenure_months is required when finance is requested")
            if self.annual_rate is None:
                raise ValueError("annual_rate is required when finance is requested")
        return self


def calculate_emi(principal: int, annual_rate: float, tenure_months: int) -> int:
    """Return the rounded monthly EMI for a standard reducing-balance loan."""
    if principal < 0:
        raise ValueError("principal cannot be negative")
    if tenure_months <= 0:
        raise ValueError("tenure_months must be positive")
    monthly_rate = annual_rate / 12 / 100
    if monthly_rate == 0:
        return round(principal / tenure_months)
    factor = (1 + monthly_rate) ** tenure_months
    return round(principal * monthly_rate * factor / (factor - 1))
