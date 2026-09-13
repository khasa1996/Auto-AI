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


def test_storage_upload_ttl_must_stay_within_safe_bounds(monkeypatch):
    monkeypatch.setenv("ASSET_STORAGE_BUCKET", "autoai-assets")
    monkeypatch.setenv("ASSET_STORAGE_REGION", "ap-south-1")
    monkeypatch.setenv("ASSET_STORAGE_ACCESS_KEY_ID", "test-access")
    monkeypatch.setenv("ASSET_STORAGE_SECRET_ACCESS_KEY", "test-secret")

    for ttl in ("59", "3601", "not-an-integer"):
        monkeypatch.setenv("ASSET_STORAGE_UPLOAD_TTL_SECONDS", ttl)
        with pytest.raises(AssetStorageConfigError, match="ASSET_STORAGE_UPLOAD_TTL_SECONDS"):
            get_asset_storage_config()


def test_storage_public_base_url_is_normalized(monkeypatch):
    monkeypatch.setenv("ASSET_STORAGE_BUCKET", "autoai-assets")
    monkeypatch.setenv("ASSET_STORAGE_REGION", "ap-south-1")
    monkeypatch.setenv("ASSET_STORAGE_ACCESS_KEY_ID", "test-access")
    monkeypatch.setenv("ASSET_STORAGE_SECRET_ACCESS_KEY", "test-secret")
    monkeypatch.setenv("ASSET_STORAGE_PUBLIC_BASE_URL", "https://cdn.example.com/")

    config = get_asset_storage_config()

    assert config.public_base_url == "https://cdn.example.com"
