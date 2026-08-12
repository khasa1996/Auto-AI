"""Unit tests for the catalogue (cars/news) and EMI endpoints."""
import pytest


def test_root_message(client):
    r = client.get("/api/")
    assert r.status_code == 200
    assert "Auto-AI India" in r.json()["message"]


def test_list_cars_returns_seeded_catalogue_without_mongo_ids(client, server_module):
    r = client.get("/api/cars")
    assert r.status_code == 200
    cars = r.json()
    assert len(cars) == len(server_module.CARS_SEED)
    assert all("_id" not in c for c in cars)


def test_list_cars_filters_by_segment(client):
    cars = client.get("/api/cars", params={"segment": "Hatchback"}).json()
    assert cars
    assert {c["segment"] for c in cars} == {"Hatchback"}


def test_list_cars_filters_by_fuel(client):
    cars = client.get("/api/cars", params={"fuel": "Electric"}).json()
    assert cars
    assert {c["fuel"] for c in cars} == {"Electric"}


def test_list_cars_fuel_any_is_not_a_filter(client):
    assert len(client.get("/api/cars", params={"fuel": "Any"}).json()) == len(
        client.get("/api/cars").json()
    )


def test_list_cars_filters_by_budget_max(client):
    cars = client.get("/api/cars", params={"budget_max": 800000}).json()
    assert cars
    assert all(c["price_ex_showroom"] <= 800000 for c in cars)


def test_list_cars_free_text_search_is_case_insensitive(client):
    cars = client.get("/api/cars", params={"q": "nEXon"}).json()
    assert cars
    assert all("nexon" in f"{c['brand']} {c['model']}".lower() for c in cars)


def test_list_cars_combines_filters(client):
    cars = client.get(
        "/api/cars", params={"q": "tata", "fuel": "Petrol", "budget_max": 1200000}
    ).json()
    assert cars
    assert all(
        c["brand"].lower() == "tata" and c["fuel"] == "Petrol" and c["price_ex_showroom"] <= 1200000
        for c in cars
    )


def test_list_cars_unmatched_search_returns_empty(client):
    assert client.get("/api/cars", params={"q": "flying saucer"}).json() == []


def test_get_car_by_id(client):
    car = client.get("/api/cars/tata-nexon").json()
    assert car["id"] == "tata-nexon"
    assert car["brand"].lower() == "tata"


def test_get_car_unknown_id_is_404(client):
    r = client.get("/api/cars/does-not-exist")
    assert r.status_code == 404
    assert r.json()["detail"] == "Car not found"


def test_list_news_is_sorted_newest_first(client, server_module):
    news = client.get("/api/news").json()
    assert len(news) == len(server_module.NEWS_SEED)
    dates = [n["date"] for n in news]
    assert dates == sorted(dates, reverse=True)


def test_list_ai_models_exposes_default_and_catalogue(client, server_module):
    body = client.get("/api/ai/models").json()
    assert body["default"] == server_module.DEFAULT_CHAT_MODEL
    assert {m["id"] for m in body["models"]} == set(server_module.AI_MODELS)
    assert all({"id", "label", "family", "strength"} <= set(m) for m in body["models"])


def test_tts_voices_lists_configured_voices(client, server_module):
    body = client.get("/api/tts/voices").json()
    assert body["default"] == server_module.DEFAULT_TTS_VOICE
    assert {v["id"] for v in body["voices"]} == set(server_module.TTS_VOICES)


def test_emi_matches_standard_amortisation_formula(client):
    body = client.post(
        "/api/emi/calculate",
        json={"principal": 1000000, "annual_rate": 9.0, "tenure_months": 60},
    ).json()
    r = 9.0 / 12 / 100
    expected = 1000000 * r * (1 + r) ** 60 / ((1 + r) ** 60 - 1)
    assert body["emi"] == pytest.approx(round(expected, 2))
    assert body["total_payment"] == pytest.approx(round(expected * 60, 2))
    assert body["total_interest"] == pytest.approx(round(expected * 60 - 1000000, 2))
    assert body["principal"] == 1000000
    assert body["tenure_months"] == 60
    assert body["annual_rate"] == 9.0


def test_emi_zero_interest_splits_principal_evenly(client):
    body = client.post(
        "/api/emi/calculate",
        json={"principal": 600000, "annual_rate": 0, "tenure_months": 12},
    ).json()
    assert body["emi"] == pytest.approx(50000)
    assert body["total_interest"] == pytest.approx(0)


@pytest.mark.parametrize(
    "payload",
    [
        {"principal": 1000000, "annual_rate": 9.0, "tenure_months": 0},
        {"principal": 1000000, "annual_rate": 9.0, "tenure_months": -12},
        {"principal": 0, "annual_rate": 9.0, "tenure_months": 60},
        {"principal": -5000, "annual_rate": 9.0, "tenure_months": 60},
    ],
)
def test_emi_rejects_invalid_input(client, payload):
    r = client.post("/api/emi/calculate", json=payload)
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid input"


def test_emi_rejects_missing_fields(client):
    assert client.post("/api/emi/calculate", json={"principal": 100000}).status_code == 422
