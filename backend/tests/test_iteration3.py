"""Backend integration tests for partner leads and authenticated CRM chat."""
import uuid
import pytest
import requests

from conftest import API, USER_PHONE


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Partners: list + filter ----
def test_partners_list_returns_9(client):
    r = client.get(f"{API}/partners", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 9, f"Expected 9 partners, got {len(data)}"
    assert all("commission_pct" in p for p in data)
    names = {p["name"] for p in data}
    expected_loan = {"HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Bajaj Finserv"}
    expected_ins = {"Bajaj Allianz", "ICICI Lombard", "HDFC ERGO", "TATA AIG"}
    assert expected_loan.issubset(names), f"Missing loan partners: {expected_loan - names}"
    assert expected_ins.issubset(names), f"Missing insurance: {expected_ins - names}"


def test_partners_filter_loan(client):
    r = client.get(f"{API}/partners?type=loan", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 5
    assert all(p["type"] == "loan" for p in data)


def test_partners_filter_insurance(client):
    r = client.get(f"{API}/partners?type=insurance", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 4
    assert all(p["type"] == "insurance" for p in data)


# ---- Bookings auto-generate partner leads ----
def test_partner_leads_requires_admin(client):
    assert client.get(f"{API}/partners/leads", timeout=15).status_code == 401


def test_booking_with_loan_and_insurance_creates_leads(client, admin_client):
    r0 = admin_client.get(f"{API}/partners/leads", timeout=15)
    assert r0.status_code == 200
    before = len(r0.json().get("leads", []))

    payload = {
        "car_id": "tata-nexon",
        "name": "TEST_Lead User",
        "phone": USER_PHONE,
        "city": "Mumbai",
        "needs_loan": True,
        "needs_insurance": True,
        "test_drive": True,
    }
    r = client.post(f"{API}/bookings", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    booking_id = r.json()["id"]

    r2 = admin_client.get(f"{API}/partners/leads", timeout=15)
    assert r2.status_code == 200
    out = r2.json()
    assert "leads" in out and "total_commission" in out and "by_partner" in out
    leads = out["leads"]
    assert len(leads) >= before + 2
    our = [l for l in leads if l.get("booking_id") == booking_id]
    assert len(our) == 2
    types = {l["partner_type"] for l in our}
    assert types == {"loan", "insurance"}
    loan_lead = next(l for l in our if l["partner_type"] == "loan")
    ins_lead = next(l for l in our if l["partner_type"] == "insurance")
    assert loan_lead["partner_name"] == "HDFC Bank"
    assert ins_lead["partner_name"] == "Bajaj Allianz"
    assert loan_lead["expected_commission"] > 0
    assert ins_lead["expected_commission"] > 0
    assert "HDFC Bank" in out["by_partner"]
    assert out["by_partner"]["HDFC Bank"]["count"] >= 1


def test_booking_without_finance_no_leads(client, admin_client):
    payload = {
        "car_id": "tata-nexon",
        "name": "TEST_NoLead",
        "phone": "9000000088",
        "city": "Delhi",
        "needs_loan": False,
        "needs_insurance": False,
    }
    r = client.post(f"{API}/bookings", json=payload, timeout=20)
    assert r.status_code == 200
    bid = r.json()["id"]
    after = (awaitable := admin_client.get(f"{API}/partners/leads", timeout=15))
    assert after.status_code == 200
    assert bid not in {l["booking_id"] for l in after.json().get("leads", [])}


# ---- Authenticated AI CRM chat ----
def test_ai_chat_track_booking_requires_authentication(client):
    """Anonymous callers cannot use CRM chat and therefore cannot receive booking data."""
    r = client.post(f"{API}/ai/chat", json={
        "session_id": f"test-crm-anon-{uuid.uuid4()}",
        "message": f"track my booking {USER_PHONE}",
    }, timeout=30)
    assert r.status_code == 401


def test_ai_chat_track_booking_by_phone(user_client):
    phone = USER_PHONE
    bp = {
        "car_id": "tata-nexon",
        "name": "TEST_CRM User",
        "phone": phone,
        "city": "Pune",
        "needs_loan": True,
        "test_drive": True,
    }
    rb = user_client.post(f"{API}/bookings", json=bp, timeout=20)
    assert rb.status_code == 200
    booking = rb.json()
    id_prefix = booking["id"][:8].upper()

    session = f"test-crm-{uuid.uuid4()}"
    r = user_client.post(f"{API}/ai/chat", json={
        "session_id": session,
        "message": f"track my booking {phone}",
    }, timeout=120)
    assert r.status_code == 200, r.text
    reply = r.json().get("reply", "")
    assert reply
    hit = (
        id_prefix in reply.upper()
        or "koregaon" in reply.lower()
        or "nexon" in reply.lower()
        or "pune" in reply.lower()
    )
    assert hit, f"AI reply did not include booking context. Reply: {reply[:400]}"
