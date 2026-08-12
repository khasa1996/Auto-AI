"""Backend tests for iteration 3: Partners (commission pipeline) + AI CRM chat."""
import uuid
from api_client import API


# ---- Partners: list + filter ----
def test_partners_list_returns_9(client):
    r = client.get(f"{API}/partners", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 9, f"Expected 9 partners, got {len(data)}"
    # All have commission_pct
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
def test_booking_with_loan_and_insurance_creates_leads(client):
    # Get current leads count first
    r0 = client.get(f"{API}/partners/leads", timeout=15)
    assert r0.status_code == 200
    before = len(r0.json().get("leads", []))

    payload = {
        "car_id": "tata-nexon",
        "name": "TEST_Lead User",
        "phone": "9876543210",
        "city": "Mumbai",
        "needs_loan": True,
        "needs_insurance": True,
        "test_drive": True,
    }
    r = client.post(f"{API}/bookings", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    booking = r.json()
    booking_id = booking["id"]

    r2 = client.get(f"{API}/partners/leads", timeout=15)
    assert r2.status_code == 200
    out = r2.json()
    assert "leads" in out and "total_commission" in out and "by_partner" in out
    leads = out["leads"]
    assert len(leads) >= before + 2, "Expected 2 new leads (loan+insurance)"

    # Filter down to leads for this booking
    our = [l for l in leads if l.get("booking_id") == booking_id]
    assert len(our) == 2
    types = {l["partner_type"] for l in our}
    assert types == {"loan", "insurance"}
    # First partners as per assignment
    loan_lead = next(l for l in our if l["partner_type"] == "loan")
    ins_lead = next(l for l in our if l["partner_type"] == "insurance")
    assert loan_lead["partner_name"] == "HDFC Bank"
    assert ins_lead["partner_name"] == "Bajaj Allianz"
    assert loan_lead["expected_commission"] > 0
    assert ins_lead["expected_commission"] > 0

    # by_partner aggregation contains HDFC Bank
    assert "HDFC Bank" in out["by_partner"]
    assert out["by_partner"]["HDFC Bank"]["count"] >= 1


def test_booking_without_finance_no_leads(client):
    r0 = client.get(f"{API}/partners/leads", timeout=15)
    before_ids = {l["booking_id"] for l in r0.json().get("leads", [])}

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

    r2 = client.get(f"{API}/partners/leads", timeout=15)
    after = r2.json().get("leads", [])
    assert bid not in {l["booking_id"] for l in after}


# ---- AI CRM chat: booking context ----
def test_ai_chat_track_booking_by_phone(client):
    # Seed a booking with specific phone
    phone = "9876543210"
    bp = {
        "car_id": "tata-nexon",
        "name": "TEST_CRM User",
        "phone": phone,
        "city": "Pune",
        "needs_loan": True,
        "test_drive": True,
    }
    rb = client.post(f"{API}/bookings", json=bp, timeout=20)
    assert rb.status_code == 200
    booking = rb.json()
    id_prefix = booking["id"][:8].upper()

    session = f"test-crm-{uuid.uuid4()}"
    r = client.post(f"{API}/ai/chat", json={
        "session_id": session,
        "message": f"track my booking {phone}",
    }, timeout=120)
    assert r.status_code == 200, r.text
    reply = r.json().get("reply", "")
    assert reply
    # Reply should reference booking specifics: dealer name fragment OR id prefix OR car name
    # Dealer for Pune is 'Koregaon Park'
    hit = (
        id_prefix in reply.upper()
        or "koregaon" in reply.lower()
        or "nexon" in reply.lower()
        or "pune" in reply.lower()
    )
    assert hit, f"AI reply did not include booking context. Reply: {reply[:400]}"
