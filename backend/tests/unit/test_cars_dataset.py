"""Integrity tests for the seed datasets in cars_data.py / cars_extended.py."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from cars_data import CARS_SEED, NEWS_SEED  # noqa: E402
from cars_extended import EXTENDED_CARS, IMG, _c  # noqa: E402

REQUIRED_FIELDS = {
    "id", "brand", "model", "variant", "segment", "fuel", "transmission",
    "price_ex_showroom", "price_on_road", "mileage_kmpl", "engine_cc",
    "power_bhp", "seats", "boot_litres", "safety_rating",
    "ground_clearance_mm", "waiting_weeks", "image", "tags",
}


def test_seed_is_curated_base_plus_extended():
    assert CARS_SEED[-len(EXTENDED_CARS):] == EXTENDED_CARS
    assert len(CARS_SEED) > len(EXTENDED_CARS)
    assert len(CARS_SEED) >= 100, "the app advertises a 100+ car catalogue"


def test_car_ids_are_unique():
    ids = [c["id"] for c in CARS_SEED]
    duplicates = {i for i in ids if ids.count(i) > 1}
    assert not duplicates, f"duplicate car ids: {duplicates}"


def test_every_car_has_all_required_fields():
    for car in CARS_SEED:
        assert REQUIRED_FIELDS <= set(car), f"{car.get('id')} missing {REQUIRED_FIELDS - set(car)}"


def test_car_ids_are_url_safe_slugs():
    for car in CARS_SEED:
        assert car["id"] == car["id"].lower()
        assert " " not in car["id"] and "_" not in car["id"]


def test_prices_are_positive_and_on_road_is_higher():
    for car in CARS_SEED:
        assert car["price_ex_showroom"] > 0
        assert car["price_on_road"] >= car["price_ex_showroom"], car["id"]


def test_numeric_specs_are_sane():
    for car in CARS_SEED:
        assert car["mileage_kmpl"] > 0, car["id"]
        assert car["engine_cc"] >= 0, car["id"]
        assert car["power_bhp"] > 0, car["id"]
        assert 2 <= car["seats"] <= 9, car["id"]
        assert car["boot_litres"] >= 0, car["id"]
        assert 0 <= car["safety_rating"] <= 5, car["id"]
        assert car["ground_clearance_mm"] > 0, car["id"]
        assert car["waiting_weeks"] >= 0, car["id"]


def test_electric_cars_have_no_engine_displacement():
    evs = [c for c in CARS_SEED if c["fuel"] == "Electric"]
    assert evs
    assert all(c["engine_cc"] == 0 for c in evs)


def test_tags_are_non_empty_string_lists():
    for car in CARS_SEED:
        assert isinstance(car["tags"], list)
        assert car["tags"], car["id"]
        assert all(isinstance(t, str) and t for t in car["tags"])


def test_images_are_https_urls():
    for car in CARS_SEED:
        assert car["image"].startswith("https://"), car["id"]


def test_extended_cars_only_use_the_shared_image_pool():
    pool = set(IMG.values())
    assert {c["image"] for c in EXTENDED_CARS} <= pool


def test_news_seed_is_well_formed_and_unique():
    ids = [n["id"] for n in NEWS_SEED]
    assert len(set(ids)) == len(ids)
    for item in NEWS_SEED:
        assert {"id", "title", "summary", "category", "date", "source", "image"} <= set(item)
        assert item["image"].startswith("https://")
        assert len(item["date"]) == 10 and item["date"].count("-") == 2


def test_car_factory_maps_positional_arguments_to_fields():
    car = _c(
        "test-car", "Brand", "Model", "Variant", "Segment", "Petrol", "Manual",
        500000, 575000, 20.5, 1197, 88, 5, 300, 4, 170, 3, "hatch1", ["tag"],
    )
    assert car == {
        "id": "test-car", "brand": "Brand", "model": "Model", "variant": "Variant",
        "segment": "Segment", "fuel": "Petrol", "transmission": "Manual",
        "price_ex_showroom": 500000, "price_on_road": 575000, "mileage_kmpl": 20.5,
        "engine_cc": 1197, "power_bhp": 88, "seats": 5, "boot_litres": 300,
        "safety_rating": 4, "ground_clearance_mm": 170, "waiting_weeks": 3,
        "image": IMG["hatch1"], "tags": ["tag"],
    }


def test_car_factory_rejects_unknown_image_key():
    with pytest.raises(KeyError):
        _c(
            "bad", "B", "M", "V", "S", "Petrol", "Manual", 1, 1, 1, 1, 1, 5, 1, 1, 1, 1,
            "no-such-image", [],
        )
