from configurator_asset_ingestion import build_verified_asset_metadata
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
        "supported_interactions": ["doors"],
        "wheel_mesh_names": {"w1": "Wheel_FL"},
        "option_mesh_names": {"roof-1": ["Sunroof"]},
    }
    data.update(overrides)
    return ConfiguratorAssetCreate(**data)


def test_build_verified_metadata_matches_manifest_to_inspected_asset():
    result = build_verified_asset_metadata(
        make_asset(),
        {
            "format": "glb",
            "mesh_names": ["Wheel_FL"],
            "node_names": ["Sunroof"],
            "material_names": ["BODY_PAINT"],
            "animation_names": ["OpenDoors"],
        },
    )

    assert result["valid"] is True
    assert result["missing_meshes"] == []
    assert result["missing_materials"] == []
    assert result["missing_animations"] == []


def test_build_verified_metadata_rejects_manifest_mismatch():
    result = build_verified_asset_metadata(
        make_asset(),
        {
            "format": "glb",
            "mesh_names": ["WrongWheel"],
            "node_names": [],
            "material_names": [],
            "animation_names": [],
        },
    )

    assert result["valid"] is False
    assert "Wheel_FL" in result["missing_meshes"]
    assert "Sunroof" in result["missing_meshes"]
    assert "OpenDoors" in result["missing_animations"]


def test_build_verified_metadata_requires_glb():
    result = build_verified_asset_metadata(make_asset(), {"format": "gltf", "mesh_names": []})
    assert result["valid"] is False
    assert "GLB" in result["errors"][0]
