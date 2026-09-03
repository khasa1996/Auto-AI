import pytest

from asset_provenance import AssetProvenance, validate_asset_url


def test_provenance_values_are_explicit_and_serializable():
    assert [item.value for item in AssetProvenance] == [
        "AUTO_AI_LICENSED",
        "OEM_AUTHORIZED",
        "LICENSED_THIRD_PARTY",
        "AI_GENERATED_CONCEPT",
        "UNKNOWN",
    ]


def test_unknown_asset_is_not_publishable():
    assert validate_asset_url("https://images.unsplash.com/photo-123?w=800", AssetProvenance.UNKNOWN) is False


def test_ai_generated_concept_is_not_presented_as_oem():
    assert validate_asset_url("https://cdn.autoaiindia.com/concepts/car.webp", AssetProvenance.AI_GENERATED_CONCEPT) is False


def test_verified_model_assets_require_glb_or_gltf():
    assert validate_asset_url("https://cdn.autoaiindia.com/models/car.glb", AssetProvenance.AUTO_AI_LICENSED) is True
    assert validate_asset_url("https://cdn.autoaiindia.com/models/car.gltf", AssetProvenance.LICENSED_THIRD_PARTY) is True
    assert validate_asset_url("https://cdn.autoaiindia.com/models/car.jpg", AssetProvenance.AUTO_AI_LICENSED) is False


def test_invalid_url_is_rejected():
    with pytest.raises(ValueError):
        validate_asset_url("not-a-url", AssetProvenance.AUTO_AI_LICENSED)
