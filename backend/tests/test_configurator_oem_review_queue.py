"""Tests for the read-only OEM evidence review queue."""

from configurator_catalog_reconciliation import (
    AuthoritativeCatalogEvidence,
    AuthoritativeVehicleIdentity,
    ReconciliationStatus,
)
from configurator_oem_review_queue import build_oem_review_queue, summarize_oem_review_queue


def _record(vehicle_id: str, brand: str, model: str, variant: str, model_year: int | None = None) -> dict[str, object]:
    return {
        "id": vehicle_id,
        "brand": brand,
        "model": model,
        "variant": variant,
        "fuel": "Petrol",
        "transmission": "Automatic",
        **({"model_year": model_year} if model_year is not None else {}),
    }


def _identity() -> AuthoritativeVehicleIdentity:
    return AuthoritativeVehicleIdentity.from_verified_source(
        brand_id="kia",
        brand_name="Kia",
        model_id="kia-seltos",
        model_name="Seltos",
        variant_id="kia-seltos-gtx-o",
        variant_name="GTX(O)",
        fuel_type="petrol",
        transmission="automatic",
        source="Kia India",
        source_url="https://www.kia.com/in/our-vehicles/seltos/showroom.html",
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


def test_unmapped_legacy_record_is_explicitly_review_required() -> None:
    items = build_oem_review_queue([_record("kia-seltos", "Kia", "Seltos", "GTX+")])
    assert len(items) == 1
    assert items[0].status is ReconciliationStatus.REVIEW_REQUIRED
    assert items[0].review_state == "REVIEW_REQUIRED"
    assert items[0].canonical_variant_id is None
    assert items[0].authoritative_source_url is None
    assert items[0].pricing_verified is False
    assert items[0].licensed_3d_asset_verified is False
    assert "authoritative vehicle identity is missing" in items[0].blockers


def test_explicit_identity_and_complete_evidence_can_reach_ready_state() -> None:
    items = build_oem_review_queue(
        [_record("kia-seltos", "Kia", "Seltos", "GTX(O)")],
        identities={"kia-seltos": _identity()},
        evidence={"kia-seltos": _complete_evidence()},
    )
    assert items[0].status is ReconciliationStatus.READY_FOR_ONBOARDING
    assert items[0].review_state == "READY"
    assert items[0].canonical_variant_id == "kia-seltos-gtx-o"
    assert items[0].authoritative_source == "Kia India"
    assert items[0].asset_revision_published is True


def test_actual_legacy_gtx_plus_mismatch_remains_blocked() -> None:
    items = build_oem_review_queue(
        [_record("kia-seltos", "Kia", "Seltos", "GTX+")],
        identities={"kia-seltos": _identity()},
        evidence={"kia-seltos": _complete_evidence()},
    )
    assert items[0].status is ReconciliationStatus.REVIEW_REQUIRED
    assert items[0].review_state == "REVIEW_REQUIRED"
    assert items[0].canonical_variant_id is None
    assert items[0].blockers == ("legacy identity does not match authoritative identity",)


def test_partial_evidence_remains_evidence_required() -> None:
    items = build_oem_review_queue(
        [_record("kia-seltos", "Kia", "Seltos", "GTX(O)")],
        identities={"kia-seltos": _identity()},
        evidence={"kia-seltos": AuthoritativeCatalogEvidence(pricing_verified=True)},
    )
    assert items[0].status is ReconciliationStatus.IDENTITY_VERIFIED
    assert items[0].review_state == "EVIDENCE_REQUIRED"
    assert items[0].pricing_verified is True
    assert items[0].compatible_colors_verified is False


def test_queue_is_sorted_and_does_not_mutate_inputs() -> None:
    records = [
        _record("z", "Brand", "Model", "Variant"),
        _record("a", "Brand", "Model", "Variant"),
    ]
    before = [dict(record) for record in records]
    items = build_oem_review_queue(records)
    assert [item.legacy_car_id for item in items] == ["a", "z"]
    assert records == before


def test_queue_summary_is_deterministic() -> None:
    items = build_oem_review_queue([
        _record("z", "Brand", "Model", "Variant"),
        _record("a", "Brand", "Model", "Variant"),
    ])
    assert summarize_oem_review_queue(items) == {
        "total_items": 2,
        "review_state_counts": {
            "REVIEW_REQUIRED": 2,
            "EVIDENCE_REQUIRED": 0,
            "READY": 0,
        },
        "legacy_car_ids": ["a", "z"],
    }
