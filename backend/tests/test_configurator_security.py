"""Offline regression tests for saved configurator security."""

from typing import Any, Dict, Optional

from fastapi import FastAPI
from fastapi.testclient import TestClient

from configurator_routes import make_configurator_router


class FakeResult:
    def __init__(self, value: Optional[Dict[str, Any]]):
        self.value = value


class FakeConfigurations:
    def __init__(self) -> None:
        self.documents: Dict[str, Dict[str, Any]] = {}

    async def insert_one(self, document: Dict[str, Any]) -> FakeResult:
        stored = dict(document)
        stored["_id"] = "test-id"
        self.documents[stored["config_id"]] = stored
        self.documents[stored["share_token"]] = stored
        return FakeResult(stored)

    async def find_one(
        self,
        query: Dict[str, Any],
        projection: Optional[Dict[str, int]] = None,
    ) -> Optional[Dict[str, Any]]:
        for document in self.documents.values():
            if all(
                document.get(key) == value
                for key, value in query.items()
                if not key.startswith("$")
            ):
                result = dict(document)
                if projection and projection.get("_id") == 0:
                    result.pop("_id", None)
                return result
        if "$or" in query:
            for clause in query["$or"]:
                for document in self.documents.values():
                    if all(document.get(key) == value for key, value in clause.items()):
                        result = dict(document)
                        if projection and projection.get("_id") == 0:
                            result.pop("_id", None)
                        return result
        return None


class FakeDatabase:
    def __init__(self) -> None:
        self.configurations = FakeConfigurations()


def _payload() -> Dict[str, Any]:
    return {
        "configuration": {
            "purchasable": {"variant_id": "test-variant"},
            "interaction": {},
        },
        "city": "Delhi",
        "price_snapshot": 1_000_000,
    }


def _client(db: FakeDatabase, phone: Optional[str]) -> TestClient:
    async def fake_auth() -> Optional[str]:
        return phone

    app = FastAPI()
    app.include_router(make_configurator_router(db, fake_auth))
    return TestClient(app)


def test_authenticated_save_persists_owner() -> None:
    db = FakeDatabase()
    client = _client(db, "+919876543210")

    response = client.post("/api/v1/configurator/configurations", json=_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["owner_phone"] == "+919876543210"
    assert body["share_token"]
    assert body["config_id"]


def test_anonymous_save_is_rejected() -> None:
    db = FakeDatabase()
    client = _client(db, None)

    response = client.post("/api/v1/configurator/configurations", json=_payload())

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"
    assert db.configurations.documents == {}


def test_owner_can_read_private_configuration() -> None:
    db = FakeDatabase()
    owner = _client(db, "+919876543210")
    saved = owner.post("/api/v1/configurator/configurations", json=_payload()).json()

    response = owner.get(f"/api/v1/configurator/configurations/{saved['config_id']}")

    assert response.status_code == 200
    assert response.json()["owner_phone"] == "+919876543210"


def test_unauthenticated_private_read_is_rejected() -> None:
    db = FakeDatabase()
    owner = _client(db, "+919876543210")
    saved = owner.post("/api/v1/configurator/configurations", json=_payload()).json()
    anonymous = _client(db, None)

    response = anonymous.get(f"/api/v1/configurator/configurations/{saved['config_id']}")

    assert response.status_code == 401


def test_non_owner_private_read_is_rejected() -> None:
    db = FakeDatabase()
    owner = _client(db, "+919876543210")
    saved = owner.post("/api/v1/configurator/configurations", json=_payload()).json()
    other_user = _client(db, "+919999999999")

    response = other_user.get(f"/api/v1/configurator/configurations/{saved['config_id']}")

    assert response.status_code == 403


def test_share_token_is_public_but_sanitized() -> None:
    db = FakeDatabase()
    owner = _client(db, "+919876543210")
    saved = owner.post("/api/v1/configurator/configurations", json=_payload()).json()
    anonymous = _client(db, None)

    response = anonymous.get(f"/api/v1/configurator/configurations/{saved['share_token']}")

    assert response.status_code == 200
    body = response.json()
    assert body["config_id"] == saved["config_id"]
    assert "owner_phone" not in body
    assert "share_token" not in body


def test_unknown_configuration_returns_not_found() -> None:
    db = FakeDatabase()
    client = _client(db, None)

    response = client.get("/api/v1/configurator/configurations/does-not-exist")

    assert response.status_code == 404
