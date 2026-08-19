"""Razorpay one-time payment helpers for Auto-AI India.

This module deliberately uses Razorpay's HTTPS APIs plus server-side HMAC
verification instead of recurring subscriptions. Secrets are read only from
environment variables and are never returned to the browser.
"""

import hashlib
import hmac
import os
from typing import Any, Dict

import httpx


RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
RAZORPAY_API_BASE = os.environ.get("RAZORPAY_API_BASE", "https://api.razorpay.com/v1").rstrip("/")


def is_configured() -> bool:
    return bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)


def _auth() -> tuple[str, str]:
    if not is_configured():
        raise RuntimeError("Razorpay is not configured")
    return RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET


async def create_order(*, amount_paise: int, currency: str, receipt: str, notes: Dict[str, str]) -> Dict[str, Any]:
    """Create a Razorpay order server-side. Amount is always in the smallest currency unit."""
    if amount_paise <= 0:
        raise ValueError("amount_paise must be positive")
    payload = {
        "amount": amount_paise,
        "currency": currency.upper(),
        "receipt": receipt[:40],
        "notes": notes,
        "capture": "automatic",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(f"{RAZORPAY_API_BASE}/orders", auth=_auth(), json=payload)
        response.raise_for_status()
        return response.json()


def verify_payment_signature(*, order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay checkout authenticity using HMAC-SHA256 and constant-time comparison."""
    if not RAZORPAY_KEY_SECRET:
        return False
    message = f"{order_id}|{payment_id}".encode("utf-8")
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"), message, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def fetch_payment(payment_id: str) -> Dict[str, Any]:
    """Fetch payment status from Razorpay for server-side confirmation."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(f"{RAZORPAY_API_BASE}/payments/{payment_id}", auth=_auth())
        response.raise_for_status()
        return response.json()


async def fetch_order(order_id: str) -> Dict[str, Any]:
    """Fetch an order from Razorpay for reconciliation/audit purposes."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(f"{RAZORPAY_API_BASE}/orders/{order_id}", auth=_auth())
        response.raise_for_status()
        return response.json()
