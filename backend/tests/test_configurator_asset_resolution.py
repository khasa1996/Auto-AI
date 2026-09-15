import pytest

from configurator_routes import resolve_saved_configuration_asset


class FakeCollection:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.queries = []

    async def find_one(self, query, projection):
        self.queries.append(query)
        return next(self.responses)


class FakeDb:
    def __init__(self, variants, assets):
        self.variants = FakeCollection(variants)
        self.configurator_assets = FakeCollection(assets)


@pytest.mark.asyncio
async def test_resolves_variant_assigned_asset_when_request_omits_asset_id():
    db = FakeDb(
        variants=[{"configurator_asset_id": "asset-v1"}],
        assets=[{"asset_id": "asset-v1", "version": "1.0"}],
    )

    result = await resolve_saved_configuration_asset(db, "variant-1", None)

    assert result == {"asset_id": "asset-v1", "version": "1.0"}
    assert db.configurator_assets.queries[0]["variant_id"] == "variant-1"
    assert db.configurator_assets.queries[0]["published"] is True
    assert db.configurator_assets.queries[0]["validation_passed"] is True


@pytest.mark.asyncio
async def test_requested_asset_can_fallback_when_variant_has_no_assignment():
    db = FakeDb(
        variants=[{}],
        assets=[{"asset_id": "asset-v1", "version": "2.0"}],
    )

    result = await resolve_saved_configuration_asset(db, "variant-1", "asset-v1")

    assert result == {"asset_id": "asset-v1", "version": "2.0"}
    assert db.variants.queries == [{"variant_id": "variant-1"}]
    assert db.configurator_assets.queries[0]["asset_id"] == "asset-v1"
    assert db.configurator_assets.queries[0]["variant_id"] == "variant-1"
    assert db.configurator_assets.queries[0]["published"] is True
    assert db.configurator_assets.queries[0]["validation_passed"] is True


@pytest.mark.asyncio
async def test_missing_assignment_returns_no_asset():
    db = FakeDb(variants=[{}], assets=[])

    result = await resolve_saved_configuration_asset(db, "variant-1", None)

    assert result is None
