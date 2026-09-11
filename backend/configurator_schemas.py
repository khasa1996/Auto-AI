"""
Auto AI India — Configurator Schemas
=====================================
Data models for the real 3D configurator system.

Key design rules enforced here:
  1. Purchasable configuration (paint/wheels/interior/roof) is SEPARATE
     from showroom interaction state (doors/hood/lighting).
  2. Pricing is backend-authoritative — AI never sets prices.
  3. 3D assets require provenance metadata before publication.
  4. Missing assets produce a clear COMING_SOON/UNAVAILABLE state.
     They are never silently replaced with a placeholder.

Status:
  Schema and validation:  IMPLEMENTED
  Rules engine:           FOUNDATION (RuleEngine class stub, full eval Phase 3+)
  Pricing engine:         IMPLEMENTED (base + delta + city components)
  Asset validation:       IMPLEMENTED
  Save/share:             FOUNDATION (contract defined, persistence Phase 3)
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Asset Provenance
# ---------------------------------------------------------------------------

class AssetProvenance(str, Enum):
    """
    Provenance classification for 3D assets.

    Only OEM_AUTHORIZED, AUTO_AI_LICENSED, and LICENSED_THIRD_PARTY
    assets may be published to the production configurator.

    AI_GENERATED_CONCEPT and UNKNOWN assets must NOT be presented as
    production vehicle models.
    """
    OEM_AUTHORIZED = "OEM_AUTHORIZED"
    AUTO_AI_LICENSED = "AUTO_AI_LICENSED"
    LICENSED_THIRD_PARTY = "LICENSED_THIRD_PARTY"
    AI_GENERATED_CONCEPT = "AI_GENERATED_CONCEPT"
    UNKNOWN = "UNKNOWN"


_PUBLISHABLE_PROVENANCE = {
    AssetProvenance.OEM_AUTHORIZED,
    AssetProvenance.AUTO_AI_LICENSED,
    AssetProvenance.LICENSED_THIRD_PARTY,
}

_VALID_ASSET_EXTENSIONS = (".glb", ".gltf")
_MAX_ASSET_BYTES = 200 * 1024 * 1024  # 200 MB absolute upper limit


class AssetLODLevel(str, Enum):
    """Level of detail tier."""
    LOD0 = "LOD0"   # High — Desktop
    LOD1 = "LOD1"   # Medium — Tablet
    LOD2 = "LOD2"   # Low — Mobile
    LOD3 = "LOD3"   # Minimal — Low-memory fallback


# ---------------------------------------------------------------------------
# Configurator Asset
# ---------------------------------------------------------------------------

class ConfiguratorAssetCreate(BaseModel):
    """
    Metadata record for a production 3D vehicle asset.

    The actual GLB/GLTF file is stored in object storage (S3-compatible CDN).
    MongoDB stores only metadata + the URL.
    """
    asset_id: str = Field(..., min_length=2, max_length=100)
    variant_id: str = Field(..., max_length=100)
    model_id: str = Field(..., max_length=80)
    brand_id: str = Field(..., max_length=60)
    # File details
    format: str = Field(
        ..., pattern=r"^(glb|gltf)$",
        description="Must be 'glb' or 'gltf'"
    )
    url: str = Field(..., max_length=2000)
    cdn_url: Optional[str] = Field(None, max_length=2000)
    file_size_bytes: Optional[int] = Field(None, ge=0, le=_MAX_ASSET_BYTES)
    checksum_sha256: Optional[str] = Field(None, max_length=64)
    version: str = Field(..., min_length=1, max_length=30)
    lod_level: AssetLODLevel = AssetLODLevel.LOD0
    # Provenance and licensing — MANDATORY for publication
    provenance: AssetProvenance = AssetProvenance.UNKNOWN
    license_name: Optional[str] = Field(None, max_length=200)
    license_url: Optional[str] = Field(None, max_length=500)
    publisher: Optional[str] = Field(None, max_length=200)
    # Semantic metadata (what the asset contains)
    supported_interactions: List[str] = Field(
        default_factory=list,
        description=(
            "e.g. ['Door_FL_Open','Hood_Open','Boot_Open','Sunroof_Open',"
            "'Headlights','DRL','Taillights']"
        )
    )
    paint_material_names: List[str] = Field(
        default_factory=list,
        description="Semantic material names that accept paint color overrides"
    )
    wheel_mesh_names: Dict[str, str] = Field(
        default_factory=dict,
        description="wheel_id -> mesh name mapping within the asset"
    )
    # Workflow state
    published: bool = False
    validation_passed: bool = False
    admin_reviewed: bool = False
    review_notes: Optional[str] = Field(None, max_length=1000)

    @field_validator("url", "cdn_url")
    @classmethod
    def url_must_be_https(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not v.startswith("https://"):
            raise ValueError("Asset URL must use HTTPS")
        return v

    @field_validator("url")
    @classmethod
    def url_must_be_glb_gltf(cls, v: str) -> str:
        from urllib.parse import urlparse
        path = urlparse(v).path.lower()
        if not any(path.endswith(ext) for ext in _VALID_ASSET_EXTENSIONS):
            raise ValueError(
                f"Asset URL must end with one of {_VALID_ASSET_EXTENSIONS}"
            )
        return v

    @field_validator("checksum_sha256")
    @classmethod
    def checksum_hex(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import re
        if not re.match(r"^[0-9a-f]{64}$", v.lower()):
            raise ValueError("checksum_sha256 must be a 64-char hex string")
        return v.lower()

    def is_publishable(self) -> bool:
        """Return True only when all publication gates pass."""
        return (
            self.provenance in _PUBLISHABLE_PROVENANCE
            and self.validation_passed
            and self.admin_reviewed
            and bool(self.license_name)
            and bool(self.publisher)
        )


class ConfiguratorAsset(ConfiguratorAssetCreate):
    created_at: str
    updated_at: str


# ---------------------------------------------------------------------------
# Configurator Options
# ---------------------------------------------------------------------------

class ConfiguratorOptionType(str, Enum):
    PAINT = "paint"
    WHEEL = "wheel"
    INTERIOR = "interior"
    ROOF = "roof"
    ACCESSORY = "accessory"
    TRIM = "trim"


class ConfiguratorOption(BaseModel):
    """
    A single purchasable configuration choice.
    References variant_colors / variant_wheels / variant_interiors records.
    """
    option_id: str = Field(..., max_length=100)
    option_type: ConfiguratorOptionType
    variant_id: str = Field(..., max_length=100)
    name: str = Field(..., max_length=150)
    display_name: str = Field(..., max_length=150)
    price_delta: int = Field(0, ge=0)
    available: bool = True
    # Reference to the detailed record in the appropriate collection
    reference_id: str = Field(
        ..., max_length=100,
        description="ID in variant_colors / variant_wheels / variant_interiors"
    )
    # Preview metadata
    preview_color_hex: Optional[str] = Field(None, max_length=10)
    preview_image_url: Optional[str] = Field(None, max_length=500)


# ---------------------------------------------------------------------------
# Configurator Rules
# ---------------------------------------------------------------------------

class RuleEffect(str, Enum):
    ALLOW = "allow"
    DENY = "deny"
    REQUIRE = "require"
    EXCLUDE = "exclude"       # This option excludes another option


class RuleConditionType(str, Enum):
    VARIANT_IS = "variant_is"
    OPTION_SELECTED = "option_selected"
    FUEL_TYPE = "fuel_type"
    MARKET_SEGMENT = "market_segment"
    DATE_BEFORE = "date_before"
    DATE_AFTER = "date_after"


class RuleCondition(BaseModel):
    condition_type: RuleConditionType
    value: Any = Field(..., description="The value to match against")


class ConfiguratorRule(BaseModel):
    """
    A compatibility rule that the rules engine evaluates.

    The AI must NEVER bypass rules. All AI-selected options must be
    validated through the rules engine before being applied.
    """
    rule_id: str = Field(..., max_length=100)
    variant_id: Optional[str] = Field(
        None, max_length=100,
        description="If set, rule applies only to this variant"
    )
    model_id: Optional[str] = Field(
        None, max_length=80,
        description="If set, rule applies to all variants of this model"
    )
    # What the rule targets
    target_option_type: ConfiguratorOptionType
    target_option_id: str = Field(..., max_length=100)
    # Rule logic
    effect: RuleEffect
    conditions: List[RuleCondition] = Field(default_factory=list)
    # Human-readable explanation (shown to user when rule blocks a choice)
    explanation: Optional[str] = Field(None, max_length=500)
    active: bool = True
    priority: int = Field(0, ge=0, description="Higher = evaluated first")


# ---------------------------------------------------------------------------
# Configuration State
# ---------------------------------------------------------------------------

class DoorState(BaseModel):
    """Showroom interaction — does NOT affect price."""
    front_left: bool = False
    front_right: bool = False
    rear_left: bool = False
    rear_right: bool = False


class LightingState(BaseModel):
    """Showroom interaction — does NOT affect price."""
    headlights: bool = False
    drl: bool = False
    taillights: bool = False
    fog_lights: bool = False
    left_indicator: bool = False
    right_indicator: bool = False
    hazard: bool = False
    interior: bool = False


class InteractionState(BaseModel):
    """
    All showroom interactions bundled.

    These states control the 3D scene but do NOT alter
    the purchasable configuration or pricing.
    """
    doors: DoorState = Field(default_factory=DoorState)
    hood_open: bool = False
    boot_open: bool = False
    frunk_open: bool = False
    sunroof_open: bool = False
    lighting: LightingState = Field(default_factory=LightingState)
    camera_preset: Optional[str] = Field(
        None, max_length=40,
        description=(
            "e.g. 'exterior', 'front', 'rear', 'interior', "
            "'cockpit', 'boot', 'wheel'"
        )
    )


class PurchasableConfiguration(BaseModel):
    """
    The parts of configuration that affect price.

    Only these fields flow into the pricing engine.
    """
    variant_id: str = Field(..., max_length=100)
    paint_id: Optional[str] = Field(None, max_length=80)
    wheel_id: Optional[str] = Field(None, max_length=80)
    interior_id: Optional[str] = Field(None, max_length=80)
    roof_id: Optional[str] = Field(None, max_length=80)
    accessory_ids: List[str] = Field(default_factory=list)

    @field_validator("accessory_ids")
    @classmethod
    def max_accessories(cls, v: List[str]) -> List[str]:
        if len(v) > 30:
            raise ValueError("Maximum 30 accessories per configuration")
        return v


class ConfigurationState(BaseModel):
    """
    The complete authoritative configuration state.

    purchasable: affects price — validated by backend
    interaction: showroom state — does not affect price
    """
    purchasable: PurchasableConfiguration
    interaction: InteractionState = Field(default_factory=InteractionState)


# ---------------------------------------------------------------------------
# Saved Configuration
# ---------------------------------------------------------------------------

class SavedConfigurationCreate(BaseModel):
    """Payload for saving a user configuration."""
    configuration: ConfigurationState
    city: Optional[str] = Field(None, max_length=80)
    price_snapshot: Optional[int] = Field(
        None, ge=0,
        description="Calculated on-road price at time of save"
    )
    asset_id: Optional[str] = Field(None, max_length=100)
    asset_version: Optional[str] = Field(None, max_length=30)


class SavedConfiguration(SavedConfigurationCreate):
    """A persisted saved configuration."""
    config_id: str
    owner_phone: Optional[str] = None
    share_token: Optional[str] = Field(
        None, max_length=64,
        description="URL-safe token for sharing without authentication"
    )
    created_at: str
    updated_at: str
    # Flag if any option is no longer available
    stale: bool = False
    stale_reason: Optional[str] = Field(None, max_length=500)


# ---------------------------------------------------------------------------
# Pricing Engine
# ---------------------------------------------------------------------------

class PriceComponent(BaseModel):
    """A single named component of the on-road price."""
    name: str = Field(..., max_length=80)
    amount: int = Field(..., ge=0)
    description: Optional[str] = Field(None, max_length=200)


class ConfigurationPriceRequest(BaseModel):
    """Request to calculate on-road price for a configuration."""
    configuration: PurchasableConfiguration
    city: Optional[str] = Field(None, max_length=80)
    state: Optional[str] = Field(None, max_length=80)
    # Optional offer codes
    offer_codes: List[str] = Field(default_factory=list, max_length=10)


class ConfigurationPriceResponse(BaseModel):
    """
    Backend-authoritative price breakdown.

    The frontend must NEVER be the source of truth for pricing.
    This response is the only valid price source.
    """
    variant_id: str
    city: Optional[str] = None
    # Breakdown
    base_ex_showroom: int
    option_deltas: List[PriceComponent] = Field(default_factory=list)
    total_options: int = 0
    subtotal_ex_showroom: int = 0
    rto: Optional[int] = None
    insurance_approx: Optional[int] = None
    tcs: Optional[int] = None
    other_charges: Optional[int] = None
    offers_applied: List[PriceComponent] = Field(default_factory=list)
    total_discount: int = 0
    estimated_on_road: int
    # Metadata
    price_is_estimate: bool = True
    effective_date: str
    source: Optional[str] = None

    @model_validator(mode="after")
    def compute_totals(self) -> "ConfigurationPriceResponse":
        self.total_options = sum(c.amount for c in self.option_deltas)
        self.subtotal_ex_showroom = self.base_ex_showroom + self.total_options
        self.total_discount = sum(c.amount for c in self.offers_applied)
        return self


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

class ValidationResult(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    # Which rules were evaluated and their outcomes
    rules_applied: List[Dict[str, Any]] = Field(default_factory=list)


class ConfigurationValidationRequest(BaseModel):
    configuration: PurchasableConfiguration


# ---------------------------------------------------------------------------
# AI Configurator Contract
# ---------------------------------------------------------------------------

class AIConfiguratorIntent(BaseModel):
    """
    Structured intent extracted from natural language by the AI.

    The AI populates this from the user's request.
    The backend then validates it against real options.
    The AI must NOT set prices or invent option IDs.
    """
    raw_request: str = Field(..., max_length=2000)
    # Extracted preferences (may be null if not mentioned)
    preferred_segment: Optional[str] = Field(None, max_length=60)
    max_budget: Optional[int] = Field(None, ge=0)
    preferred_fuel: Optional[str] = Field(None, max_length=40)
    preferred_color_description: Optional[str] = Field(None, max_length=200)
    preferred_interior_description: Optional[str] = Field(None, max_length=200)
    open_hood: Optional[bool] = None
    open_doors: Optional[bool] = None
    lights_on: Optional[bool] = None
    camera_preset: Optional[str] = Field(None, max_length=40)


class AIConfiguratorResponse(BaseModel):
    """
    The resolved configuration returned after AI intent is validated
    against real backend options.
    """
    configuration: Optional[ConfigurationState] = None
    price: Optional[ConfigurationPriceResponse] = None
    explanation: str = Field(..., max_length=2000)
    # If any requested option was unavailable, explain why
    unavailable_options: List[Dict[str, str]] = Field(default_factory=list)
    valid: bool
