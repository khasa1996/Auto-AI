import asyncio

import pytest

from configurator_ai import resolve_ai_selection
from configurator_schemas import AIConfiguratorIntent


def test_ai_selection_rejects_unverified_variant_before_llm_resolution(monkeypatch):
    class Collection:
        async def find_one(self, query, projection=None):
            if query == {"variant_id": "v1"}:
                return {
                    "variant_id": "v1",
                    "active": True,
                    "verification_status": "unverified",
                    "configurator_status": "AVAILABLE",
                }
            return None

        def find(self, query, projection=None):
            class Cursor:
                async def to_list(self, _limit):
                    return []

            return Cursor()

    class DB:
        variants = Collection()
        cars = Collection()
        variant_pricing = Collection()
        variant_colors = Collection()
        variant_wheels = Collection()
        variant_interiors = Collection()
        configurator_assets = Collection()
        configurator_options = Collection()

    async def catalog_for_variant(*_args, **_kwargs):
        return {
            "colors": [{"variant_id": "v1", "available": True}],
            "wheels": [{"variant_id": "v1", "available": True}],
            "interiors": [{"variant_id": "v1", "available": True}],
            "roofs": [],
            "accessories": [],
        }

    monkeypatch.setattr("configurator_ai.get_available_options_for_variant", catalog_for_variant)

    with pytest.raises(ValueError, match="vehicle verification is not complete"):
        asyncio.run(
            resolve_ai_selection(
                AIConfiguratorIntent(variant_id="v1", raw_request="make it black"),
                DB(),
            )
        )
