from types import SimpleNamespace

import pytest

from configurator_premium_routes import build_conversion_document, build_history_item


def test_build_history_item_excludes_owner_phone_and_share_token():
    item = build_history_item(
        {
            "config_id": "cfg-1",
            "owner_phone": "9999999999",
            "share_token": "secret-token",
            "configuration": {"purchasable": {"variant_id": "v1"}},
            "city": "Delhi",
            "price_snapshot": 123456,
            "asset_id": "asset-1",
            "asset_version": "1.0",
            "stale": False,
            "stale_reason": None,
            "created_at": "2026-09-11T00:00:00+00:00",
            "updated_at": "2026-09-11T00:00:00+00:00",
        }
    )
    assert item["config_id"] == "cfg-1"
    assert "owner_phone" not in item
    assert "share_token" not in item


def test_build_conversion_document_uses_server_price_and_auth_owner():
    payload = SimpleNamespace(
        source="finance",
        variant_id="v1",
        configuration={"purchasable": {"variant_id": "v1"}},
        city="Delhi",
        estimated_on_road=999999,
        price_effective_date=None,
    )
    document = build_conversion_document(payload, "9876543210", 123456, "2026-09-11T00:00:00+00:00")
    assert document["owner_phone"] == "9876543210"
    assert document["estimated_on_road"] == 123456
    assert document["source"] == "finance"
    assert document["created_at"] == "2026-09-11T00:00:00+00:00"


def test_build_conversion_document_rejects_mismatched_variant():
    payload = SimpleNamespace(
        source="dealer",
        variant_id="v2",
        configuration={"purchasable": {"variant_id": "v1"}},
        city=None,
        estimated_on_road=None,
        price_effective_date=None,
    )
    with pytest.raises(ValueError, match="variant"):
        build_conversion_document(payload, "9876543210", 100, "2026-09-11T00:00:00+00:00")
