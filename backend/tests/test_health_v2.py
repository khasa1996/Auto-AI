from fastapi.testclient import TestClient

from backend.server import app


def test_health_endpoint_returns_ok_status_and_payload() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "auto-ai-api"
