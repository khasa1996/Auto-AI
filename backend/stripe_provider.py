"""Small Stripe REST adapter used by Auto-AI.

No hosted integration SDK is required. The adapter talks directly to Stripe's
server-side API and verifies webhook signatures locally.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from typing import Mapping, Optional

import httpx


class StripeProviderError(RuntimeError):
    """Raised when Stripe cannot complete an operation."""


@dataclass(frozen=True)
class CheckoutSessionRequest:
    amount: float
    currency: str
    success_url: str
    cancel_url: str
    metadata: dict[str, str]


@dataclass(frozen=True)
class CheckoutSession:
    session_id: str
    url: str


@dataclass(frozen=True)
class CheckoutStatus:
    payment_status: str
    status: str
    amount_total: Optional[float]
    currency: Optional[str]
    metadata: dict


@dataclass(frozen=True)
class StripeWebhookEvent:
    event_type: str
    session_id: Optional[str]
    payment_status: Optional[str]
    metadata: dict


class StripeProvider:
    BASE_URL = "https://api.stripe.com/v1"

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = (api_key or os.environ.get("STRIPE_API_KEY", "")).strip()
        if not self.api_key:
            raise StripeProviderError("STRIPE_API_KEY is not configured")

    @property
    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    async def create_checkout_session(
        self,
        *,
        amount: float,
        currency: str,
        success_url: str,
        cancel_url: str,
        metadata: Mapping[str, str],
    ) -> CheckoutSession:
        data: list[tuple[str, str]] = [
            ("mode", "payment"),
            ("success_url", success_url),
            ("cancel_url", cancel_url),
            ("line_items[0][quantity]", "1"),
            ("line_items[0][price_data][currency]", currency.lower()),
            ("line_items[0][price_data][product_data][name]", "Auto-AI Premium Access"),
            ("line_items[0][price_data][unit_amount]", str(int(round(amount * 100)))),
        ]
        for key, value in metadata.items():
            data.append((f"metadata[{key}]", str(value)))
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{self.BASE_URL}/checkout/sessions", headers=self.headers, data=data)
        if response.status_code >= 400:
            raise StripeProviderError(f"Stripe checkout creation failed with HTTP {response.status_code}")
        body = response.json()
        if not body.get("id") or not body.get("url"):
            raise StripeProviderError("Stripe returned an incomplete checkout session")
        return CheckoutSession(session_id=body["id"], url=body["url"])

    async def get_checkout_status(self, session_id: str) -> CheckoutStatus:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.BASE_URL}/checkout/sessions/{session_id}", headers=self.headers)
        if response.status_code >= 400:
            raise StripeProviderError(f"Stripe checkout lookup failed with HTTP {response.status_code}")
        body = response.json()
        return CheckoutStatus(
            payment_status=body.get("payment_status", "unpaid"),
            status=body.get("status", "open"),
            amount_total=(body.get("amount_total") or 0) / 100 if body.get("amount_total") is not None else None,
            currency=body.get("currency"),
            metadata=body.get("metadata") or {},
        )


class StripeCheckout:
    """Compatibility façade matching the old checkout adapter surface."""

    def __init__(self, api_key: Optional[str] = None, webhook_url: Optional[str] = None):
        self.provider = StripeProvider(api_key)
        self.webhook_url = webhook_url

    async def create_checkout_session(self, req: CheckoutSessionRequest) -> CheckoutSession:
        return await self.provider.create_checkout_session(
            amount=req.amount,
            currency=req.currency,
            success_url=req.success_url,
            cancel_url=req.cancel_url,
            metadata=req.metadata,
        )

    async def get_checkout_status(self, session_id: str) -> CheckoutStatus:
        return await self.provider.get_checkout_status(session_id)

    async def handle_webhook(self, body: bytes, signature: str) -> StripeWebhookEvent:
        if not verify_webhook_signature(body, signature):
            raise StripeProviderError("Invalid Stripe webhook signature")
        try:
            event = json.loads(body.decode("utf-8"))
            obj = event.get("data", {}).get("object", {})
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise StripeProviderError("Invalid Stripe webhook payload") from exc
        return StripeWebhookEvent(
            event_type=event.get("type", ""),
            session_id=obj.get("id"),
            payment_status=obj.get("payment_status"),
            metadata=obj.get("metadata") or {},
        )


def verify_webhook_signature(payload: bytes, signature_header: str, secret: Optional[str] = None, tolerance_seconds: int = 300) -> bool:
    """Verify Stripe's `t=...,v1=...` signature format."""
    webhook_secret = (secret or os.environ.get("STRIPE_WEBHOOK_SECRET", "")).strip()
    if not webhook_secret or not signature_header:
        return False
    timestamp: Optional[int] = None
    signatures: list[str] = []
    for item in signature_header.split(","):
        key, _, value = item.partition("=")
        if key == "t":
            try:
                timestamp = int(value)
            except ValueError:
                return False
        elif key == "v1" and value:
            signatures.append(value)
    if timestamp is None or not signatures:
        return False
    if abs(int(time.time()) - timestamp) > tolerance_seconds:
        return False
    signed_payload = f"{timestamp}.".encode() + payload
    expected = hmac.new(webhook_secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, candidate) for candidate in signatures)
