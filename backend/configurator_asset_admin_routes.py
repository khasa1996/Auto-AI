"""Admin APIs for verified configurator asset metadata, storage and publication."""

from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import datetime, timezone
from tempfile import SpooledTemporaryFile
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ValidationError

from configurator_asset_ingestion import build_verified_asset_metadata
from configurator_asset_inspection import inspect_gltf_bytes
from configurator_asset_storage import (
    AssetStorageConfigError,
    build_asset_storage_key,
    create_presigned_upload,
    download_object,
    get_asset_storage_config,
    head_object,
    public_asset_url,
)
from configurator_asset_validation import validate_asset_manifest
from configurator_schemas import ConfiguratorAssetCreate, ConfiguratorAsset
from vehicle_schemas import ConfiguratorStatus

_MAX_UPLOAD_BYTES = 200 * 1024 * 1024


class AssetManifestValidationRequest(BaseModel):
    asset: ConfiguratorAssetCreate
    mesh_names: List[str] = Field(default_factory=list, max_length=10000)
    material_names: List[str] = Field(default_factory=list, max_length=10000)


class AssetPublicationRequest(BaseModel):
    asset_id: str = Field(..., max_length=100)
    publish: bool


class AssetReviewRequest(BaseModel):
    asset_id: str = Field(..., max_length=100)
    approved: bool
    review_notes: str = Field(default="", max_length=1000)


class AssetAssignmentRequest(BaseModel):
    variant_id: str = Field(..., max_length=100)
    asset_id: str = Field(..., max_length=100)


class AssetUploadUrlRequest(BaseModel):
    asset_id: str = Field(..., max_length=100)
    filename: str = Field(..., min_length=1, max_length=255)


class AssetFinalizeUploadRequest(BaseModel):
    asset_id: str = Field(..., max_length=100)
    storage_key: str = Field(..., min_length=1, max_length=500)
    expected_checksum_sha256: Optional[str] = Field(None, min_length=64, max_length=64)


async def _require_admin(authorization: Optional[str] = Header(None)) -> str:
    from server import require_admin

    return await require_admin(authorization)


def make_asset_admin_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/api/v1/admin/configurator", tags=["configurator-admin"])

    @router.get("/assets")
    async def list_assets(_: str = Depends(_require_admin)):
        return await db.configurator_assets.find({}, {"_id": 0}).sort([("variant_id", 1), ("version", -1)]).to_list(500)

    @router.post("/assets/validate")
    async def validate_asset_manifest_endpoint(
        request: AssetManifestValidationRequest,
        _: str = Depends(_require_admin),
    ):
        result = validate_asset_manifest(request.asset, request.mesh_names, request.material_names)
        now = datetime.now(timezone.utc).isoformat()
        update = {
            "validation_passed": result["valid"],
            "updated_at": now,
            "validation_errors": result["errors"],
            "validation_warnings": result["warnings"],
        }
        await db.configurator_assets.update_one({"asset_id": request.asset.asset_id}, {"$set": update})
        return {"asset_id": request.asset.asset_id, **result}

    @router.post("/assets/upload-url")
    async def create_asset_upload_url(
        request: AssetUploadUrlRequest,
        _: str = Depends(_require_admin),
    ):
        asset = await db.configurator_assets.find_one({"asset_id": request.asset_id}, {"_id": 0})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        if asset.get("format") != "glb":
            raise HTTPException(status_code=422, detail="Production direct upload currently supports GLB assets only")
        if not request.filename.lower().endswith(".glb"):
            raise HTTPException(status_code=422, detail="Uploaded asset must use a .glb filename")

        try:
            config = get_asset_storage_config()
            key = build_asset_storage_key(request.asset_id, asset["version"], request.filename)
            upload_url = await asyncio.to_thread(create_presigned_upload, config, key)
        except AssetStorageConfigError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        now = datetime.now(timezone.utc).isoformat()
        update = {
            "storage_key": key,
            "storage_provider": "s3-compatible",
            "storage_status": "UPLOAD_URL_ISSUED",
            "updated_at": now,
        }
        await db.configurator_assets.update_one({"asset_id": request.asset_id}, {"$set": update})
        return {"asset_id": request.asset_id, "storage_key": key, "upload_url": upload_url}
