"""Security regression tests for the auth, authorization and proxy surfaces."""
import os
import uuid
from security import host_allowed

import pytest
import requests

from conftest import API, login

VICTIM_PHONE = "9876511111"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.mark.parametrize("path", [
    "/bookings",
    "/me/bookings",
    "/me/subscription",
    "/dealer/leads",
    "/partners/leads",
    "/dealers",
    "/admin/dealers",
])
def test_protected_endpoints_reject_anonymous(client, path):
    assert client.get(f"{API}{path}", timeout=15).status_code == 401


def test_booking_is_not_readable_by_another_user(client, user_client):
    victim = client.post(f"{API}/bookings", json={
        "car_id": "tata-nexon", "name": "TEST_Victim", "phone": VICTIM_PHONE, "city": "Delhi",
    }, timeout=20)
    assert victim.status_code == 200
    bid = victim.json()["id"]
    # Anonymous and cross-user reads are indistinguishable from a missing record.
    assert client.get(f"{API}/bookings/{bid}", timeout=15).status_code == 404
    assert user_client.get(f"{API}/bookings/{bid}", timeout=15).status_code == 404
    # The owner can read it.
    owner = requests.Session()
    owner.headers.update({"Authorization": f"Bearer {login(owner, VICTIM_PHONE)}"})
    assert owner.get(f"{API}/bookings/{bid}", timeout=15).status_code == 200


def test_session_token_is_revoked_on_logout(client):
    s = requests.Session()
    token = login(s, "9876522222")
    s.headers.update({"Authorization": f"Bearer {token}"})
    assert s.get(f"{API}/me/bookings", timeout=15).status_code == 200
    assert s.post(f"{API}/auth/logout", json={}, timeout=15).status_code == 200
    assert s.get(f"{API}/me/bookings", timeout=15).status_code == 401


def test_admin_rejects_the_old_default_pin(client):
    r = client.post(f"{API}/admin/verify", json={"pin": "108108"}, timeout=15)
    assert r.status_code in (401, 429, 503)


def test_admin_pin_is_not_accepted_as_query_param(client):
    pin = os.environ.get("ADMIN_PIN", "").strip()
    if not pin:
        pytest.skip("ADMIN_PIN is not set")
    assert client.get(f"{API}/admin/dealers", params={"pin": pin}, timeout=15).status_code == 401


def test_user_token_cannot_reach_admin_endpoints(user_client):
    assert user_client.get(f"{API}/admin/dealers", timeout=15).status_code == 401


def test_otp_send_is_rate_limited(client):
    phone = "9876533333"
    codes = [client.post(f"{API}/auth/send-otp", json={"phone": phone}, timeout=15).status_code
             for _ in range(12)]
    assert 429 in codes, f"expected throttling, got {codes}"


@pytest.mark.parametrize("payload", [
    {"car_id": "tata-nexon", "name": "X", "phone": "not-a-phone", "city": "Mumbai"},
    {"car_id": "tata-nexon", "name": "", "phone": "9876500001", "city": "Mumbai"},
    {"car_id": "tata-nexon", "name": "X" * 500, "phone": "9876500001", "city": "Mumbai"},
])
def test_booking_rejects_invalid_input(client, payload):
    assert client.post(f"{API}/bookings", json=payload, timeout=15).status_code == 422


@pytest.mark.parametrize("payload", [
    {"principal": -1, "annual_rate": 9, "tenure_months": 60},
    {"principal": 500000, "annual_rate": 9, "tenure_months": 0},
    {"principal": 500000, "annual_rate": 500, "tenure_months": 60},
])
def test_emi_rejects_out_of_range_input(client, payload):
    assert client.post(f"{API}/emi/calculate", json=payload, timeout=15).status_code == 422


def test_chat_does_not_leak_another_users_booking(client):
    booking = client.post(f"{API}/bookings", json={
        "car_id": "tata-nexon", "name": "TEST_ChatVictim", "phone": VICTIM_PHONE, "city": "Pune",
    }, timeout=20)
    assert booking.status_code == 200
    prefix = booking.json()["id"][:8].upper()
    r = client.post(f"{API}/ai/chat", json={
        "session_id": f"sec-{uuid.uuid4()}",
        "message": f"track my booking status for {VICTIM_PHONE}",
    }, timeout=120)
    assert r.status_code == 200, r.text
    assert prefix not in r.json().get("reply", "").upper()



@pytest.mark.parametrize("url, allowed_hosts, expected", [
    # Valid: Exact match
    ("https://example.com/api", ("example.com",), True),
    ("https://example.com", ("example.com", "other.com"), True),

    # Valid: Subdomain match
    ("https://sub.example.com/api", ("example.com",), True),
    ("https://deep.sub.example.com/api", ("example.com",), True),

    # Invalid: Not HTTPS
    ("http://example.com/api", ("example.com",), False),
    ("ftp://example.com/api", ("example.com",), False),

    # Invalid: Credentials in URL
    ("https://user@example.com/api", ("example.com",), False),
    ("https://user:pass@example.com/api", ("example.com",), False),

    # Invalid: Host mismatch
    ("https://notexample.com/api", ("example.com",), False),
    ("https://example.net/api", ("example.com",), False),

    # Invalid: Prefix/Suffix issues
    ("https://badexample.com/api", ("example.com",), False), # not a subdomain
    ("https://example.com.evil.com", ("example.com",), False),

    # Empty host / invalid url
    ("https:///api", ("example.com",), False),
    ("not_a_url", ("example.com",), False),
])
def test_host_allowed(url, allowed_hosts, expected):
    assert host_allowed(url, allowed_hosts) == expected
