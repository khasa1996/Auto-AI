"""Backend tests for Auto-AI India API - iteration 5.
Covers: Stripe checkout (session create/status), dealer apply/list, /me/subscription.
"""
import uuid
import pytest
import requests

from conftest import API, BASE_URL

ORIGIN = BASE_URL


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Stripe checkout ----
def test_checkout_session_requires_auth(client):
    r = client.post(f"{API}/checkout/session", json={"plan_id": "premium", "origin_url": ORIGIN}, timeout=15)
    assert r.status_code == 401


def test_checkout_session_rejects_foreign_origin(user_client):
    r = user_client.post(f"{API}/checkout/session", json={
        "plan_id": "premium", "origin_url": "https://attacker.example.com",
    }, timeout=15)
    assert r.status_code == 400


def test_checkout_session_premium_creates(user_client):
    payload = {"plan_id": "premium", "origin_url": ORIGIN}
    r = user_client.post(f"{API}/checkout/session", json=payload, timeout=30)
    if r.status_code == 503:
        pytest.skip("Stripe is not configured in this environment")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "url" in data and data["url"].startswith("https://")
    assert "session_id" in data and len(data["session_id"]) > 5
    # persist session_id for downstream
    pytest.premium_session_id = data["session_id"]


def test_checkout_session_invalid_plan_400(user_client):
    r = user_client.post(f"{API}/checkout/session", json={
        "plan_id": "ultra-mega",
        "origin_url": ORIGIN,
    }, timeout=15)
    assert r.status_code == 400


def test_checkout_session_dealer_plan(user_client):
    r = user_client.post(f"{API}/checkout/session", json={
        "plan_id": "dealer",
        "origin_url": ORIGIN,
    }, timeout=30)
    if r.status_code == 503:
        pytest.skip("Stripe is not configured in this environment")
    assert r.status_code == 200
    assert r.json()["url"].startswith("https://")


def test_checkout_status_returns_initiated_or_unpaid(user_client):
    sid = getattr(pytest, "premium_session_id", None)
    if not sid:
        pytest.skip("no checkout session was created")
    r = user_client.get(f"{API}/checkout/status/{sid}", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "payment_status" in data
    # Test sessions start unpaid/open/expired — any non-paid value acceptable
    assert data["payment_status"] in ("unpaid", "initiated", "open", "expired", "no_payment_required")


def test_checkout_status_not_found(user_client):
    r = user_client.get(f"{API}/checkout/status/cs_fake_{uuid.uuid4().hex}", timeout=15)
    if r.status_code == 503:
        pytest.skip("Stripe is not configured in this environment")
    assert r.status_code == 404


# ---- Dealer onboarding ----
def test_dealer_apply_creates_pending(client):
    payload = {
        "business_name": "TEST_Speedline Motors",
        "owner_name": "Ravi Kumar",
        "phone": "9876500001",
        "email": "ravi@speedline.test",
        "city": "Mumbai",
        "brands": ["Hyundai", "Tata"],
        "bid_per_lead": 750,
    }
    r = client.post(f"{API}/dealers/apply", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["business_name"] == "TEST_Speedline Motors"
    assert d["status"] == "pending_verification"
    assert d["verified"] is False
    assert d["bid_per_lead"] == 750
    assert d["city"] == "Mumbai"
    assert "Hyundai" in d["brands"]
    uuid.UUID(d["id"])  # valid uuid
    assert "_id" not in d


def test_dealers_list_requires_admin(client):
    """The dealer directory carries owner phone numbers and bid amounts."""
    assert client.get(f"{API}/dealers", timeout=15).status_code == 401


def test_dealers_list_sorted_by_bid_desc(client, admin_client):
    # Seed two with different bids
    client.post(f"{API}/dealers/apply", json={
        "business_name": "TEST_LowBid Autos", "owner_name": "A", "phone": "9000000101",
        "city": "Delhi", "brands": ["Maruti"], "bid_per_lead": 150,
    }, timeout=15)
    client.post(f"{API}/dealers/apply", json={
        "business_name": "TEST_HighBid Autos", "owner_name": "B", "phone": "9000000102",
        "city": "Delhi", "brands": ["BMW"], "bid_per_lead": 2500,
    }, timeout=15)
    r = admin_client.get(f"{API}/dealers", timeout=15)
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) >= 2
    bids = [row["bid_per_lead"] for row in rows]
    assert bids == sorted(bids, reverse=True), f"Not sorted desc: {bids}"


def test_dealers_city_filter(client, admin_client):
    client.post(f"{API}/dealers/apply", json={
        "business_name": "TEST_MumbaiOnly", "owner_name": "M", "phone": "9000000103",
        "city": "Mumbai", "brands": ["Kia"], "bid_per_lead": 600,
    }, timeout=15)
    r = admin_client.get(f"{API}/dealers?city=Mumbai", timeout=15)
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) >= 1
    assert all(row["city"] == "Mumbai" for row in rows)


# ---- Subscription ----
def test_me_subscription_requires_auth(client):
    assert client.get(f"{API}/me/subscription?phone=0000000000", timeout=15).status_code == 401


def test_me_subscription_status_for_session(user_client):
    r = user_client.get(f"{API}/me/subscription?phone=0000000000", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") in ("none", "active")


# ---- PWA public files ----
def test_manifest_json_served(client):
    r = client.get(f"{BASE_URL}/manifest.json", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["name"].startswith("Auto-AI India")
    assert j["start_url"] == "/"
    assert any(i["sizes"] == "512x512" for i in j["icons"])


def test_service_worker_served(client):
    r = client.get(f"{BASE_URL}/service-worker.js", timeout=15)
    assert r.status_code == 200
    assert "serviceWorker" in r.text or "self.addEventListener" in r.text
