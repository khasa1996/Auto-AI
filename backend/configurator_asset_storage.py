"""S3-compatible object storage primitives for configurator assets."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Any, BinaryIO
from urllib.parse import quote

import boto3

_MAX_ASSET_BYTES = 200 * 1024 * 1024
_DEFAULT_UPLOAD_TTL_SECONDS = 900
_SAFE_SEGMENT = re.compile(r"[^a-z0-9._-]+")


class AssetStorageConfigError(RuntimeError):
    """Raised when production object-storage configuration is incomplete."""


@dataclass(frozen=True)
class AssetStorageConfig:
    bucket: str
    region: str
    access_key_id: str
    secret_access_key: str
    endpoint_url: str | None
    public_base_url: str | None
    upload_ttl_seconds: int


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise AssetStorageConfigError(f"{name} is required for configurator asset storage")
    return value


def get_asset_storage_config() -> AssetStorageConfig:
    """Load storage settings without ever exposing credentials to callers."""
    ttl_raw = os.getenv("ASSET_STORAGE_UPLOAD_TTL_SECONDS", str(_DEFAULT_UPLOAD_TTL_SECONDS)).strip()
    try:
        ttl = int(ttl_raw)
    except ValueError as exc:
        raise AssetStorageConfigError("ASSET_STORAGE_UPLOAD_TTL_SECONDS must be an integer") from exc
    if not 60 <= ttl <= 3600:
        raise AssetStorageConfigError("ASSET_STORAGE_UPLOAD_TTL_SECONDS must be between 60 and 3600")

    return AssetStorageConfig(
        bucket=_required_env("ASSET_STORAGE_BUCKET"),
        region=_required_env("ASSET_STORAGE_REGION"),
        access_key_id=_required_env("ASSET_STORAGE_ACCESS_KEY_ID"),
        secret_access_key=_required_env("ASSET_STORAGE_SECRET_ACCESS_KEY"),
        endpoint_url=os.getenv("ASSET_STORAGE_ENDPOINT_URL", "").strip() or None,
        public_base_url=os.getenv("ASSET_STORAGE_PUBLIC_BASE_URL", "").strip().rstrip("/") or None,
        upload_ttl_seconds=ttl,
    )


def _safe_segment(value: str) -> str:
    normalized = value.strip().lower().replace(" ", "-")
    normalized = _SAFE_SEGMENT.sub("-", normalized)
    normalized = re.sub(r"-+", "-", normalized).strip(".-")
    return normalized or "asset"


def build_asset_storage_key(asset_id: str, version: str, filename: str) -> str:
    """Build a stable object key scoped to one asset version."""
    name = _safe_segment(filename.rsplit("/", 1)[-1])
    if not name.endswith(".glb"):
        raise ValueError("Configurator production uploads must use a .glb filename")
    return f"configurator/{_safe_segment(asset_id)}/v{_safe_segment(version)}/{name}"


def _client(config: AssetStorageConfig) -> Any:
    kwargs: dict[str, Any] = {
        "service_name": "s3",
        "region_name": config.region,
        "aws_access_key_id": config.access_key_id,
        "aws_secret_access_key": config.secret_access_key,
    }
    if config.endpoint_url:
        kwargs["endpoint_url"] = config.endpoint_url
    return boto3.client(**kwargs)


def create_presigned_upload(config: AssetStorageConfig, key: str, content_type: str = "model/gltf-binary") -> str:
    """Create a short-lived browser upload URL."""
    return _client(config).generate_presigned_url(
        "put_object",
        Params={"Bucket": config.bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=config.upload_ttl_seconds,
        HttpMethod="PUT",
    )


def public_asset_url(config: AssetStorageConfig, key: str) -> str | None:
    """Return a public/CDN URL only when an explicit public base is configured."""
    if not config.public_base_url:
        return None
    return f"{config.public_base_url}/{quote(key, safe='/') }"


def head_object(config: AssetStorageConfig, key: str) -> dict[str, Any]:
    """Read object metadata from storage."""
    return _client(config).head_object(Bucket=config.bucket, Key=key)


def download_object(config: AssetStorageConfig, key: str, destination: BinaryIO) -> int:
    """Stream an object into a file-like destination with the 200 MB guard."""
    response = _client(config).get_object(Bucket=config.bucket, Key=key)
    body = response["Body"]
    total = 0
    try:
        while True:
            chunk = body.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > _MAX_ASSET_BYTES:
                raise ValueError("Asset exceeds the 200 MB upload limit")
            destination.write(chunk)
    finally:
        body.close()
    return total
