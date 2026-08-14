"""Iteration 4: image-proxy, phone OTP auth, /me/bookings, /dealer/leads."""
import pytest
import requests

from conftest import API, USER_PHONE


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Image proxy ----------
WIKI_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Commons-logo.svg/100px-Commons-logo.svg.png"


def test_image_proxy_wikimedia_ok(client):
    r = client.get(f"{API}/image-proxy", params={"url": WIKI_URL}, timeout=30)
    assert r.status_code == 200, r.text
    assert r.headers.get("content-type", "").startswith("image/")
    assert len(r.content) > 100
    assert r.headers.get("cross-origin-resource-policy") == "cross-origin"


@pytest.mark.parametrize("url", [
    "https://evil.example.com/foo.jpg",
    "https://upload.wikimedia.org.evil.example.com/foo.jpg",  # suffix match must not pass
    "https://upload.wikimedia.org@evil.example.com/foo.jpg",  # userinfo must not pass
    "http://169.254.169.254/latest/meta-data/",  # plain http / link-local must not pass
])
def test_image_proxy_disallowed_host(client, url):
    r = client.get(f"{API}/image-proxy", params={"url": url}, timeout=15)
    assert r.status_code == 400


# ---------- OTP auth ----------
OTP_PHONE = "9876500099"


def test_send_otp(client):
    r = client.post(f"{API}/auth/send-otp", json={"phone": OTP_PHONE}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["sent"] is True


def test_verify_otp_success(client):
    r = client.post(f"{API}/auth/send-otp", json={"phone": OTP_PHONE}, timeout=15)
    otp = r.json().get("demo_otp")
    if not otp:
        pytest.skip("OTP is not returned outside demo mode")
    r = client.post(f"{API}/auth/verify-otp", json={"phone": OTP_PHONE, "otp": otp}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["phone"] == OTP_PHONE
    # The token must be opaque — not derived from the phone number.
    assert OTP_PHONE not in d["token"]
    assert len(d["token"]) > 20
    # Single use: replaying the same OTP fails.
    assert client.post(f"{API}/auth/verify-otp", json={"phone": OTP_PHONE, "otp": otp}, timeout=15).status_code == 401


def test_verify_otp_wrong(client):
    client.post(f"{API}/auth/send-otp", json={"phone": OTP_PHONE}, timeout=15)
    r = client.post(f"{API}/auth/verify-otp", json={"phone": OTP_PHONE, "otp": "000000"}, timeout=15)
    assert r.status_code == 401


# ---------- /me/bookings ----------
def test_me_bookings_requires_auth(client):
    assert client.get(f"{API}/me/bookings", timeout=15).status_code == 401
    assert client.get(f"{API}/me/bookings", params={"phone": USER_PHONE},
                      headers={"Authorization": "Bearer not-a-real-token"}, timeout=15).status_code == 401


def test_me_bookings_scoped_to_session(client, user_client):
    # Seed: booking for the signed-in phone, plus one for somebody else
    payload = {
        "car_id": "tata-nexon",
        "name": "TEST_MeBookings",
        "phone": USER_PHONE,
        "city": "Mumbai",
        "test_drive": True,
        "needs_loan": True,
    }
    cr = client.post(f"{API}/bookings", json=payload, timeout=20)
    assert cr.status_code == 200
    client.post(f"{API}/bookings", json={**payload, "name": "TEST_Other", "phone": "9876501234"}, timeout=20)

    # The phone query param is ignored: results always come from the session.
    r = user_client.get(f"{API}/me/bookings", params={"phone": "9876501234"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert data and all(b["phone"] == USER_PHONE for b in data)


# ---------- /dealer/leads ----------
def test_dealer_leads_requires_admin(client):
    assert client.get(f"{API}/dealer/leads", timeout=15).status_code == 401


def test_dealer_leads_aggregates(client, admin_client):
    # Make sure there is at least one booking
    client.post(f"{API}/bookings", json={
        "car_id": "tata-nexon", "name": "TEST_Dealer1", "phone": "9000000100",
        "city": "Mumbai", "test_drive": True, "needs_loan": True, "needs_insurance": True,
    }, timeout=20)

    r = admin_client.get(f"{API}/dealer/leads", timeout=20)
    assert r.status_code == 200
    d = r.json()
    for k in ("total_leads", "test_drive_requests", "loan_interest",
              "insurance_interest", "top_cars", "top_cities", "recent"):
        assert k in d, f"missing key: {k}"
    assert isinstance(d["total_leads"], int) and d["total_leads"] >= 1
    assert isinstance(d["top_cars"], list)
    assert isinstance(d["top_cities"], list)
    # top_cars items shape
    if d["top_cars"]:
        assert "car" in d["top_cars"][0] and "count" in d["top_cars"][0]
    if d["top_cities"]:
        assert "city" in d["top_cities"][0] and "count" in d["top_cities"][0]


def test_dealer_leads_city_filter(client, admin_client):
    # seed Mumbai & Delhi
    client.post(f"{API}/bookings", json={
        "car_id": "tata-nexon", "name": "TEST_DelhiX", "phone": "9000000201", "city": "Delhi",
    }, timeout=20)
    client.post(f"{API}/bookings", json={
        "car_id": "tata-nexon", "name": "TEST_MumX", "phone": "9000000202", "city": "Mumbai",
    }, timeout=20)

    r = admin_client.get(f"{API}/dealer/leads", params={"city": "Mumbai"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert all(b["city"] == "Mumbai" for b in d["recent"])
    # All top_cities entries should only be Mumbai
    for tc in d["top_cities"]:
        assert tc["city"] == "Mumbai"
