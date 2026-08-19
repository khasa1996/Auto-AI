import pytest

from llm_provider import LLMProviderError, resolve_model


def test_model_registry_resolves_all_supported_models():
    assert resolve_model("claude") == ("anthropic", "claude-sonnet-4-6")
    assert resolve_model("gpt-flagship") == ("openai", "gpt-5.4")
    assert resolve_model("gemini-flash") == ("gemini", "gemini-3.5-flash")


def test_unknown_model_is_rejected():
    with pytest.raises(LLMProviderError):
        resolve_model("does-not-exist")
