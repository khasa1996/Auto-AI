import pytest

from llm_provider import LLMProviderError, resolve_model


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
