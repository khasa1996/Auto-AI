"""Razorpay one-time payment adapter for Auto-AI India.

Secrets are read only from environment variables. This module performs
server-side order creation, payment/order lookups, and checkout signature
verification. It intentionally has no dependency on Stripe or Emergent.
"""

from __future__ import annotations

import hashlib
import hmac
import os
from typing import Any, Dict

import httpx

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
RAZORPAY_API_BASE = os.environ.get(
    "RAZORPAY_API_BASE", "https://api.razorpay.com/v1"
).rstrip("/")


def is_configured() -> bool:
    return bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)


def _auth() -> tuple[str, str]:
    if not is_configured():
        raise RuntimeError("Razorpay is not configured")
    return RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET


async def create_order(
    *, amount_paise: int, currency: str, receipt: str, notes: Dict[str, str]
) -> Dict[str, Any]:
    if amount_paise <= 0:
        raise ValueError("amount_paise must be positive")
    payload = {
        "amount": amount_paise,
        "currency": currency.upper(),
        "receipt": receipt[:40],
        "notes": notes,
        "payment_capture": 1,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{RAZORPAY_API_BASE}/orders", auth=_auth(), json=payload
        )
        response.raise_for_status()
        return response.json()


def verify_payment_signature(*, order_id: str, payment_id: str, signature: str) -> bool:
    if not RAZORPAY_KEY_SECRET or not order_id or not payment_id or not signature:
        return False
    message = f"{order_id}|{payment_id}".encode("utf-8")
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"), message, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def fetch_payment(payment_id: str) -> Dict[str, Any]:
    if not payment_id:
        raise ValueError("payment_id is required")
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{RAZORPAY_API_BASE}/payments/{payment_id}", auth=_auth()
        )
        response.raise_for_status()
        return response.json()


async def fetch_order(order_id: str) -> Dict[str, Any]:
    if not order_id:
        raise ValueError("order_id is required")
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{RAZORPAY_API_BASE}/orders/{order_id}", auth=_auth()
        )
        response.raise_for_status()
        return response.json()
