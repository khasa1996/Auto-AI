"""Shared fixtures: base URL discovery and authenticated sessions.

Endpoints that expose customer PII or the commission pipeline require a session
token (see backend/security.py), so tests must sign in the same way the app does.
"""
import os
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

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


USER_PHONE = "9876543210"


def login(session: requests.Session, phone: str) -> str:
    """Run the OTP flow and return a bearer token for the test phone."""
    if phone in _TOKENS:
        return _TOKENS[phone]
    r = session.post(
        f"{API}/auth/send-otp",
        json={"phone": phone},
        timeout=15,
    )
    if r.status_code == 429:
        pytest.skip(
            "OTP sends are rate limited; rerun in a few minutes"
        )
    r.raise_for_status()
    otp = r.json().get("demo_otp")
    if not otp:
        pytest.skip(
            "OTP delivery is not in demo mode; "
            "cannot obtain a session token in tests"
        )
    v = session.post(
        f"{API}/auth/verify-otp",
        json={"phone": phone, "otp": otp},
        timeout=15,
    )
    v.raise_for_status()
    _TOKENS[phone] = v.json()["token"]
    return _TOKENS[phone]


@pytest.fixture(scope="session")
def user_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    s.headers.update(
        {
            "Authorization": (
                f"Bearer {login(s, USER_PHONE)}"
            )
        }
    )
    return s


@pytest.fixture(scope="session")
def admin_client():
    pin = os.environ.get("ADMIN_PIN", "").strip()
    if not pin:
        pytest.skip(
            "ADMIN_PIN is not set; admin-gated endpoints "
            "cannot be tested"
        )
    s = requests.Session()
    s.headers.update(
        {
            "Content-Type": "application/json",
        }
    )
    response = s.post(
        f"{API}/admin/verify",
        json={"pin": pin},
        timeout=15,
    )
    if response.status_code in (429, 503):
        pytest.skip(
            "Admin authentication is rate limited or unavailable"
        )
    response.raise_for_status()
    s.headers.update(
        {
            "Authorization": (
                f"Bearer {response.json()['token']}"
            )
        }
    )
    return s


def pytest_configure(config):
    if not BASE_URL:
        config.addinivalue_line(
            "markers",
            "integration: requires a running Auto-AI backend",
        )


def pytest_collection_modifyitems(config, items):
    if BASE_URL:
        return
    skip = pytest.mark.skip(
        reason="Set REACT_APP_BACKEND_URL to run integration tests"
    )
    integration_files = {
        "backend_test.py",
        "test_security.py",
        "test_iteration3.py",
        "test_iteration4.py",
    }
    for item in items:
        if item.path.name in integration_files:
            item.add_marker(skip)
