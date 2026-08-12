"""Unit tests for the Stripe-backed checkout, webhook and subscription endpoints.

The Stripe SDK is stubbed in conftest; these tests cover the plan validation,
transaction bookkeeping and subscription activation logic around it.
"""
import types

import pytest

from conftest import FakeStripeCheckout


def _status(payment_status="paid", status="complete", amount_total=19900, currency="inr"):
    return types.SimpleNamespace(
        payment_status=payment_status,
        status=status,
        amount_total=amount_total,
        currency=currency,
    )


def _webhook_event(session_id="cs_test_123", payment_status="paid", metadata=None):
    return types.SimpleNamespace(
        session_id=session_id,
        payment_status=payment_status,
        event_type="checkout.session.completed",
        metadata=metadata if metadata is not None else {},
    )


def test_checkout_requires_stripe_configuration(client, monkeypatch, server_module):
    monkeypatch.setattr(server_module, "STRIPE_API_KEY", None)
    r = client.post(
        "/api/checkout/session", json={"plan_id": "premium", "origin_url": "https://app.test"}
    )
    assert r.status_code == 503
    assert r.json()["detail"] == "Stripe not configured"


def test_checkout_rejects_unknown_plan(client, stripe_enabled):
    r = client.post(
        "/api/checkout/session", json={"plan_id": "platinum", "origin_url": "https://app.test"}
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid plan"


@pytest.mark.parametrize("plan_id", ["premium", "dealer"])
def test_checkout_creates_session_and_records_transaction(client, stripe_enabled, plan_id):
    import asyncio

    plan = stripe_enabled.PLANS[plan_id]
    body = client.post(
        "/api/checkout/session",
        json={"plan_id": plan_id, "origin_url": "https://app.test", "customer_phone": "9876543210"},
    ).json()
    assert body["url"].startswith("https://")
    assert body["session_id"]

    tx = asyncio.run(
        stripe_enabled.db.payment_transactions.find_one({"session_id": body["session_id"]}, {"_id": 0})
    )
    assert tx["plan_id"] == plan_id
    assert tx["amount"] == plan["amount"]
    assert tx["currency"] == plan["currency"]
    assert tx["phone"] == "9876543210"
    assert tx["payment_status"] == "initiated"


def test_checkout_status_requires_stripe_configuration(client, monkeypatch, server_module):
    monkeypatch.setattr(server_module, "STRIPE_API_KEY", None)
    assert client.get("/api/checkout/status/cs_x").status_code == 503


def test_checkout_status_unknown_session_is_404(client, stripe_enabled):
    r = client.get("/api/checkout/status/cs_unknown")
    assert r.status_code == 404
    assert r.json()["detail"] == "Session not found"


def _initiated_session(client, phone="9876543210", plan_id="premium"):
    return client.post(
        "/api/checkout/session",
        json={"plan_id": plan_id, "origin_url": "https://app.test", "customer_phone": phone},
    ).json()["session_id"]


def test_checkout_status_marks_paid_and_activates_subscription(client, stripe_enabled):
    session_id = _initiated_session(client)
    FakeStripeCheckout.status_to_return = _status()

    body = client.get(f"/api/checkout/status/{session_id}").json()
    assert body == {
        "payment_status": "paid",
        "status": "complete",
        "amount_total": 19900,
        "currency": "inr",
    }
    sub = client.get("/api/me/subscription", params={"phone": "9876543210"}).json()
    assert sub["plan_id"] == "premium" and sub["status"] == "active"


def test_checkout_status_is_served_from_db_once_paid(client, stripe_enabled):
    session_id = _initiated_session(client)
    FakeStripeCheckout.status_to_return = _status()
    client.get(f"/api/checkout/status/{session_id}")

    FakeStripeCheckout.status_error = AssertionError("Stripe should not be called again")
    assert client.get(f"/api/checkout/status/{session_id}").json() == {
        "payment_status": "paid",
        "status": "complete",
    }


def test_checkout_status_unpaid_stays_open_without_subscription(client, stripe_enabled):
    session_id = _initiated_session(client, phone="9000000009")
    FakeStripeCheckout.status_to_return = _status(payment_status="unpaid", status="open", amount_total=None)

    body = client.get(f"/api/checkout/status/{session_id}").json()
    assert body["payment_status"] == "unpaid" and body["status"] == "open"
    assert client.get("/api/me/subscription", params={"phone": "9000000009"}).json() == {
        "status": "none"
    }


def test_checkout_status_falls_back_to_db_when_stripe_errors(client, stripe_enabled):
    session_id = _initiated_session(client)
    FakeStripeCheckout.status_error = RuntimeError("stripe timeout")

    body = client.get(f"/api/checkout/status/{session_id}").json()
    assert body == {
        "payment_status": "initiated",
        "status": "open",
        "amount_total": None,
        "currency": "inr",
    }


def test_checkout_status_handles_null_status_defensively(client, stripe_enabled):
    session_id = _initiated_session(client)
    FakeStripeCheckout.status_to_return = None

    body = client.get(f"/api/checkout/status/{session_id}").json()
    assert body["payment_status"] == "initiated" and body["status"] == "open"


def test_checkout_status_without_phone_skips_subscription(client, stripe_enabled):
    import asyncio

    session_id = client.post(
        "/api/checkout/session", json={"plan_id": "dealer", "origin_url": "https://app.test"}
    ).json()["session_id"]
    FakeStripeCheckout.status_to_return = _status(amount_total=99900)

    assert client.get(f"/api/checkout/status/{session_id}").json()["payment_status"] == "paid"
    assert asyncio.run(stripe_enabled.db.subscriptions.find({}, {"_id": 0}).to_list(10)) == []


def test_webhook_noop_when_stripe_not_configured(client, monkeypatch, server_module):
    monkeypatch.setattr(server_module, "STRIPE_API_KEY", None)
    assert client.post("/api/webhook/stripe", content=b"{}").json() == {"ok": False}


def test_webhook_invalid_signature_is_400(client, stripe_enabled):
    FakeStripeCheckout.webhook_error = ValueError("bad signature")
    r = client.post("/api/webhook/stripe", content=b"{}", headers={"Stripe-Signature": "x"})
    assert r.status_code == 400
    assert r.json()["ok"] is False and "bad signature" in r.json()["err"]


def test_webhook_paid_event_activates_subscription(client, stripe_enabled):
    import asyncio

    session_id = _initiated_session(client, phone="9333333333")
    FakeStripeCheckout.webhook_event = _webhook_event(
        session_id=session_id, metadata={"phone": "9333333333", "plan_id": "premium"}
    )

    assert client.post("/api/webhook/stripe", content=b"{}").json() == {"ok": True}
    tx = asyncio.run(
        stripe_enabled.db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    )
    assert tx["payment_status"] == "paid"
    assert tx["webhook_event"] == "checkout.session.completed"
    sub = client.get("/api/me/subscription", params={"phone": "9333333333"}).json()
    assert sub["plan_id"] == "premium" and sub["status"] == "active"


def test_webhook_paid_event_without_metadata_skips_subscription(client, stripe_enabled):
    import asyncio

    session_id = _initiated_session(client, phone="9444444444")
    FakeStripeCheckout.webhook_event = _webhook_event(session_id=session_id, metadata=None)

    client.post("/api/webhook/stripe", content=b"{}")
    assert asyncio.run(stripe_enabled.db.subscriptions.find({}, {"_id": 0}).to_list(10)) == []


def test_webhook_unpaid_event_does_not_touch_transaction(client, stripe_enabled):
    import asyncio

    session_id = _initiated_session(client)
    FakeStripeCheckout.webhook_event = _webhook_event(session_id=session_id, payment_status="unpaid")

    client.post("/api/webhook/stripe", content=b"{}")
    tx = asyncio.run(
        stripe_enabled.db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    )
    assert tx["payment_status"] == "initiated"


def test_my_subscription_defaults_to_none(client):
    assert client.get("/api/me/subscription", params={"phone": "9555555555"}).json() == {
        "status": "none"
    }
