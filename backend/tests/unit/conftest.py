"""Shared fixtures for the offline unit test suite.

These tests exercise `server.py` in-process: MongoDB is replaced by
`mongomock_motor`, and the `emergentintegrations` SDK (published on a private
index, so unavailable in CI) is replaced by lightweight stubs that record the
calls made against them.
"""
import sys
import types
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND_DIR))


class FakeLlmChat:
    """Stub of emergentintegrations LlmChat. Replies come from `next_reply`."""

    next_reply = '{"winner": "Tata Nexon"}'
    instances: list = []

    def __init__(self, api_key=None, session_id=None, system_message=None):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self.model = None
        self.sent = []
        FakeLlmChat.instances.append(self)

    def with_model(self, provider, model):
        self.model = (provider, model)
        return self

    async def send_message(self, message):
        self.sent.append(message)
        return FakeLlmChat.next_reply


class FakeUserMessage:
    def __init__(self, text):
        self.text = text


class FakeCheckoutSessionRequest:
    def __init__(self, amount=None, currency=None, success_url=None, cancel_url=None, metadata=None):
        self.amount = amount
        self.currency = currency
        self.success_url = success_url
        self.cancel_url = cancel_url
        self.metadata = metadata or {}


class FakeSession:
    def __init__(self, session_id="cs_test_123", url="https://checkout.stripe.test/cs_test_123"):
        self.session_id = session_id
        self.url = url


class FakeStripeCheckout:
    """Stub of emergentintegrations StripeCheckout."""

    status_to_return = None
    status_error = None
    webhook_event = None
    webhook_error = None

    def __init__(self, api_key=None, webhook_url=None):
        self.api_key = api_key
        self.webhook_url = webhook_url

    async def create_checkout_session(self, request):
        self.request = request
        return FakeSession()

    async def get_checkout_status(self, session_id):
        if FakeStripeCheckout.status_error:
            raise FakeStripeCheckout.status_error
        return FakeStripeCheckout.status_to_return

    async def handle_webhook(self, body, signature):
        if FakeStripeCheckout.webhook_error:
            raise FakeStripeCheckout.webhook_error
        return FakeStripeCheckout.webhook_event


def _install_emergentintegrations_stub():
    root = types.ModuleType("emergentintegrations")
    llm = types.ModuleType("emergentintegrations.llm")
    chat = types.ModuleType("emergentintegrations.llm.chat")
    chat.LlmChat = FakeLlmChat
    chat.UserMessage = FakeUserMessage
    payments = types.ModuleType("emergentintegrations.payments")
    stripe = types.ModuleType("emergentintegrations.payments.stripe")
    checkout = types.ModuleType("emergentintegrations.payments.stripe.checkout")
    checkout.StripeCheckout = FakeStripeCheckout
    checkout.CheckoutSessionRequest = FakeCheckoutSessionRequest
    for name, module in [
        ("emergentintegrations", root),
        ("emergentintegrations.llm", llm),
        ("emergentintegrations.llm.chat", chat),
        ("emergentintegrations.payments", payments),
        ("emergentintegrations.payments.stripe", stripe),
        ("emergentintegrations.payments.stripe.checkout", checkout),
    ]:
        sys.modules.setdefault(name, module)


@pytest.fixture(scope="session")
def server_module():
    """Import `server` with stubbed integrations and an in-memory MongoDB."""
    import motor.motor_asyncio
    from mongomock_motor import AsyncMongoMockClient

    _install_emergentintegrations_stub()
    motor.motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient

    # Forced, not setdefault: server.py reads these at import time, so a value
    # inherited from the machine would make the suite non-hermetic (a real
    # mongodb+srv:// URL would even trigger a DNS lookup).
    import os
    os.environ["MONGO_URL"] = "mongodb://localhost:27017"
    os.environ["DB_NAME"] = "autoai_test"
    os.environ["EMERGENT_LLM_KEY"] = "test-llm-key"
    os.environ["ADMIN_PIN"] = "108108"

    import server

    async def _noop():
        return None

    # Keep a handle on the real coroutine so it can be tested explicitly.
    server.real_prewarm_images = server._prewarm_images
    server._prewarm_images = _noop
    return server


_MUTABLE_COLLECTIONS = (
    "bookings", "partner_leads", "dealer_partners", "payment_transactions",
    "subscriptions", "chat_messages", "notifications", "otps", "user_sessions",
)


@pytest.fixture
def client(server_module):
    """TestClient that runs startup hooks (which seed cars/news into the mock DB)."""
    import asyncio

    from fastapi.testclient import TestClient

    async def clear():
        for name in _MUTABLE_COLLECTIONS:
            await server_module.db[name].delete_many({})

    asyncio.run(clear())
    with TestClient(server_module.app) as c:
        yield c


@pytest.fixture(autouse=True)
def reset_stubs():
    FakeLlmChat.instances.clear()
    FakeLlmChat.next_reply = '{"winner": "Tata Nexon"}'
    FakeStripeCheckout.status_to_return = None
    FakeStripeCheckout.status_error = None
    FakeStripeCheckout.webhook_event = None
    FakeStripeCheckout.webhook_error = None
    yield


@pytest.fixture
def stripe_enabled(server_module, monkeypatch):
    monkeypatch.setattr(server_module, "STRIPE_API_KEY", "sk_test_123")
    return server_module


class FakeTTS:
    """Installs a fake `elevenlabs` module and records convert() calls."""

    def __init__(self, server):
        self.server = server
        self.calls: list = []
        self.audio_chunks = [b"audio-", b"bytes"]
        self.error = None
        outer = self

        class _TextToSpeech:
            def convert(self, **kwargs):
                outer.calls.append(kwargs)
                if outer.error:
                    raise outer.error
                return iter(outer.audio_chunks)

        class ElevenLabs:
            def __init__(self, api_key=None):
                self.api_key = api_key
                self.text_to_speech = _TextToSpeech()

        self.module = types.ModuleType("elevenlabs")
        self.module.ElevenLabs = ElevenLabs


@pytest.fixture
def tts(server_module, monkeypatch):
    fake = FakeTTS(server_module)
    monkeypatch.setattr(server_module, "ELEVENLABS_API_KEY", "test-tts-key")
    monkeypatch.setitem(sys.modules, "elevenlabs", fake.module)
    return fake
