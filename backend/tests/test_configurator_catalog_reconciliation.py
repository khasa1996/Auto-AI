"""Tests for the side-effect-free configurator catalog reconciliation boundary."""

from configurator_catalog_reconciliation import (
    AuthoritativeCatalogEvidence,
    AuthoritativeVehicleIdentity,
    ReconciliationStatus,
    reconcile_legacy_vehicle,
)


def _legacy() -> dict[str, str]:
    return {
        "id": "seltos-gtx-plus",
        "brand": "Kia",
        "model": "Seltos",
        "variant": "GTX+",
        "fuel": "Diesel",
        "transmission": "Automatic",
    }


def _identity() -> AuthoritativeVehicleIdentity:
    return AuthoritativeVehicleIdentity(
        brand_id="kia",
        brand_name="Kia",
        model_id="kia-seltos",
        model_name="Seltos",
        variant_id="kia-seltos-gtx",
        variant_name="GTX+",
        fuel_type="Diesel",
        transmission="Automatic",
        source="OEM",
        source_url="https://example.invalid/oem",
    )


def _complete_evidence() -> AuthoritativeCatalogEvidence:
    return AuthoritativeCatalogEvidence(
        pricing_verified=True,
        compatible_colors_verified=True,
        compatible_wheels_verified=True,
        compatible_interiors_verified=True,
        licensed_3d_asset_verified=True,
        asset_revision_published=True,
    )


def test_legacy_record_alone_requires_review() -> None:
    result = reconcile_legacy_vehicle(_legacy())

    assert result.status is ReconciliationStatus.REVIEW_REQUIRED
    assert result.canonical_variant_id is None
    assert "authoritative vehicle identity is missing" in result.blockers


def test_explicit_identity_mismatch_is_blocked() -> None:
    identity = _identity().model_copy(update={"variant_name": "GTX"})

    result = reconcile_legacy_vehicle(_legacy(), identity)

    assert result.status is ReconciliationStatus.REVIEW_REQUIRED
    assert result.canonical_variant_id is None


def test_verified_identity_without_evidence_is_not_ready() -> None:
    result = reconcile_legacy_vehicle(_legacy(), _identity())

    assert result.status is ReconciliationStatus.IDENTITY_VERIFIED
    assert result.canonical_variant_id == "kia-seltos-gtx"
    assert result.blockers


def test_complete_authoritative_evidence_is_ready_for_onboarding() -> None:
    result = reconcile_legacy_vehicle(_legacy(), _identity(), _complete_evidence())

    assert result.status is ReconciliationStatus.READY_FOR_ONBOARDING
    assert result.canonical_variant_id == "kia-seltos-gtx"
    assert result.blockers == []


def test_reconciliation_does_not_mutate_legacy_input() -> None:
    legacy = _legacy()
    before = dict(legacy)

    reconcile_legacy_vehicle(legacy, _identity(), _complete_evidence())

    assert legacy == before
