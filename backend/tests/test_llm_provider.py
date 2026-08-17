import pytest

from llm_provider import LLMProviderError, resolve_model


def test_default_model_resolves_to_claude():
    assert resolve_model(None) == ("anthropic", "claude-sonnet-4-6")


def test_supported_models_resolve():
    assert resolve_model("gpt-flagship") == ("openai", "gpt-5.4")
    assert resolve_model("gemini-pro") == ("gemini", "gemini-3.1-pro-preview")


def test_unknown_model_fails_closed():
    with pytest.raises(LLMProviderError):
        resolve_model("not-a-real-model")
