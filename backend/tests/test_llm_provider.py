import pytest

from llm_provider import LLMProviderError, LlmChat, UserMessage, resolve_model


def test_default_model_is_anthropic():
    assert resolve_model() == ("anthropic", "claude-sonnet-4-6")


@pytest.mark.parametrize(
    "key, expected",
    [
        ("claude", ("anthropic", "claude-sonnet-4-6")),
        ("claude-opus", ("anthropic", "claude-opus-4-7")),
        ("claude-haiku", ("anthropic", "claude-haiku-4-5-20251001")),
        ("gpt-flagship", ("openai", "gpt-5.4")),
        ("gpt-mini", ("openai", "gpt-5.4-mini")),
        ("gemini-pro", ("gemini", "gemini-3.1-pro-preview")),
        ("gemini-flash", ("gemini", "gemini-3.5-flash")),
    ],
)
def test_supported_model_aliases(key, expected):
    assert resolve_model(key) == expected


def test_unknown_model_fails_closed():
    with pytest.raises(LLMProviderError, match="Unknown LLM model"):
        resolve_model("not-a-real-model")


@pytest.mark.asyncio
async def test_missing_anthropic_key_fails_closed(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    chat = LlmChat(None, "test-session", "test system").with_model(
        "anthropic", "claude-sonnet-4-6"
    )
    with pytest.raises(LLMProviderError, match="ANTHROPIC_API_KEY is not configured"):
        await chat.send_message(UserMessage("hello"))


@pytest.mark.asyncio
async def test_missing_openai_key_fails_closed(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    chat = LlmChat(None, "test-session", "test system").with_model("openai", "gpt-5.4")
    with pytest.raises(LLMProviderError, match="OPENAI_API_KEY is not configured"):
        await chat.send_message(UserMessage("hello"))


@pytest.mark.asyncio
async def test_missing_gemini_keys_fails_closed(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    chat = LlmChat(None, "test-session", "test system").with_model(
        "gemini", "gemini-3.1-pro-preview"
    )
    with pytest.raises(LLMProviderError, match="GEMINI_API_KEY is not configured"):
        await chat.send_message(UserMessage("hello"))


@pytest.mark.asyncio
async def test_unconfigured_provider_fails_closed():
    chat = LlmChat(None, "test-session", "test system")
    with pytest.raises(LLMProviderError, match="provider/model has not been configured"):
        await chat.send_message(UserMessage("hello"))


def test_with_model_is_chainable():
    chat = LlmChat(None, "test-session", "test system")
    assert chat.with_model("anthropic", "claude-sonnet-4-6") is chat
