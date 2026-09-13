from configurator_asset_validation import validate_asset_manifest
from configurator_schemas import AssetProvenance, ConfiguratorAssetCreate


def make_asset(**overrides):
    data = {
        "asset_id": "asset-1",
        "variant_id": "v1",
        "model_id": "m1",
        "brand_id": "b1",
        "format": "glb",
        "url": "https://cdn.example.com/car.glb",
        "version": "1.0",
        "provenance": AssetProvenance.AUTO_AI_LICENSED,
        "license_name": "Licensed Asset",
        "publisher": "Auto AI India",
        "validation_passed": True,
        "admin_reviewed": True,
        "supported_interactions": ["doors", "hood"],
        "wheel_mesh_names": {"w1": "wheel-a"},
        "option_mesh_names": {"roof-1": ["roof-a"]},
    }
    data.update(overrides)
    return ConfiguratorAssetCreate(**data)


def test_valid_manifest_passes_when_all_mappings_exist():
    result = validate_asset_manifest(make_asset(), ["body", "wheel-a", "roof-a"])
    assert result["valid"] is True
    assert result["errors"] == []


def test_manifest_rejects_missing_mesh_mapping():
    result = validate_asset_manifest(make_asset(), ["body"])
    assert result["valid"] is False
    assert any("missing mesh" in error.lower() for error in result["errors"])


def test_manifest_rejects_unknown_interaction():
    result = validate_asset_manifest(make_asset(supported_interactions=["teleport"]), ["wheel-a", "roof-a"])
    assert result["valid"] is False
    assert any("unsupported interaction" in error.lower() for error in result["errors"])
