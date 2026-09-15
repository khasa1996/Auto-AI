from typing import Any, Dict, Optional

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import configurator_routes
from configurator_routes import make_configurator_router


class FakeConfigurations:
    def __init__(self) -> None:
        self.document: Dict[str, Any] = {
            "config_id": "config-1",
            "owner_phone": "+919876543210",
            "share_token": "share-1",
            "configuration": {"purchasable": {"variant_id": "v1"}},
            "city": "Delhi",
            "price_snapshot": 1250000,
            "price_breakdown": {"estimated_on_road": 1250000},
            "asset_id": "asset-1",
            "asset_version": "2.0",
            "stale": False,
            "stale_reason": None,
        }

    async def find_one(
        self,
        query: Dict[str, Any],
        projection: Optional[Dict[str, int]] = None,
    ) -> Optional[Dict[str, Any]]:
        if query.get("config_id") != self.document.get("config_id"):
            return None
        return dict(self.document)


class FakeDatabase:
    def __init__(self) -> None:
        self.configurations = FakeConfigurations()


@pytest.mark.asyncio
async def test_private_saved_retrieval_revalidates_authoritative_context(monkeypatch: pytest.MonkeyPatch) -> None:
    db = FakeDatabase()

    async def fake_revalidate(saved_document: Dict[str, object], *_: object) -> Dict[str, object]:
        refreshed = dict(saved_document)
        refreshed["price_snapshot"] = 1275000
        refreshed["price_breakdown"] = {"estimated_on_road": 1275000}
        refreshed["stale"] = True
        refreshed["stale_reason"] = "Authoritative configurator price has changed"
        return refreshed

    monkeypatch.setattr(configurator_routes, "revalidate_saved_configuration", fake_revalidate)

    async def fake_auth() -> Optional[str]:
        return "+919876543210"

    app = FastAPI()
    app.include_router(make_configurator_router(db, fake_auth))
    client = TestClient(app)

    response = client.get("/api/v1/configurator/configurations/config-1")

    assert response.status_code == 200
    body = response.json()
    assert body["price_snapshot"] == 1275000
    assert body["stale"] is True
    assert body["stale_reason"] == "Authoritative configurator price has changed"
