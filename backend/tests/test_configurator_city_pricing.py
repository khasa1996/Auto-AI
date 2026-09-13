from types import SimpleNamespace

import pytest

from configurator_city_pricing import get_pricing_locations, validate_pricing_location


class FakeCollection:
    def __init__(self, document):
        self.document = document

    async def find_one(self, *_args, **_kwargs):
        return self.document


class FakeDB:
    def __init__(self, document):
        self.variant_pricing = FakeCollection(document)


@pytest.mark.asyncio
async def test_pricing_locations_include_only_verified_unique_cities():
    db = FakeDB(
        {
            "city_pricing": [
                {"city": "Delhi", "state": "Delhi", "verification_status": "verified"},
                {"city": "delhi", "state": "Delhi", "verification_status": "verified"},
                {"city": "Sonipat", "state": "Haryana", "verification_status": "unverified"},
                {"city": "Gurugram", "state": "Haryana", "verification_status": "verified"},
            ]
        }
    )

    assert await get_pricing_locations(db, "variant-1") == [
        {"city": "Delhi", "state": "Delhi"},
        {"city": "Gurugram", "state": "Haryana"},
    ]


@pytest.mark.asyncio
async def test_pricing_location_matching_is_case_and_whitespace_insensitive():
    db = FakeDB(
        {
            "city_pricing": [
                {"city": "New Delhi", "state": "Delhi", "verification_status": "verified"},
            ]
        }
    )

    assert await validate_pricing_location(db, "variant-1", "  new   delhi ") is True
    assert await validate_pricing_location(db, "variant-1", "Mumbai") is False
    assert await validate_pricing_location(db, "variant-1", None) is True


@pytest.mark.asyncio
async def test_missing_variant_pricing_has_no_selectable_locations():
    db = FakeDB(None)

    assert await get_pricing_locations(db, "variant-1") == []
    assert await validate_pricing_location(db, "variant-1", "Delhi") is False
