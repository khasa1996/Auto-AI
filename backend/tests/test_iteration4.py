"""Iteration 4: image-proxy, phone OTP auth, /me/bookings, /dealer/leads."""
from api_client import API


# ---------- Image proxy ----------
WIKI_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Commons-logo.svg/100px-Commons-logo.svg.png"


def test_image_proxy_wikimedia_ok(client):
    r = client.get(f"{API}/image-proxy", params={"url": WIKI_URL}, timeout=30)
    assert r.status_code == 200, r.text
    assert r.headers.get("content-type", "").startswith("image/")
    assert len(r.content) > 100
    assert r.headers.get("cross-origin-resource-policy") == "cross-origin"


def test_image_proxy_disallowed_host(client):
    r = client.get(f"{API}/image-proxy", params={"url": "https://evil.example.com/foo.jpg"}, timeout=15)
    assert r.status_code == 400


# ---------- OTP auth ----------
def test_send_otp(client):
    r = client.post(f"{API}/auth/send-otp", json={"phone": "9876543210"}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["sent"] is True
    assert d["demo_otp"] == "123456"


def test_verify_otp_success(client):
    r = client.post(f"{API}/auth/verify-otp", json={"phone": "9876543210", "otp": "123456"}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["phone"] == "9876543210"
    assert d["token"].startswith("autoai_9876543210_")
    assert len(d["token"]) > 20


def test_verify_otp_wrong(client):
    r = client.post(f"{API}/auth/verify-otp", json={"phone": "9876543210", "otp": "000000"}, timeout=15)
    assert r.status_code == 401


# ---------- /me/bookings ----------
def test_me_bookings_filters_by_phone(client):
    # Seed: create a booking for TEST_ phone
    phone = "9876501234"
    payload = {
        "car_id": "tata-nexon",
        "name": "TEST_MeBookings",
        "phone": phone,
        "city": "Mumbai",
        "test_drive": True,
        "needs_loan": True,
    }
    cr = client.post(f"{API}/bookings", json=payload, timeout=20)
    assert cr.status_code == 200

    r = client.get(f"{API}/me/bookings", params={"phone": phone}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert all(b["phone"] == phone for b in data)


def test_me_bookings_empty_for_unknown_phone(client):
    r = client.get(f"{API}/me/bookings", params={"phone": "0000000001"}, timeout=15)
    assert r.status_code == 200
    assert r.json() == []


# ---------- /dealer/leads ----------
def test_dealer_leads_aggregates(client):
    # Make sure there is at least one booking
    client.post(f"{API}/bookings", json={
        "car_id": "tata-nexon", "name": "TEST_Dealer1", "phone": "9000000100",
        "city": "Mumbai", "test_drive": True, "needs_loan": True, "needs_insurance": True,
    }, timeout=20)

    r = client.get(f"{API}/dealer/leads", timeout=20)
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


def test_dealer_leads_city_filter(client):
    # seed Mumbai & Delhi
    client.post(f"{API}/bookings", json={
        "car_id": "tata-nexon", "name": "TEST_DelhiX", "phone": "9000000201", "city": "Delhi",
    }, timeout=20)
    client.post(f"{API}/bookings", json={
        "car_id": "tata-nexon", "name": "TEST_MumX", "phone": "9000000202", "city": "Mumbai",
    }, timeout=20)

    r = client.get(f"{API}/dealer/leads", params={"city": "Mumbai"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert all(b["city"] == "Mumbai" for b in d["recent"])
    # All top_cities entries should only be Mumbai
    for tc in d["top_cities"]:
        assert tc["city"] == "Mumbai"
