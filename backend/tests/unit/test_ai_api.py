"""Unit tests for the AI endpoints (compare, recommend, chat) and TTS.

The LLM SDK is stubbed in conftest, so these assert the prompt building,
model selection, DB writes and error mapping around it — not model output.
"""
import json

import pytest

from conftest import FakeLlmChat

COMPARE_JSON = json.dumps(
    {
        "winner": "Tata Nexon",
        "headline": "Nexon wins on safety",
        "verdict": "Five stars and a bigger boot.",
        "pros_a": ["safe"],
        "cons_a": ["waiting"],
        "pros_b": ["mileage"],
        "cons_b": ["3 star"],
        "scores": {"safety": {"a": 9, "b": 6}},
        "best_for": "families",
    }
)


def test_compare_returns_both_cars_and_parsed_analysis(client):
    FakeLlmChat.next_reply = f"Here you go:\n{COMPARE_JSON}"
    body = client.post(
        "/api/ai/compare",
        json={"car_a": "Tata Nexon", "car_b": "Maruti Baleno", "user_need": "city commute"},
    ).json()
    assert body["car_a"]["id"] == "tata-nexon"
    assert body["car_b"]["id"] == "maruti-baleno"
    assert body["analysis"]["winner"] == "Tata Nexon"


def test_compare_prompt_carries_user_need_and_car_specs(client, server_module):
    FakeLlmChat.next_reply = COMPARE_JSON
    client.post(
        "/api/ai/compare",
        json={"car_a": "Tata Nexon", "car_b": "Maruti Baleno", "user_need": "highway trips"},
    )
    chat = FakeLlmChat.instances[-1]
    assert chat.system_message == server_module.COMPARE_SYSTEM
    assert chat.model == server_module.CLAUDE_MODEL
    prompt = chat.sent[-1].text
    assert "highway trips" in prompt
    assert "tata-nexon" in prompt and "maruti-baleno" in prompt


def test_compare_unknown_car_is_404(client):
    r = client.post("/api/ai/compare", json={"car_a": "Tata Nexon", "car_b": "Quantum Zephyr"})
    assert r.status_code == 404
    assert "b_found=False" in r.json()["detail"]


def test_compare_non_json_model_reply_is_500(client):
    FakeLlmChat.next_reply = "I cannot help with that."
    r = client.post("/api/ai/compare", json={"car_a": "Tata Nexon", "car_b": "Maruti Baleno"})
    assert r.status_code == 500
    assert r.json()["detail"] == "AI did not return valid JSON"


def test_compare_maps_sdk_failure_to_500(client, monkeypatch, server_module):
    async def boom(*args, **kwargs):
        raise RuntimeError("provider down")

    monkeypatch.setattr(server_module, "get_chat", boom)
    r = client.post("/api/ai/compare", json={"car_a": "Tata Nexon", "car_b": "Maruti Baleno"})
    assert r.status_code == 500
    assert "provider down" in r.json()["detail"]


RECOMMEND_JSON = json.dumps(
    {
        "top_picks": [{"car_id": "tata-nexon", "score": 91, "why": "safe", "watchouts": "waiting"}],
        "summary": "Nexon leads the shortlist.",
    }
)


def test_recommend_hydrates_picks_with_car_documents(client):
    FakeLlmChat.next_reply = RECOMMEND_JSON
    body = client.post(
        "/api/ai/recommend",
        json={"budget_min": 900000, "budget_max": 1400000, "fuel": "Petrol", "seats": 5},
    ).json()
    assert body["summary"]
    pick = body["top_picks"][0]
    assert pick["car"]["id"] == "tata-nexon"


def test_recommend_leaves_unknown_pick_id_without_car(client):
    FakeLlmChat.next_reply = json.dumps(
        {"top_picks": [{"car_id": "not-a-car", "score": 50}], "summary": "meh"}
    )
    body = client.post(
        "/api/ai/recommend", json={"budget_min": 500000, "budget_max": 2000000}
    ).json()
    assert body["top_picks"][0]["car"] is None


def test_recommend_candidates_respect_budget_fuel_and_seats(client):
    FakeLlmChat.next_reply = RECOMMEND_JSON
    client.post(
        "/api/ai/recommend",
        json={
            "budget_min": 1000000,
            "budget_max": 2000000,
            "fuel": "Diesel",
            "seats": 7,
            "usage": "highway",
            "notes": "big family",
        },
    )
    prompt = FakeLlmChat.instances[-1].sent[-1].text
    assert "big family" in prompt and "highway" in prompt
    candidates = json.loads(prompt[prompt.index("["):prompt.rindex("]") + 1])
    assert candidates
    assert all(
        c["fuel"] == "Diesel" and c["seats"] >= 7 and 1000000 <= c["price_ex_showroom"] <= 2000000
        for c in candidates
    )


def test_recommend_with_no_candidates_skips_the_llm(client):
    body = client.post(
        "/api/ai/recommend", json={"budget_min": 1, "budget_max": 2, "seats": 5}
    ).json()
    assert body == {
        "top_picks": [],
        "summary": "No cars match your criteria. Try widening the budget or seat filter.",
        "candidates": [],
    }
    assert FakeLlmChat.instances == []


def test_recommend_non_json_model_reply_is_500(client):
    FakeLlmChat.next_reply = "nope"
    r = client.post("/api/ai/recommend", json={"budget_min": 500000, "budget_max": 3000000})
    assert r.status_code == 500


def test_recommend_maps_sdk_failure_to_500(client, monkeypatch, server_module):
    async def boom(*args, **kwargs):
        raise RuntimeError("recommender down")

    monkeypatch.setattr(server_module, "get_chat", boom)
    r = client.post("/api/ai/recommend", json={"budget_min": 500000, "budget_max": 3000000})
    assert r.status_code == 500
    assert "recommender down" in r.json()["detail"]


def test_chat_reply_persists_history_and_reports_model(client):
    FakeLlmChat.next_reply = "The Nexon is a strong pick."
    body = client.post(
        "/api/ai/chat",
        json={"session_id": "s-chat-1", "message": "Which SUV is safest?", "language": "Hindi"},
    ).json()
    assert body["reply"] == "The Nexon is a strong pick."
    assert body["model"] == server_default_label(client)

    history = client.get("/api/ai/chat/s-chat-1/history").json()
    assert [m["role"] for m in history] == ["user", "assistant"]
    assert history[0]["content"] == "Which SUV is safest?"


def server_default_label(client):
    body = client.get("/api/ai/models").json()
    return next(m["label"] for m in body["models"] if m["id"] == body["default"])


def test_chat_language_is_injected_into_system_prompt(client):
    client.post(
        "/api/ai/chat",
        json={"session_id": "s-chat-2", "message": "hello", "language": "Tamil"},
    )
    system = FakeLlmChat.instances[-1].system_message
    assert "Reply in Tamil" in system
    assert "{LANGUAGE}" not in system and "{BOOKING_CONTEXT}" not in system


def test_chat_honours_requested_model(client, server_module):
    body = client.post(
        "/api/ai/chat",
        json={"session_id": "s-chat-3", "message": "hi", "model": "gemini-flash"},
    ).json()
    entry = server_module.AI_MODELS["gemini-flash"]
    assert body["model"] == entry["label"]
    assert FakeLlmChat.instances[-1].model == (entry["provider"], entry["model"])


def test_chat_without_crm_keywords_has_no_booking_context(client):
    client.post("/api/ai/chat", json={"session_id": "s-chat-4", "message": "Best mileage hatchback?"})
    assert "(none)" in FakeLlmChat.instances[-1].system_message


def test_chat_crm_query_injects_bookings_matching_phone(client):
    client.post(
        "/api/bookings",
        json={"car_id": "tata-nexon", "name": "Asha", "phone": "9876500001", "city": "Mumbai"},
    )
    client.post(
        "/api/bookings",
        json={"car_id": "hyundai-creta", "name": "Ravi", "phone": "9876500002", "city": "Pune"},
    )
    client.post(
        "/api/ai/chat",
        json={"session_id": "s-chat-5", "message": "track my booking for 9876500002 please"},
    )
    system = FakeLlmChat.instances[-1].system_message
    assert "Hyundai Creta" in system
    assert "Tata Nexon" not in system


def test_chat_crm_query_filters_by_booking_id_prefix(client):
    other = client.post(
        "/api/bookings",
        json={"car_id": "hyundai-creta", "name": "Ravi", "phone": "9876500003", "city": "Pune"},
    ).json()
    target = client.post(
        "/api/bookings",
        json={"car_id": "tata-nexon", "name": "Asha", "phone": "9876500004", "city": "Mumbai"},
    ).json()
    client.post(
        "/api/ai/chat",
        json={"session_id": "s-chat-6", "message": f"status of booking {target['id'][:8].upper()}?"},
    )
    system = FakeLlmChat.instances[-1].system_message
    assert target["id"][:8].upper() in system
    assert other["id"][:8].upper() not in system


def test_chat_crm_query_logs_a_notification(client, server_module):
    client.post("/api/ai/chat", json={"session_id": "s-chat-7", "message": "cancel my order"})
    import asyncio

    notes = asyncio.run(
        server_module.db.notifications.find({"session_id": "s-chat-7"}, {"_id": 0}).to_list(10)
    )
    assert len(notes) == 1 and notes[0]["type"] == "crm_query"


def test_chat_maps_sdk_failure_to_500(client, monkeypatch, server_module):
    async def boom(*args, **kwargs):
        raise RuntimeError("llm exploded")

    monkeypatch.setattr(server_module, "get_chat", boom)
    r = client.post("/api/ai/chat", json={"session_id": "s-chat-8", "message": "hi"})
    assert r.status_code == 500
    assert "llm exploded" in r.json()["detail"]


def test_chat_history_of_unknown_session_is_empty(client):
    assert client.get("/api/ai/chat/never-used/history").json() == []


def test_tts_requires_configuration(client, monkeypatch, server_module):
    monkeypatch.setattr(server_module, "ELEVENLABS_API_KEY", None)
    r = client.post("/api/tts/speak", json={"text": "hello"})
    assert r.status_code == 503
    assert r.json()["detail"] == "TTS not configured"


@pytest.mark.parametrize("text", ["", "   "])
def test_tts_rejects_empty_text(client, monkeypatch, server_module, text):
    monkeypatch.setattr(server_module, "ELEVENLABS_API_KEY", "key")
    r = client.post("/api/tts/speak", json={"text": text})
    assert r.status_code == 400
    assert r.json()["detail"] == "Empty text"


def test_tts_returns_audio_for_default_voice(tts, client):
    r = client.post("/api/tts/speak", json={"text": "hello there"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "audio/mpeg"
    assert r.content == b"audio-bytes"
    assert r.headers["cache-control"] == "public, max-age=3600"
    assert tts.calls[-1]["voice_id"] == tts.server.TTS_VOICES["female"]["voice_id"]
    assert tts.calls[-1]["model_id"] == "eleven_multilingual_v2"


@pytest.mark.parametrize("voice,expected", [("male", "male"), ("female", "female"), ("robot", "female")])
def test_tts_voice_selection_falls_back_to_default(tts, client, voice, expected):
    client.post("/api/tts/speak", json={"text": "hello", "voice": voice})
    assert tts.calls[-1]["voice_id"] == tts.server.TTS_VOICES[expected]["voice_id"]


def test_tts_truncates_long_text(tts, client, server_module):
    limit = server_module._TTS_CHAR_LIMIT
    client.post("/api/tts/speak", json={"text": "a" * (limit + 500)})
    sent = tts.calls[-1]["text"]
    assert len(sent) == limit + 1 and sent.endswith("…")


def test_tts_empty_audio_from_provider_is_502(tts, client):
    tts.audio_chunks = []
    r = client.post("/api/tts/speak", json={"text": "hello"})
    assert r.status_code == 502
    assert r.json()["detail"] == "Empty audio from provider"


def test_tts_provider_exception_maps_to_502(tts, client):
    tts.error = RuntimeError("quota exceeded")
    r = client.post("/api/tts/speak", json={"text": "hello"})
    assert r.status_code == 502
    assert "quota exceeded" in r.json()["detail"]
