"""Side-effect-free reconciliation boundary for the production configurator catalog.

This module never writes to MongoDB and never promotes a legacy vehicle by itself.
Authoritative identity and evidence must be supplied explicitly by an approved source.
"""

from __future__ import annotations

from enum import Enum
from typing import Mapping

from pydantic import BaseModel, ConfigDict, Field


class ReconciliationStatus(str, Enum):
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    IDENTITY_VERIFIED = "IDENTITY_VERIFIED"
    READY_FOR_ONBOARDING = "READY_FOR_ONBOARDING"


class AuthoritativeVehicleIdentity(BaseModel):
    """Explicit OEM/authoritative identity evidence for one real variant."""

    model_config = ConfigDict(frozen=True)

    brand_id: str = Field(..., min_length=1, max_length=60)
    brand_name: str = Field(..., min_length=1, max_length=120)
    model_id: str = Field(..., min_length=1, max_length=80)
    model_name: str = Field(..., min_length=1, max_length=150)
    variant_id: str = Field(..., min_length=1, max_length=100)
    variant_name: str = Field(..., min_length=1, max_length=150)
    fuel_type: str = Field(..., min_length=1, max_length=40)
    transmission: str = Field(..., min_length=1, max_length=60)
    verification_status: str = "verified"
    source: str = Field(..., min_length=1, max_length=100)
    source_url: str = Field(..., min_length=1, max_length=500)


class AuthoritativeCatalogEvidence(BaseModel):
    """Evidence required before a reconciled vehicle can enter onboarding."""

    model_config = ConfigDict(frozen=True)

    pricing_verified: bool = False
    compatible_colors_verified: bool = False
    compatible_wheels_verified: bool = False
    compatible_interiors_verified: bool = False
    licensed_3d_asset_verified: bool = False
    asset_revision_published: bool = False


class CatalogReconciliationResult(BaseModel):
    """Deterministic reconciliation outcome with no persistence side effects."""

    status: ReconciliationStatus
    legacy_car_id: str
    canonical_variant_id: str | None = None
    blockers: list[str] = Field(default_factory=list)


def _text(value: object) -> str:
    return str(value).strip().casefold()


def _identity_matches(
    legacy: Mapping[str, object],
    authoritative: AuthoritativeVehicleIdentity,
) -> bool:
    return (
        _text(legacy.get("brand")) == _text(authoritative.brand_name)
        and _text(legacy.get("model")) == _text(authoritative.model_name)
        and _text(legacy.get("variant")) == _text(authoritative.variant_name)
        and _text(legacy.get("fuel")) == _text(authoritative.fuel_type)
        and _text(legacy.get("transmission")) == _text(authoritative.transmission)
    )


def reconcile_legacy_vehicle(
    legacy: Mapping[str, object],
    authoritative: AuthoritativeVehicleIdentity | None = None,
    evidence: AuthoritativeCatalogEvidence | None = None,
) -> CatalogReconciliationResult:
    """Reconcile one legacy record without promotion or database mutation."""

    legacy_car_id = _text(legacy.get("id"))
    if not legacy_car_id:
        raise ValueError("legacy vehicle id is required")

    if authoritative is None:
        return CatalogReconciliationResult(
            status=ReconciliationStatus.REVIEW_REQUIRED,
            legacy_car_id=legacy_car_id,
            blockers=["authoritative vehicle identity is missing"],
        )

    if not _identity_matches(legacy, authoritative):
        return CatalogReconciliationResult(
            status=ReconciliationStatus.REVIEW_REQUIRED,
            legacy_car_id=legacy_car_id,
            blockers=["legacy identity does not match authoritative identity"],
        )

    if authoritative.verification_status != "verified":
        return CatalogReconciliationResult(
            status=ReconciliationStatus.REVIEW_REQUIRED,
            legacy_car_id=legacy_car_id,
            blockers=["authoritative vehicle identity is not verified"],
        )

    if evidence is None:
        return CatalogReconciliationResult(
            status=ReconciliationStatus.IDENTITY_VERIFIED,
            legacy_car_id=legacy_car_id,
            canonical_variant_id=authoritative.variant_id,
            blockers=["authoritative pricing, options, and 3D asset evidence is incomplete"],
        )

    blockers: list[str] = []
    evidence_checks = (
        ("authoritative pricing is not verified", evidence.pricing_verified),
        ("compatible colors are not verified", evidence.compatible_colors_verified),
        ("compatible wheels are not verified", evidence.compatible_wheels_verified),
        ("compatible interiors are not verified", evidence.compatible_interiors_verified),
        ("licensed 3D asset is not verified", evidence.licensed_3d_asset_verified),
        ("active 3D asset revision is not published", evidence.asset_revision_published),
    )
    for message, passed in evidence_checks:
        if not passed:
            blockers.append(message)

    return CatalogReconciliationResult(
        status=(
            ReconciliationStatus.READY_FOR_ONBOARDING
            if not blockers
            else ReconciliationStatus.IDENTITY_VERIFIED
        ),
        legacy_car_id=legacy_car_id,
        canonical_variant_id=authoritative.variant_id,
        blockers=blockers,
    )
