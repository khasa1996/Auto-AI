"""Tests for semantic 3D option mapping metadata."""

from configurator_schemas import ConfiguratorAssetCreate


def test_asset_accepts_generic_option_mesh_mappings() -> None:
    asset = ConfiguratorAssetCreate(
        asset_id="asset-1",
        variant_id="variant-1",
        model_id="model-1",
        brand_id="brand-1",
        format="glb",
        url="https://cdn.example.com/vehicle.glb",
        version="1.0.0",
        option_mesh_names={
            "interior-black": ["Interior_Black"],
            "roof-panoramic": ["Panoramic_Roof"],
            "accessory-spoiler": ["Accessory_Spoiler"],
        },
    )

    assert asset.option_mesh_names["interior-black"] == ["Interior_Black"]
    assert asset.option_mesh_names["roof-panoramic"] == ["Panoramic_Roof"]
    assert asset.option_mesh_names["accessory-spoiler"] == ["Accessory_Spoiler"]


def test_asset_defaults_generic_option_mesh_mappings_to_empty() -> None:
    asset = ConfiguratorAssetCreate(
        asset_id="asset-2",
        variant_id="variant-2",
        model_id="model-2",
        brand_id="brand-2",
        format="glb",
        url="https://cdn.example.com/vehicle.glb",
        version="1.0.0",
    )

    assert asset.option_mesh_names == {}
