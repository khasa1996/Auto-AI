from configurator_asset_validation import validate_asset_quality
from configurator_schemas import AssetLODLevel, AssetProvenance, ConfiguratorAssetCreate


def make_asset(**overrides):
    data = {
        "asset_id": "asset-quality-1",
        "variant_id": "variant-1",
        "model_id": "model-1",
        "brand_id": "brand-1",
        "format": "glb",
        "url": "https://cdn.example.com/vehicle.glb",
        "version": "1.0.0",
        "lod_level": AssetLODLevel.LOD0,
        "provenance": AssetProvenance.OEM_AUTHORIZED,
        "license_name": "OEM licence",
        "publisher": "Auto AI India",
        "validation_passed": True,
        "admin_reviewed": True,
        "file_size_bytes": 50 * 1024 * 1024,
    }
    data.update(overrides)
    return ConfiguratorAssetCreate(**data)


def test_asset_quality_rejects_missing_runtime_budget_metadata():
    result = validate_asset_quality(make_asset(), triangle_count=2_000_000, texture_memory_bytes=512 * 1024 * 1024)

    assert result["valid"] is False
    assert any("triangle" in error.lower() for error in result["errors"])
    assert any("texture" in error.lower() for error in result["errors"])


def test_asset_quality_accepts_mobile_safe_budget():
    result = validate_asset_quality(make_asset(), triangle_count=250_000, texture_memory_bytes=64 * 1024 * 1024)

    assert result["valid"] is True
