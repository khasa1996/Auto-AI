import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from configurator_vehicle_readiness_routes import make_vehicle_readiness_router


class _Cursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, _limit):
        return self.rows


class _Collection:
    def __init__(self, rows=None, one=None):
        self.rows = rows or []
        self.one = one

    async def find_one(self, *_args, **_kwargs):
        return self.one

    def find(self, *_args, **_kwargs):
        return _Cursor(self.rows)


class _DB:
    def __init__(self):
        self.variants = _Collection(one={
            "variant_id": "demo-variant",
            "model_id": "demo-model",
            "brand_id": "demo-brand",
            "active": True,
            "verification_status": "verified",
            "configurator_asset_id": "asset-1",
        })
        self.variant_pricing = _Collection(one={
            "variant_id": "demo-variant",
            "base_ex_showroom": 1000000,
            "source": "verified-source",
            "verification_status": "verified",
        })
        self.variant_colors = _Collection(rows=[{"variant_id": "demo-variant", "available": True}])
        self.variant_wheels = _Collection(rows=[{"variant_id": "demo-variant", "available": True}])
        self.variant_interiors = _Collection(rows=[{"variant_id": "demo-variant", "available": True}])
        self.configurator_assets = _Collection(one={
            "asset_id": "asset-1",
            "variant_id": "demo-variant",
            "version": "1.0.0",
            "published": True,
            "validation_passed": True,
            "provenance": "AUTO_AI_LICENSED",
        })


@pytest.mark.asyncio
async def test_vehicle_readiness_route_returns_ready_contract():
    app = FastAPI()
    app.include_router(make_vehicle_readiness_router(_DB()))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/configurator/variants/demo-variant/readiness")

    assert response.status_code == 200
    assert response.json()["ready"] is True
    assert response.json()["blockers"] == []


@pytest.mark.asyncio
async def test_vehicle_readiness_route_blocks_unverified_pricing():
    db = _DB()
    db.variant_pricing.one["verification_status"] = "unverified"
    app = FastAPI()
    app.include_router(make_vehicle_readiness_router(db))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/configurator/variants/demo-variant/readiness")

    assert response.status_code == 200
    assert response.json()["ready"] is False
    assert "variant pricing verification is not complete" in response.json()["blockers"]
