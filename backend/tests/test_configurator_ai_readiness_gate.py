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


def test_ai_selection_uses_variant_assigned_active_asset_revision(monkeypatch):
    captured_runtime_context = {}

    class Cursor:
        async def to_list(self, _limit):
            return []

    class Collection:
        async def find_one(self, query, projection=None):
            if query == {"variant_id": "v1"}:
                return {
                    "variant_id": "v1",
                    "active": True,
                    "verification_status": "verified",
                    "configurator_status": "AVAILABLE",
                    "configurator_asset_id": "asset-assigned",
                }
            if query == {"variant_id": "v1"} and projection:
                return None
            if query.get("variant_id") == "v1" and query.get("asset_id") == "asset-assigned":
                return {
                    "asset_id": "asset-assigned",
                    "variant_id": "v1",
                    "published": True,
                    "validation_passed": True,
                    "active_revision_id": "rev-assigned",
                    "revisions": [{
                        "revision_id": "rev-assigned",
                        "asset_id": "asset-assigned",
                        "variant_id": "v1",
                        "version": "3.0",
                        "checksum_sha256": "a" * 64,
                        "state": "PUBLISHED",
                    }],
                    "version": "3.0",
                    "supported_interactions": ["doors"],
                    "camera_preset_names": ["exterior"],
                    "provenance": "OEM_AUTHORIZED",
                    "license_name": "OEM",
                    "publisher": "OEM",
                    "file_size_bytes": 1,
                    "url": "https://cdn.example.com/asset.glb",
                }
            if query.get("variant_id") == "v1" and query.get("published") is True:
                return {
                    "asset_id": "asset-unassigned",
                    "variant_id": "v1",
                    "published": True,
                    "validation_passed": True,
                    "version": "9.0",
                    "supported_interactions": ["hood"],
                    "camera_preset_names": ["rear"],
                }
            return None

        def find(self, query, projection=None):
            return Cursor()

    class Pricing:
        async def find_one(self, query, projection=None):
            return {
                "variant_id": "v1",
                "base_ex_showroom": 1200000,
                "verification_status": "verified",
                "source": "OEM",
            }

    class DB:
        variants = Collection()
        configurator_assets = Collection()
        variant_pricing = Pricing()
        variant_colors = Collection()
        variant_wheels = Collection()
        variant_interiors = Collection()

    async def catalog_for_variant(*_args, **_kwargs):
        return {
            "colors": [{"variant_id": "v1", "option_id": "black", "available": True}],
            "wheels": [{"variant_id": "v1", "option_id": "w1", "available": True}],
            "interiors": [{"variant_id": "v1", "option_id": "i1", "available": True}],
            "roofs": [],
            "accessories": [],
        }

    class Price:
        def model_dump(self, mode=None):
            return {"estimated_on_road": 1500000}

    class Chat:
        async def send_message(self, _message):
            return '{"variant_id":"v1"}'

    monkeypatch.setattr("configurator_ai.get_available_options_for_variant", catalog_for_variant)
    monkeypatch.setattr("configurator_ai.calculate_configuration_price", lambda *_args, **_kwargs: asyncio.sleep(0, result=Price()))
    monkeypatch.setattr("configurator_ai.resolve_model", lambda: ("test", "test"))
    monkeypatch.setattr("configurator_ai.LlmChat", lambda *_args, **_kwargs: Chat())
    monkeypatch.setattr(
        "configurator_ai.build_ai_prompt",
        lambda intent, catalog, base_configuration, city, runtime_context=None: (
            captured_runtime_context.update(runtime_context or {}) or "prompt"
        ),
    )

    asyncio.run(
        resolve_ai_selection(
            AIConfiguratorIntent(variant_id="v1", raw_request="show me the car"),
            DB(),
        )
    )

    assert captured_runtime_context["verified_asset"]["asset_id"] == "asset-assigned"
