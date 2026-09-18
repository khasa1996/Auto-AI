import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from configurator_routes import make_configurator_router


class _Cursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, _limit):
        return self.rows


class _Collection:
    def __init__(self, rows=None):
        self.rows = rows or []

    async def find_one(self, query, *_args, **_kwargs):
        for row in self.rows:
            if all(row.get(key) == value for key, value in query.items()):
                return row
        return None

    def find(self, query=None, *_args, **_kwargs):
        if not query:
            return _Cursor(self.rows)
        return _Cursor([
            row for row in self.rows
            if all(row.get(key) == value for key, value in query.items())
        ])


class _DB:
    def __init__(self):
        self.variants = _Collection([
            {
                "variant_id": "v1",
                "brand_id": "b1",
                "model_id": "m1",
                "active": True,
                "verification_status": "verified",
                "configurator_status": "AVAILABLE",
                "configurator_asset_id": "asset-1",
            },
        ])
        self.variant_pricing = _Collection([])
        self.variant_colors = _Collection([])
        self.variant_wheels = _Collection([])
        self.variant_interiors = _Collection([])
        self.configurator_assets = _Collection([])


def _app(db):
    app = FastAPI()
    app.include_router(make_configurator_router(db))
    return app


@pytest.mark.asyncio
async def test_availability_does_not_claim_available_without_full_runtime_readiness():
    async with AsyncClient(
        transport=ASGITransport(app=_app(_DB())),
        base_url="http://test",
    ) as client:
        response = await client.get("/api/v1/configurator/v1/availability")

    assert response.status_code == 200
    body = response.json()
    assert body["configurator_status"] == "COMING_SOON"
    assert body["available"] is False
    assert body["asset_id"] is None
