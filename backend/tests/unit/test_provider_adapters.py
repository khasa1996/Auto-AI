import hashlib
import hmac
import time

import pytest

from llm_provider import LLMProviderError, resolve_model
from stripe_provider import verify_webhook_signature


def test_model_registry_resolves_all_supported_models():
    assert resolve_model("claude") == ("anthropic", "claude-sonnet-4-6")
    assert resolve_model("gpt-flagship") == ("openai", "gpt-5.4")
    assert resolve_model("gemini-flash") == ("gemini", "gemini-3.5-flash")


def test_unknown_model_is_rejected():
    with pytest.raises(LLMProviderError):
        resolve_model("does-not-exist")


def test_stripe_webhook_signature_is_verified():
    payload = b'{"type":"checkout.session.completed"}'
    secret = "whsec_test_secret"
    timestamp = int(time.time())
    signed = f"{timestamp}.".encode() + payload
    digest = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    header = f"t={timestamp},v1={digest}"
    assert verify_webhook_signature(payload, header, secret=secret)


def test_stripe_webhook_signature_rejects_wrong_payload():
    payload = b'{"type":"checkout.session.completed"}'
    secret = "whsec_test_secret"
    timestamp = int(time.time())
    signed = f"{timestamp}.".encode() + payload
    digest = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    header = f"t={timestamp},v1={digest}"
    assert not verify_webhook_signature(b'{"tampered":true}', header, secret=secret)


def test_stripe_webhook_signature_rejects_expired_timestamp():
    payload = b"{}"
    secret = "whsec_test_secret"
    timestamp = int(time.time()) - 1000
    signed = f"{timestamp}.".encode() + payload
    digest = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    header = f"t={timestamp},v1={digest}"
    assert not verify_webhook_signature(payload, header, secret=secret, tolerance_seconds=300)
