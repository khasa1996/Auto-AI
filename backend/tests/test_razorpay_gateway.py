import hashlib
import hmac

from razorpay_gateway import verify_payment_signature


def test_verify_payment_signature_accepts_valid_signature(monkeypatch):
    secret = "test-secret"
    monkeypatch.setattr("razorpay_gateway.RAZORPAY_KEY_SECRET", secret)
    order_id = "order_test123"
    payment_id = "pay_test123"
    signature = hmac.new(
        secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256
    ).hexdigest()

    assert verify_payment_signature(
        order_id=order_id,
        payment_id=payment_id,
        signature=signature,
    ) is True


def test_verify_payment_signature_rejects_tampering(monkeypatch):
    monkeypatch.setattr("razorpay_gateway.RAZORPAY_KEY_SECRET", "test-secret")

    assert verify_payment_signature(
        order_id="order_test123",
        payment_id="pay_test123",
        signature="invalid-signature",
    ) is False


def test_verify_payment_signature_fails_closed_without_secret(monkeypatch):
    monkeypatch.setattr("razorpay_gateway.RAZORPAY_KEY_SECRET", "")

    assert verify_payment_signature(
        order_id="order_test123",
        payment_id="pay_test123",
        signature="anything",
    ) is False
