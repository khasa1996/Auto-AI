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
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class AssetProvenance(str, Enum):
    """Provenance classification for 3D assets."""
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
_MAX_ASSET_BYTES = 200 * 1024 * 1024


class AssetLODLevel(str, Enum):
    """Level of detail tier."""
    LOD0 = "LOD0"
    LOD1 = "LOD1"
    LOD2 = "LOD2"
    LOD3 = "LOD3"


class ConfiguratorAssetCreate(BaseModel):
    """Metadata record for a production 3D vehicle asset."""
    asset_id: str = Field(..., min_length=2, max_length=100)
    variant_id: str = Field(..., max_length=100)
    model_id: str = Field(..., max_length=80)
    brand_id: str = Field(..., max_length=60)
    format: str = Field(..., pattern=r"^(glb|gltf)$")
    url: str = Field(..., max_length=2000)
    cdn_url: Optional[str] = Field(None, max_length=2000)
    file_size_bytes: Optional[int] = Field(None, ge=0, le=_MAX_ASSET_BYTES)
    checksum_sha256: Optional[str] = Field(None, max_length=64)
    version: str = Field(..., min_length=1, max_length=30)
    lod_level: AssetLODLevel = AssetLODLevel.LOD0
    provenance: AssetProvenance = AssetProvenance.UNKNOWN
    license_name: Optional[str] = Field(None, max_length=200)
    license_url: Optional[str] = Field(None, max_length=500)
    publisher: Optional[str] = Field(None, max_length=200)
    supported_interactions: List[str] = Field(default_factory=list)
    paint_material_names: List[str] = Field(default_factory=list)
    wheel_mesh_names: Dict[str, str] = Field(default_factory=dict)
    option_mesh_names: Dict[str, List[str]] = Field(default_factory=dict)
    interaction_animation_names: Dict[str, Dict[str, str]] = Field(default_factory=dict)
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
            raise ValueError(f"Asset URL must end with one of {_VALID_ASSET_EXTENSIONS}")
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


class ConfiguratorOptionType(str, Enum):
    PAINT = "paint"
    WHEEL = "wheel"
    INTERIOR = "interior"
    ROOF = "roof"
    ACCESSORY = "accessory"
    TRIM = "trim"


class ConfiguratorOption(BaseModel):
    """A single purchasable configuration choice."""
    option_id: str = Field(..., max_length=100)
    option_type: ConfiguratorOptionType
    variant_id: str = Field(..., max_length=100)
    name: str = Field(..., max_length=150)
    display_name: str = Field(..., max_length=150)
    price_delta: int = Field(0, ge=0)
    available: bool = True
    reference_id: str = Field(..., max_length=100)
    preview_color_hex: Optional[str] = Field(None, max_length=10)
    preview_image_url: Optional[str] = Field(None, max_length=500)
