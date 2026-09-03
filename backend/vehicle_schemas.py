"""
Auto AI India — Vehicle Data Architecture
==========================================
Normalized schema for the canonical Indian automotive database.

Hierarchy:
    Brand → Model → Variant → Configuration

City is NOT part of vehicle identity.
City-specific data lives in separate pricing/availability documents.

Status: FOUNDATION
  - Schema and validation: IMPLEMENTED
  - API routes: IMPLEMENTED (see configurator_routes.py)
  - Seed data: FOUNDATION (schema seeded from existing cars collection)
  - Full Indian coverage: DATA REQUIRED (Phase 3+)
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class FuelType(str, Enum):
    PETROL = "Petrol"
    DIESEL = "Diesel"
    ELECTRIC = "Electric"
    PETROL_HYBRID = "Petrol Hybrid"
    DIESEL_HYBRID = "Diesel Hybrid"
    CNG = "CNG"
    LPG = "LPG"
    HYDROGEN = "Hydrogen"


class TransmissionType(str, Enum):
    MANUAL = "Manual"
    AUTOMATIC = "Automatic"
    CVT = "CVT"
    DCT = "DCT"
    AMT = "AMT"
    IMT = "IMT"


class DriveType(str, Enum):
    FWD = "FWD"
    RWD = "RWD"
    AWD = "AWD"
    FOUR_WD = "4WD"


class BodyType(str, Enum):
    HATCHBACK = "Hatchback"
    SEDAN = "Sedan"
    SUV = "SUV"
    COMPACT_SUV = "Compact SUV"
    COUPE_SUV = "Coupe SUV"
    MPV = "MPV"
    CROSSOVER = "Crossover"
    CONVERTIBLE = "Convertible"
    COUPE = "Coupe"
    PICKUP = "Pickup"
    VAN = "Van"
    MICRO_SUV = "Micro SUV"
    LIFESTYLE_SUV = "Lifestyle SUV"


class MarketSegment(str, Enum):
    ENTRY = "Entry"
    BUDGET = "Budget"
    MAINSTREAM = "Mainstream"
    PREMIUM = "Premium"
    LUXURY = "Luxury"
    ULTRA_LUXURY = "Ultra-Luxury"
    PERFORMANCE = "Performance"
    EXOTIC = "Exotic"


class ConfiguratorStatus(str, Enum):
    """
    Availability state for the 3D configurator.

    Only AVAILABLE vehicles may open the live 3D configurator.
    All other states must show the appropriate unavailable UI.
    """
    AVAILABLE = "AVAILABLE"          # Verified 3D asset + complete config metadata
    COMING_SOON = "COMING_SOON"      # In database, no verified 3D asset yet
    UNAVAILABLE = "UNAVAILABLE"      # Asset exists but fails validation/provenance
    UNDER_REVIEW = "UNDER_REVIEW"    # Asset under legal/provenance review
    DISABLED = "DISABLED"            # Explicitly disabled by admin


class VerificationStatus(str, Enum):
    VERIFIED = "verified"
    UNVERIFIED = "unverified"
    DISPUTED = "disputed"
    OUTDATED = "outdated"


# ---------------------------------------------------------------------------
# Brand
# ---------------------------------------------------------------------------

class BrandCreate(BaseModel):
    """Input schema for creating a brand record."""
    brand_id: str = Field(
        ..., min_length=2, max_length=60,
        description="URL-safe identifier, e.g. 'maruti-suzuki'"
    )
    name: str = Field(..., min_length=1, max_length=100)
    country_of_origin: Optional[str] = Field(None, max_length=60)
    market_segment: Optional[List[MarketSegment]] = None
    logo_url: Optional[str] = Field(None, max_length=500)
    website: Optional[str] = Field(None, max_length=200)
    active_in_india: bool = True

    @field_validator("brand_id")
    @classmethod
    def brand_id_slug(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z0-9][a-z0-9\-]*[a-z0-9]$", v):
            raise ValueError("brand_id must be lowercase alphanumeric with hyphens")
        return v


class Brand(BrandCreate):
    """Full brand record as stored in MongoDB."""
    created_at: str
    updated_at: str


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

class ModelCreate(BaseModel):
    """Input schema for creating a model record."""
    model_id: str = Field(
        ..., min_length=2, max_length=80,
        description="URL-safe identifier, e.g. 'tata-nexon'"
    )
    brand_id: str = Field(..., max_length=60)
    name: str = Field(..., min_length=1, max_length=100)
    body_type: BodyType
    market_segment: MarketSegment
    launched_year: Optional[int] = Field(None, ge=1900, le=2100)
    discontinued: bool = False
    # Source traceability
    source: Optional[str] = Field(None, max_length=200)
    source_url: Optional[str] = Field(None, max_length=500)
    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED

    @field_validator("model_id")
    @classmethod
    def model_id_slug(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z0-9][a-z0-9\-]*[a-z0-9]$", v):
            raise ValueError("model_id must be lowercase alphanumeric with hyphens")
        return v


class Model(ModelCreate):
    created_at: str
    updated_at: str


# ---------------------------------------------------------------------------
# Specifications (embedded in Variant)
# ---------------------------------------------------------------------------

class EngineSpec(BaseModel):
    displacement_cc: Optional[int] = Field(None, ge=0, le=10000)
    power_bhp: Optional[float] = Field(None, ge=0)
    torque_nm: Optional[float] = Field(None, ge=0)
    cylinders: Optional[int] = Field(None, ge=0, le=16)
    # EV / Hybrid fields
    motor_kw: Optional[float] = Field(None, ge=0)
    battery_kwh: Optional[float] = Field(None, ge=0)
    range_km: Optional[int] = Field(None, ge=0)         # WLTP/ARAI
    charging_dc_kw: Optional[float] = Field(None, ge=0)
    charging_ac_kw: Optional[float] = Field(None, ge=0)


class DimensionSpec(BaseModel):
    length_mm: Optional[int] = Field(None, ge=0)
    width_mm: Optional[int] = Field(None, ge=0)
    height_mm: Optional[int] = Field(None, ge=0)
    wheelbase_mm: Optional[int] = Field(None, ge=0)
    ground_clearance_mm: Optional[int] = Field(None, ge=0)
    kerb_weight_kg: Optional[int] = Field(None, ge=0)
    boot_litres: Optional[int] = Field(None, ge=0)
    frunk_litres: Optional[int] = Field(None, ge=0)       # EVs/some hybrids
    fuel_tank_litres: Optional[float] = Field(None, ge=0)


class VariantSpecs(BaseModel):
    engine: EngineSpec = Field(default_factory=EngineSpec)
    dimensions: DimensionSpec = Field(default_factory=DimensionSpec)
    fuel_type: FuelType
    transmission: TransmissionType
    drive_type: Optional[DriveType] = None
    mileage_kmpl: Optional[float] = Field(None, ge=0)     # ARAI claimed
    seats: Optional[int] = Field(None, ge=1, le=20)
    safety_rating: Optional[int] = Field(None, ge=0, le=5)
    safety_body: Optional[str] = Field(
        None, max_length=20,
        description="e.g. GNCAP, BNCAP, EURO-NCAP"
    )
    airbags: Optional[int] = Field(None, ge=0)
    adas_level: Optional[int] = Field(None, ge=0, le=5)


# ---------------------------------------------------------------------------
# Variant
# ---------------------------------------------------------------------------

class VariantCreate(BaseModel):
    """Input schema for a vehicle variant."""
    variant_id: str = Field(..., min_length=2, max_length=100)
    model_id: str = Field(..., max_length=80)
    brand_id: str = Field(..., max_length=60)
    name: str = Field(..., min_length=1, max_length=150)
    variant_code: Optional[str] = Field(None, max_length=60)
    specs: VariantSpecs
    # Legacy compatibility — maps to existing cars collection id
    legacy_car_id: Optional[str] = Field(
        None, max_length=80,
        description="ID in the existing flat cars collection for backward compat"
    )
    # Configurator
    configurator_status: ConfiguratorStatus = ConfiguratorStatus.COMING_SOON
    configurator_asset_id: Optional[str] = Field(None, max_length=100)
    # Source
    source: Optional[str] = Field(None, max_length=200)
    source_url: Optional[str] = Field(None, max_length=500)
    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED
    last_verified_at: Optional[str] = None
    active: bool = True

    @field_validator("variant_id")
    @classmethod
    def variant_id_slug(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z0-9][a-z0-9\-]*[a-z0-9]$", v):
            raise ValueError("variant_id must be lowercase alphanumeric with hyphens")
        return v


class Variant(VariantCreate):
    created_at: str
    updated_at: str


# ---------------------------------------------------------------------------
# Variant Pricing
# ---------------------------------------------------------------------------

class CityPricing(BaseModel):
    """City-specific on-road price breakdown."""
    city: str = Field(..., min_length=1, max_length=80)
    state: str = Field(..., min_length=1, max_length=80)
    ex_showroom: int = Field(..., ge=0)
    rto: Optional[int] = Field(None, ge=0)
    insurance_approx: Optional[int] = Field(None, ge=0)
    tcs: Optional[int] = Field(None, ge=0)       # Tax collected at source
    handling: Optional[int] = Field(None, ge=0)
    fast_tag: Optional[int] = Field(None, ge=0)
    estimated_on_road: Optional[int] = Field(None, ge=0)
    # Metadata
    effective_date: Optional[str] = None
    source: Optional[str] = Field(None, max_length=200)
    source_url: Optional[str] = Field(None, max_length=500)
    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED

    @model_validator(mode="after")
    def compute_on_road(self) -> "CityPricing":
        """Auto-compute on-road if not provided but components are known."""
        if self.estimated_on_road is None:
            components = [
                self.ex_showroom,
                self.rto or 0,
                self.insurance_approx or 0,
                self.tcs or 0,
                self.handling or 0,
                self.fast_tag or 0,
            ]
            self.estimated_on_road = sum(components)
        return self


class VariantPricingCreate(BaseModel):
    variant_id: str = Field(..., max_length=100)
    base_ex_showroom: int = Field(..., ge=0, description="Pan-India base ex-showroom")
    city_pricing: List[CityPricing] = Field(default_factory=list)
    effective_from: Optional[str] = None
    effective_until: Optional[str] = None


class VariantPricing(VariantPricingCreate):
    created_at: str
    updated_at: str


# ---------------------------------------------------------------------------
# Variant Colors
# ---------------------------------------------------------------------------

class MaterialOverride(BaseModel):
    """Maps a semantic material name to a color/value."""
    material_name: str = Field(
        ..., max_length=60,
        description="Semantic material name e.g. MAT_BODY_PAINT"
    )
    color_hex: Optional[str] = Field(
        None, max_length=10,
        description="#RRGGBB hex value"
    )
    metallic: float = Field(0.0, ge=0.0, le=1.0)
    roughness: float = Field(0.5, ge=0.0, le=1.0)
    clearcoat: float = Field(0.0, ge=0.0, le=1.0)

    @field_validator("color_hex")
    @classmethod
    def hex_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import re
        if not re.match(r"^#[0-9A-Fa-f]{6}$", v):
            raise ValueError("color_hex must be in #RRGGBB format")
        return v.upper()


class VariantColorCreate(BaseModel):
    """A purchasable paint/color option for a specific variant."""
    color_id: str = Field(..., min_length=2, max_length=80)
    variant_id: str = Field(..., max_length=100)
    name: str = Field(..., min_length=1, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=100)
    # Visual representation
    primary_hex: str = Field(..., max_length=10)
    secondary_hex: Optional[str] = Field(None, max_length=10)
    # Material parameters for 3D configurator
    material_overrides: List[MaterialOverride] = Field(
        default_factory=list,
        description="Per-material PBR values. Required for 3D configurator."
    )
    # Pricing
    price_delta: int = Field(0, ge=0, description="Additional cost above base variant price")
    # Availability
    available: bool = True
    source: Optional[str] = Field(None, max_length=200)

    @field_validator("primary_hex", "secondary_hex")
    @classmethod
    def hex_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import re
        if not re.match(r"^#[0-9A-Fa-f]{6}$", v):
            raise ValueError("hex color must be #RRGGBB format")
        return v.upper()


class VariantColor(VariantColorCreate):
    created_at: str
    updated_at: str


# ---------------------------------------------------------------------------
# Variant Wheels
# ---------------------------------------------------------------------------

class VariantWheelCreate(BaseModel):
    """A purchasable wheel option for a specific variant."""
    wheel_id: str = Field(..., min_length=2, max_length=80)
    variant_id: str = Field(..., max_length=100)
    name: str = Field(..., min_length=1, max_length=100)
    size_inches: Optional[float] = Field(None, ge=10.0, le=30.0)
    width_mm: Optional[int] = Field(None, ge=100, le=400)
    # 3D asset reference (optional — mesh swap in configurator)
    asset_mesh_name: Optional[str] = Field(
        None, max_length=100,
        description="Semantic mesh name in the GLB/GLTF asset"
    )
    # Pricing
    price_delta: int = Field(0, ge=0)
    # Compatibility
    compatible_variant_ids: List[str] = Field(default_factory=list)
    available: bool = True


class VariantWheel(VariantWheelCreate):
    created_at: str
    updated_at: str


# ---------------------------------------------------------------------------
# Variant Interiors
# ---------------------------------------------------------------------------

class VariantInteriorCreate(BaseModel):
    """A purchasable interior option for a specific variant."""
    interior_id: str = Field(..., min_length=2, max_length=80)
    variant_id: str = Field(..., max_length=100)
    name: str = Field(..., min_length=1, max_length=100)
    seat_material: Optional[str] = Field(
        None, max_length=60,
        description="e.g. Leather, Fabric, Leatherette"
    )
    seat_color: Optional[str] = Field(None, max_length=60)
    dashboard_theme: Optional[str] = Field(None, max_length=60)
    # Material overrides for 3D configurator
    material_overrides: List[MaterialOverride] = Field(default_factory=list)
    # Pricing
    price_delta: int = Field(0, ge=0)
    available: bool = True


class VariantInterior(VariantInteriorCreate):
    created_at: str
    updated_at: str


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class BrandSummary(BaseModel):
    """Compact brand for list responses."""
    brand_id: str
    name: str
    country_of_origin: Optional[str] = None
    market_segment: Optional[List[MarketSegment]] = None
    active_in_india: bool


class ModelSummary(BaseModel):
    """Compact model for list responses."""
    model_id: str
    brand_id: str
    name: str
    body_type: BodyType
    market_segment: MarketSegment
    discontinued: bool


class VariantSummary(BaseModel):
    """Compact variant for list responses."""
    variant_id: str
    model_id: str
    brand_id: str
    name: str
    specs: VariantSpecs
    configurator_status: ConfiguratorStatus
    active: bool


class VariantDetail(Variant):
    """Full variant with pricing and options."""
    pricing: Optional[VariantPricing] = None
    colors: List[VariantColor] = Field(default_factory=list)
    wheels: List[VariantWheel] = Field(default_factory=list)
    interiors: List[VariantInterior] = Field(default_factory=list)
