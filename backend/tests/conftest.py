"""Shared fixtures: base URL discovery and authenticated sessions.

Endpoints that expose customer PII or the commission pipeline require a session
token (see backend/security.py), so tests must sign in the same way the app does.
"""
import os
from pathlib import Path

import pytest
import requests

FRONTEND_ENV_CANDIDATES = (Path("/app/frontend/.env"), Path(__file__).resolve().parents[2] / "frontend" / ".env")


def _discover_base_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip().rstrip("/")
    if url:
        return url
    for candidate in FRONTEND_ENV_CANDIDATES:
        if candidate.exists():
            for line in candidate.read_text().splitlines():
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    return ""


BASE_URL = _discover_base_url()
API = f"{BASE_URL}/api"


_TOKENS: dict[str, str] = {}


def login(session: requests.Session, phone: str) -> str:
    """Run the OTP flow and return a bearer token for `phone`.

    Tokens are cached per phone because OTP sends are rate limited per number.
    """
    if phone in _TOKENS:
        return _TOKENS[phone]
    r = session.post(f"{API}/auth/send-otp", json={"phone": phone}, timeout=15)
    if r.status_code == 429:
        pytest.skip("OTP sends are rate limited; rerun in a few minutes")
    r.raise_for_status()
    otp = r.json().get("demo_otp")
    if not otp:
        pytest.skip("OTP delivery is not in demo mode; cannot obtain a session token in tests")
    v = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": otp}, timeout=15)
    v.raise_for_status()
    _TOKENS[phone] = v.json()["token"]
    return _TOKENS[phone]


@pytest.fixture(scope="session")
def user_client():
    """Session authenticated as a fixed test phone number."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    s.headers.update({"Authorization": f"Bearer {login(s, USER_PHONE)}"})
    return s


USER_PHONE = "9876543210"


@pytest.fixture(scope="session")
def admin_client():
    """Session authenticated against the admin surface via ADMIN_PIN."""
    pin = os.environ.get("ADMIN_PIN", "").strip()
    if not pin:
        pytest.skip("ADMIN_PIN is not set; admin-gated endpoints cannot be tested")
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "X-Admin-Pin": pin})
    return s
