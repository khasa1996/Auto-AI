import pytest

from configurator_asset_storage import (
    AssetStorageConfigError,
    build_asset_storage_key,
    get_asset_storage_config,
)


def test_storage_key_is_deterministic_and_safe():
    key = build_asset_storage_key("asset/01", "1.2.0", "Vehicle Model Final.GLB")
    assert key == "configurator/asset-01/v1.2.0/vehicle-model-final.glb"


def test_storage_requires_bucket_and_credentials(monkeypatch):
    for name in (
        "ASSET_STORAGE_BUCKET",
        "ASSET_STORAGE_REGION",
        "ASSET_STORAGE_ACCESS_KEY_ID",
        "ASSET_STORAGE_SECRET_ACCESS_KEY",
    ):
        monkeypatch.delenv(name, raising=False)

    with pytest.raises(AssetStorageConfigError, match="ASSET_STORAGE_BUCKET"):
        get_asset_storage_config()
