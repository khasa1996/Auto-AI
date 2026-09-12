from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

import configurator_asset_admin_routes as routes
from configurator_asset_admin_routes import _require_admin, make_asset_admin_router
from configurator_asset_storage import AssetStorageConfig


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


def make_client():
    doc = {
        "asset_id": "asset-1",
        "variant_id": "variant-1",
        "model_id": "model-1",
        "brand_id": "brand-1",
        "format": "glb",
        "url": "https://cdn.example.com/asset-1.glb",
        "version": "1.0.0",
        "provenance": "LICENSED_THIRD_PARTY",
        "validation_passed": False,
        "admin_reviewed": False,
        "published": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    app = FastAPI()
    app.include_router(make_asset_admin_router(FakeDB(doc)))

    async def fake_admin():
        return "admin"

    app.dependency_overrides[_require_admin] = fake_admin
    return TestClient(app), doc


def test_upload_url_creates_short_lived_direct_upload_session(monkeypatch):
    client, doc = make_client()
    config = AssetStorageConfig(
        bucket="assets",
        region="ap-south-1",
        access_key_id="key",
        secret_access_key="secret",
        endpoint_url=None,
        public_base_url="https://cdn.example.com",
        upload_ttl_seconds=900,
    )
    monkeypatch.setattr(routes, "get_asset_storage_config", lambda: config)
    monkeypatch.setattr(routes, "create_presigned_upload", lambda *_args, **_kwargs: "https://upload.example.test/presigned")

    response = client.post(
        "/api/v1/admin/configurator/assets/upload-url",
        json={"asset_id": "asset-1", "filename": "Vehicle Model Final.GLB"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["upload_url"] == "https://upload.example.test/presigned"
    assert body["storage_key"] == "configurator/asset-1/v1.0.0/vehicle-model-final.glb"
    assert doc["storage_status"] == "PENDING_UPLOAD"
    assert doc["validation_passed"] is False


def test_upload_url_returns_service_unavailable_when_storage_is_unconfigured(monkeypatch):
    client, _ = make_client()
    monkeypatch.setattr(
        routes,
        "get_asset_storage_config",
        lambda: (_ for _ in ()).throw(routes.AssetStorageConfigError("ASSET_STORAGE_BUCKET is required")),
    )

    response = client.post(
        "/api/v1/admin/configurator/assets/upload-url",
        json={"asset_id": "asset-1", "filename": "vehicle.glb"},
    )

    assert response.status_code == 503
    assert "ASSET_STORAGE_BUCKET" in response.json()["detail"]
