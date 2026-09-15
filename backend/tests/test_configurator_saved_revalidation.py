import pytest

from configurator_persistence import revalidate_saved_configuration


@pytest.mark.asyncio
async def test_revalidate_saved_configuration_returns_stale_when_authoritative_context_changes():
    saved = {
        "configuration": {"purchasable": {"variant_id": "v1", "paint_id": "red"}},
        "city": "Delhi",
        "price_snapshot": 1250000,
        "asset_id": "asset-1",
        "asset_version": "2.0",
        "stale": False,
        "stale_reason": None,
    }

    async def current_price(_configuration, _city):
        return {"estimated_on_road": 1275000}

    async def current_asset(_variant_id, _asset_id):
        return {"asset_id": "asset-1", "version": "2.0"}

    result = await revalidate_saved_configuration(saved, current_price, current_asset)

    assert result["stale"] is True
    assert result["stale_reason"] == "Authoritative configurator price has changed"
    assert result["price_snapshot"] == 1275000


@pytest.mark.asyncio
async def test_revalidate_saved_configuration_preserves_fresh_context():
    saved = {
        "configuration": {"purchasable": {"variant_id": "v1"}},
        "city": "Delhi",
        "price_snapshot": 1250000,
        "asset_id": "asset-1",
        "asset_version": "2.0",
        "stale": False,
        "stale_reason": None,
    }

    async def current_price(_configuration, _city):
        return {"estimated_on_road": 1250000}

    async def current_asset(_variant_id, _asset_id):
        return {"asset_id": "asset-1", "version": "2.0"}

    result = await revalidate_saved_configuration(saved, current_price, current_asset)

    assert result["stale"] is False
    assert result["stale_reason"] is None
    assert result["price_snapshot"] == 1250000
