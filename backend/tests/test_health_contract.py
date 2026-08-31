from fastapi.testclient import TestClient
from backend.server import app

def test_health_contract():
    response = TestClient(app).get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'
    assert response.json()['service'] == 'auto-ai-api'
