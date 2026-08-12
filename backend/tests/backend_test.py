"""Backend tests for Auto-AI India API - iteration 2 (bookings, languages, enhanced chat)."""
import re
import uuid
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

from conftest import API, USER_PHONE

load_dotenv(Path(__file__).resolve().parents[1] / '.env')


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Cars (expanded DB) ----
def test_list_cars_returns_100_plus(client):
    r = client.get(f"{API}/cars", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 100, f"Expected 100+ cars, got {len(data)}"
    # Make sure no _id leakage
    assert all("_id" not in c for c in data)


def test_cars_brand_coverage(client):
    r = client.get(f"{API}/cars", timeout=30)
    assert r.status_code == 200
    brands = {c["brand"] for c in r.json()}
    expected = {
        "Hyundai", "Tata", "Mahindra", "Kia", "Toyota", "Honda",
        "MG", "Skoda", "Volkswagen", "Renault", "Nissan", "Citroen", "Jeep",
        "BMW", "Mercedes-Benz", "Audi", "Volvo", "MINI",
    }
    missing = expected - brands
    assert not missing, f"Missing brands: {missing}. Got: {brands}"
    # Maruti may appear as "Maruti" or "Maruti Suzuki"
    assert any(b.lower().startswith("maruti") for b in brands)
    assert len(brands) >= 19


def test_get_car_tata_nexon(client):
    r = client.get(f"{API}/cars/tata-nexon", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["id"] == "tata-nexon"
    assert d["brand"].lower() == "tata"


# ---- Bookings ----
def test_create_booking_and_get(client, user_client):
    payload = {
        "car_id": "tata-nexon",
        "name": "Test User",
        "phone": USER_PHONE,
        "city": "Mumbai",
        "test_drive": True,
    }
    r = client.post(f"{API}/bookings", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    b = r.json()
    # Structural assertions
    assert b["car_id"] == "tata-nexon"
    assert b["name"] == "Test User"
    assert b["phone"] == USER_PHONE
    assert b["city"] == "Mumbai"
    assert b["test_drive"] is True
    assert b["dealer"] == "Auto-AI Partner — Andheri Hub"
    assert b["eta_call_minutes"] == 15
    assert b["status"] and "Confirmed" in b["status"]
    # UUID id
    uuid.UUID(b["id"])  # raises if invalid
    assert "_id" not in b
    # Persistence: GET by id — only the owner's session can read it back
    assert client.get(f"{API}/bookings/{b['id']}", timeout=15).status_code == 404
    g = user_client.get(f"{API}/bookings/{b['id']}", timeout=15)
    assert g.status_code == 200
    fetched = g.json()
    assert fetched["id"] == b["id"]
    assert fetched["car_name"] == b["car_name"]
    assert fetched["dealer"] == b["dealer"]


def test_create_booking_invalid_car_returns_404(client):
    payload = {
        "car_id": "no-such-car-xyz",
        "name": "X",
        "phone": "9000000000",
        "city": "Mumbai",
    }
    r = client.post(f"{API}/bookings", json=payload, timeout=15)
    assert r.status_code == 404


def test_get_booking_not_found(client):
    r = client.get(f"{API}/bookings/does-not-exist-id", timeout=15)
    assert r.status_code == 404


def test_booking_dealer_mapping_bengaluru(client):
    r = client.post(f"{API}/bookings", json={
        "car_id": "tata-nexon", "name": "B User", "phone": "9000000001", "city": "Bengaluru",
    }, timeout=20)
    assert r.status_code == 200
    assert r.json()["dealer"] == "Auto-AI Partner — Indiranagar"


# ---- AI Chat language support ----
def test_ai_chat_hindi_language(client):
    session_id = f"test-hi-{uuid.uuid4()}"
    r = client.post(f"{API}/ai/chat", json={
        "session_id": session_id,
        "message": "Suggest me a safe SUV under 15 lakh for family use.",
        "language": "Hindi",
    }, timeout=90)
    assert r.status_code == 200, r.text
    reply = r.json().get("reply", "")
    assert reply
    # Devanagari range check
    devanagari = re.findall(r"[\u0900-\u097F]", reply)
    assert len(devanagari) >= 10, f"Expected Devanagari reply, got: {reply[:200]}"


def test_ai_chat_english_default(client):
    session_id = f"test-en-{uuid.uuid4()}"
    r = client.post(f"{API}/ai/chat", json={
        "session_id": session_id,
        "message": "Hi, which small hatchback has best safety?",
    }, timeout=90)
    assert r.status_code == 200, r.text
    reply = r.json().get("reply", "")
    assert reply
    # English: should be predominantly ASCII letters
    ascii_letters = sum(1 for ch in reply if ch.isascii() and ch.isalpha())
    assert ascii_letters > 30
