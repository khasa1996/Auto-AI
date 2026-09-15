"""TDD coverage for authoritative configurator option pricing."""

import asyncio

import pytest

from configurator_schemas import ConfigurationPriceRequest, PurchasableConfiguration
from pricing_engine import calculate_configuration_price


class FakeCollection:
    def __init__(self, documents):
        self.documents = documents

    async def find_one(self, query, projection=None):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return document
        return None


class FakeDatabase:
    def __init__(self, *, colors=None, wheels=None, pricing=None):
        self.variant_pricing = FakeCollection(pricing or [])
        self.cars = FakeCollection([])
        self.variant_colors = FakeCollection(colors or [])
        self.variant_wheels = FakeCollection(wheels or [])
        self.variant_interiors = FakeCollection([])
        self.configurator_options = FakeCollection([])


def test_selected_paint_must_be_available() -> None:
    db = FakeDatabase(
        pricing=[{"variant_id": "variant-1", "base_ex_showroom": 1000000}],
        colors=[{
            "variant_id": "variant-1",
            "color_id": "red-01",
            "display_name": "Red",
            "price_delta": 25000,
            "available": False,
        }],
    )
    request = ConfigurationPriceRequest(
        configuration=PurchasableConfiguration(variant_id="variant-1", paint_id="red-01")
    )

    with pytest.raises(ValueError, match="Paint option 'red-01' is not available"):
        asyncio.run(calculate_configuration_price(request, db))


def test_price_totals_use_authoritative_option_deltas() -> None:
    db = FakeDatabase(
        pricing=[{
            "variant_id": "variant-1",
            "base_ex_showroom": 1000000,
            "city_pricing": [{
                "city": "Delhi",
                "state": "Delhi",
                "verification_status": "verified",
                "rto": 50000,
                "insurance_approx": 30000,
                "tcs": 10000,
                "handling": 5000,
            }],
        }],
        colors=[{"variant_id": "variant-1", "color_id": "red-01", "display_name": "Red", "price_delta": 25000, "available": True}],
        wheels=[{"variant_id": "variant-1", "wheel_id": "wheel-01", "name": "Sport", "price_delta": 15000, "available": True}],
    )
    request = ConfigurationPriceRequest(
        configuration=PurchasableConfiguration(
            variant_id="variant-1", paint_id="red-01", wheel_id="wheel-01"
        ),
        city="Delhi",
    )

    result = asyncio.run(calculate_configuration_price(request, db))

    assert result.total_options == 40000
    assert result.subtotal_ex_showroom == 1040000
    assert result.estimated_on_road == 1135000
