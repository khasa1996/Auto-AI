import pytest

from configurator_recommendations import extract_recommendation_intent


class _FakeChat:
    def __init__(self, response):
        self.response = response

    def with_model(self, _provider, _model):
        return self

    async def send_message(self, _message):
        return self.response


@pytest.mark.asyncio
async def test_extract_recommendation_intent_uses_structured_ai_output(monkeypatch):
    monkeypatch.setattr(
        "configurator_recommendations.resolve_model",
        lambda: ("openai", "test-model"),
    )
    monkeypatch.setattr(
        "configurator_recommendations.LlmChat",
        lambda *_args, **_kwargs: _FakeChat(
            '{"preferred_segment":"suv","preferred_fuel":"diesel","max_budget":2000000,"required_features":["ADAS","360 camera"]}'
        ),
    )

    result = await extract_recommendation_intent(
        "I want a diesel SUV under 20 lakh with ADAS and 360 camera"
    )

    assert result["preferred_segment"] == "suv"
    assert result["preferred_fuel"] == "diesel"
    assert result["max_budget"] == 2000000
    assert result["required_features"] == ["ADAS", "360 camera"]
    assert result["ai_assisted"] is True


@pytest.mark.asyncio
async def test_extract_recommendation_intent_falls_back_safely_when_ai_unavailable(monkeypatch):
    def fail_model():
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr("configurator_recommendations.resolve_model", fail_model)

    result = await extract_recommendation_intent("diesel SUV under 15 lakh")

    assert result["preferred_segment"] == "suv"
    assert result["preferred_fuel"] == "diesel"
    assert result["max_budget"] == 1500000
    assert result["required_features"] == []
    assert result["ai_assisted"] is False
