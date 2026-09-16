from configurator_recommendations import rank_variant_recommendations


def test_rank_variant_recommendations_filters_explicit_fuel_and_budget_and_is_deterministic():
    candidates = [
        {"variant_id": "v-diesel", "brand_id": "b1", "model_id": "m1", "name": "Diesel SUV", "specs": {"fuel_type": "Diesel"}, "market_segment": "SUV", "price": 1250000},
        {"variant_id": "v-petrol", "brand_id": "b1", "model_id": "m2", "name": "Petrol SUV", "specs": {"fuel_type": "Petrol"}, "market_segment": "SUV", "price": 1050000},
        {"variant_id": "v-expensive", "brand_id": "b1", "model_id": "m3", "name": "Expensive Diesel", "specs": {"fuel_type": "Diesel"}, "market_segment": "SUV", "price": 1800000},
    ]
    request = {"max_budget": 1500000, "preferred_fuel": "Diesel", "preferred_segment": "SUV", "limit": 3}
    first = rank_variant_recommendations(candidates, request)
    second = rank_variant_recommendations(candidates, request)
    assert [item["variant_id"] for item in first] == ["v-diesel"]
    assert first == second
    assert first[0]["rank"] == 1
    assert 0 <= first[0]["fit_score"] <= 100


def test_rank_variant_recommendations_excludes_any_price_above_max_budget():
    candidates = [
        {"variant_id": "v-at-budget", "name": "At Budget", "price": 1200000},
        {"variant_id": "v-one-rupee-over", "name": "One Rupee Over", "price": 1200001},
    ]
    result = rank_variant_recommendations(candidates, {"max_budget": 1200000, "limit": 5})
    assert [item["variant_id"] for item in result] == ["v-at-budget"]
    assert result[0]["budget_fit"] == "within_budget"


def test_rank_variant_recommendations_returns_bounded_backend_facts_without_inventing_metadata():
    candidates = [
        {"variant_id": "v1", "brand_id": "b1", "model_id": "m1", "name": "Family SUV", "specs": {"fuel_type": "Petrol"}, "market_segment": "SUV", "price": 1200000, "features": ["six airbags", "sunroof"]},
        {"variant_id": "v2", "brand_id": "b2", "model_id": "m2", "name": "Family Hatchback", "specs": {"fuel_type": "Petrol"}, "market_segment": "Hatchback", "price": 900000},
    ]
    result = rank_variant_recommendations(candidates, {"preferred_segment": "SUV", "preferred_fuel": "Petrol", "max_budget": 1300000, "limit": 1})
    assert len(result) == 1
    item = result[0]
    assert set(item).issuperset({"variant_id", "rank", "fit_score", "budget_fit", "fuel_fit", "requirement_fit", "why_it_fits"})
    assert item["variant_id"] == "v1"
    assert item["rank"] == 1
    assert item["budget_fit"] == "within_budget"
    assert item["fuel_fit"] == "match"
    assert item["requirement_fit"] == "match"
    assert item["why_it_fits"]
    assert "price" not in item["why_it_fits"] or "1200000" in item["why_it_fits"]


def test_rank_variant_recommendations_excludes_candidates_with_missing_explicit_requirements():
    candidates = [
        {"variant_id": "v-good", "name": "Verified Diesel SUV", "specs": {"fuel_type": "Diesel"}, "market_segment": "SUV", "price": 1200000, "features": ["six airbags", "sunroof"]},
        {"variant_id": "v-missing-fuel", "name": "Unknown Fuel SUV", "market_segment": "SUV", "price": 1100000, "features": ["six airbags", "sunroof"]},
        {"variant_id": "v-missing-price", "name": "Unknown Price Diesel SUV", "specs": {"fuel_type": "Diesel"}, "market_segment": "SUV", "features": ["six airbags", "sunroof"]},
        {"variant_id": "v-missing-feature", "name": "Missing Sunroof Diesel SUV", "specs": {"fuel_type": "Diesel"}, "market_segment": "SUV", "price": 1150000, "features": ["six airbags"]},
    ]
    request = {
        "max_budget": 1300000,
        "preferred_fuel": "Diesel",
        "preferred_segment": "SUV",
        "required_features": ["six airbags", "sunroof"],
        "limit": 5,
    }
    result = rank_variant_recommendations(candidates, request)
    assert [item["variant_id"] for item in result] == ["v-good"]
