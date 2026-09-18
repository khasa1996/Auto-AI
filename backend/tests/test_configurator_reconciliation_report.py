"""Tests for read-only reconciliation reporting."""

from configurator_catalog_reconciliation import (
    CatalogReconciliationResult,
    ReconciliationStatus,
)
from configurator_reconciliation_report import summarize_reconciliation_matrix


def test_report_aggregates_statuses_and_blockers_deterministically() -> None:
    results = [
        CatalogReconciliationResult(
            status=ReconciliationStatus.REVIEW_REQUIRED,
            legacy_car_id="kia-seltos",
            blockers=["authoritative vehicle identity is missing"],
        ),
        CatalogReconciliationResult(
            status=ReconciliationStatus.IDENTITY_VERIFIED,
            legacy_car_id="mg-hector",
            canonical_variant_id="mg-hector-savvy-pro",
            blockers=["licensed 3D asset is not verified"],
        ),
        CatalogReconciliationResult(
            status=ReconciliationStatus.READY_FOR_ONBOARDING,
            legacy_car_id="audi-q3",
            canonical_variant_id="audi-q3-premium-plus",
        ),
    ]

    report = summarize_reconciliation_matrix(results)

    assert report.total_records == 3
    assert report.status_counts == {
        "REVIEW_REQUIRED": 1,
        "IDENTITY_VERIFIED": 1,
        "READY_FOR_ONBOARDING": 1,
    }
    assert report.blocker_counts == {
        "authoritative vehicle identity is missing": 1,
        "licensed 3D asset is not verified": 1,
    }
    assert report.ready_legacy_car_ids == ("audi-q3",)
    assert report.blocked_legacy_car_ids == ("kia-seltos", "mg-hector")


def test_report_is_stable_for_repeated_input_order() -> None:
    ready = CatalogReconciliationResult(
        status=ReconciliationStatus.READY_FOR_ONBOARDING,
        legacy_car_id="z",
    )
    review = CatalogReconciliationResult(
        status=ReconciliationStatus.REVIEW_REQUIRED,
        legacy_car_id="a",
        blockers=["blocker"],
    )

    first = summarize_reconciliation_matrix([ready, review]).to_dict()
    second = summarize_reconciliation_matrix([review, ready]).to_dict()

    assert first == second
