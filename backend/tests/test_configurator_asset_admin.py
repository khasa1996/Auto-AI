from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from configurator_asset_admin_routes import make_asset_admin_router


class FakeCollection:
    def __init__(self, doc):
        self.doc = doc

    async def find_one(self, *_args, **_kwargs):
        return self.doc.copy() if self.doc else None

    async def update_one(self, _filter, update):
        if self.doc:
            self.doc.update(update.get("$set", {}))
        return SimpleNamespace(matched_count=1)


class FakeDB:
    def __init__(self, doc):
        self.configurator_assets = FakeCollection(doc)


@pytest.fixture
def client(monkeypatch):
    doc = {
        "asset_id": "asset-1",
        "variant_id": "variant-1",
        "model_id": "model-1",
        "brand_id": "brand-1",
        "format": "glb",
        "url": "https://cdn.example.com/asset-1.glb",
        "version": "1.0.0",
        "provenance": "LICENSED_THIRD_PARTY",
        "validation_passed": True,
        "admin_reviewed": False,
        "published": False,
        "license_name": "Commercial License",
        "publisher": "Example Studio",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    db = FakeDB(doc)
    app = FastAPI()
    app.include_router(make_asset_admin_router(db))

    async def fake_admin():
        return "admin"

    monkeypatch.setattr("configurator_asset_admin_routes._require_admin", fake_admin)
    return TestClient(app), doc


def test_approved_review_requires_technical_validation(client):
    test_client, doc = client
    doc["validation_passed"] = False
    response = test_client.post(
        "/api/v1/admin/configurator/assets/review",
        json={"asset_id": "asset-1", "approved": True, "review_notes": "checked"},
    )
    assert response.status_code == 422
    assert doc["admin_reviewed"] is False


def test_approved_review_records_notes(client):
    test_client, doc = client
    response = test_client.post(
        "/api/v1/admin/configurator/assets/review",
        json={"asset_id": "asset-1", "approved": True, "review_notes": "rights verified"},
    )
    assert response.status_code == 200
    assert response.json()["admin_reviewed"] is True
    assert doc["review_notes"] == "rights verified"


def test_rejected_review_unpublishes_asset(client):
    test_client, doc = client
    doc["published"] = True
    response = test_client.post(
        "/api/v1/admin/configurator/assets/review",
        json={"asset_id": "asset-1", "approved": False, "review_notes": "rights unclear"},
    )
    assert response.status_code == 200
    assert doc["admin_reviewed"] is False
    assert doc["published"] is False
