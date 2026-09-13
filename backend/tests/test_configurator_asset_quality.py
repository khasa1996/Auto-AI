from configurator_asset_validation import validate_asset_manifest, validate_asset_quality
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


def test_asset_manifest_requires_complete_material_camera_and_interaction_mappings():
    asset = make_asset(
        supported_interactions=["doors", "camera_interior", "camera_exterior", "hood"],
        paint_material_names=[],
        interior_material_names=[],
        camera_preset_names=[],
        interaction_animation_names={"doors": {"open": "DoorOpen"}},
    )

    result = validate_asset_manifest(asset, ["DoorFL", "DoorFR"])

    assert result["valid"] is False
    assert any("paint" in error.lower() for error in result["errors"])
    assert any("camera" in error.lower() for error in result["errors"])
    assert any("hood" in error.lower() for error in result["errors"])


def test_asset_manifest_accepts_complete_production_capability_manifest():
    asset = make_asset(
        supported_interactions=["doors", "hood", "camera_exterior", "camera_interior"],
        paint_material_names=["BodyPaint"],
        interior_material_names=["Dashboard", "SeatLeather"],
        camera_preset_names=["front", "rear", "side", "interior"],
        wheel_mesh_names={"wheel-1": "WheelFL", "wheel-2": "WheelFR"},
        option_mesh_names={"sunroof-1": ["SunroofGlass"]},
        interaction_animation_names={
            "doors": {"open": "DoorOpen", "close": "DoorClose"},
            "hood": {"open": "HoodOpen", "close": "HoodClose"},
        },
    )

    result = validate_asset_manifest(
        asset,
        ["WheelFL", "WheelFR", "SunroofGlass"],
        material_names=["BodyPaint", "Dashboard", "SeatLeather"],
        animation_names=["DoorOpen", "DoorClose", "HoodOpen", "HoodClose"],
        camera_names=["front", "rear", "side", "interior"],
    )

    assert result["valid"] is True


def test_asset_manifest_rejects_interaction_without_required_animation_mapping():
    asset = make_asset(
        supported_interactions=["hood"],
        paint_material_names=["BodyPaint"],
        interior_material_names=["SeatLeather"],
        camera_preset_names=["front"],
        interaction_animation_names={},
    )

    result = validate_asset_manifest(
        asset,
        [],
        material_names=["BodyPaint", "SeatLeather"],
        camera_names=["front"],
    )

    assert result["valid"] is False
    assert any("hood" in error.lower() and "animation" in error.lower() for error in result["errors"])
