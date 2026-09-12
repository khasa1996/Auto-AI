"""Admin APIs for verified configurator asset metadata and publication."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ValidationError

from configurator_asset_ingestion import build_verified_asset_metadata
from configurator_asset_inspection import inspect_gltf_bytes
from configurator_asset_validation import validate_asset_manifest
from configurator_schemas import ConfiguratorAssetCreate, ConfiguratorAsset
from vehicle_schemas import ConfiguratorStatus

_MAX_UPLOAD_BYTES = 200 * 1024 * 1024


class AssetManifestValidationRequest(BaseModel):
    asset: ConfiguratorAssetCreate
    mesh_names: List[str] = Field(default_factory=list, max_length=10000)


class AssetPublicationRequest(BaseModel):
    asset_id: str = Field(..., max_length=100)
    publish: bool


class AssetAssignmentRequest(BaseModel):
    variant_id: str = Field(..., max_length=100)
    asset_id: str = Field(..., max_length=100)


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
        result = validate_asset_manifest(request.asset, request.mesh_names)
        now = datetime.now(timezone.utc).isoformat()
        update = {
            "validation_passed": result["valid"],
            "updated_at": now,
            "validation_errors": result["errors"],
            "validation_warnings": result["warnings"],
        }
        await db.configurator_assets.update_one({"asset_id": request.asset.asset_id}, {"$set": update})
        return {"asset_id": request.asset.asset_id, **result}

    @router.post("/assets/inspect")
    async def inspect_asset_upload(
        asset_json: str = Form(...),
        asset_file: UploadFile = File(...),
        _: str = Depends(_require_admin),
    ):
        try:
            asset = ConfiguratorAssetCreate.model_validate(json.loads(asset_json))
        except (json.JSONDecodeError, ValidationError) as exc:
            raise HTTPException(status_code=422, detail="asset_json must contain a valid ConfiguratorAssetCreate payload") from exc

        if asset.format != "glb":
            raise HTTPException(status_code=422, detail="Binary inspection currently supports GLB assets only")
        if not (asset_file.filename or "").lower().endswith(".glb"):
            raise HTTPException(status_code=422, detail="Uploaded asset must use a .glb filename")

        payload = await asset_file.read(_MAX_UPLOAD_BYTES + 1)
        if len(payload) > _MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Asset exceeds the 200 MB upload limit")

        try:
            inspected = inspect_gltf_bytes(payload, filename=asset_file.filename)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        manifest_result = validate_asset_manifest(asset, [*inspected["mesh_names"], *inspected["node_names"]])
        structure_result = build_verified_asset_metadata(asset, inspected)
        valid = manifest_result["valid"] and structure_result["valid"]
        checksum = hashlib.sha256(payload).hexdigest()
        now = datetime.now(timezone.utc).isoformat()

        await db.configurator_assets.update_one(
            {"asset_id": asset.asset_id},
            {
                "$set": {
                    "file_size_bytes": len(payload),
                    "checksum_sha256": checksum,
                    "validation_passed": valid,
                    "published": False,
                    "updated_at": now,
                    "validation_errors": [*manifest_result["errors"], *structure_result["errors"]],
                    "validation_warnings": manifest_result["warnings"],
                    "inspected_structure": inspected,
                }
            },
            upsert=False,
        )

        return {
            "asset_id": asset.asset_id,
            "valid": valid,
            "checksum_sha256": checksum,
            "file_size_bytes": len(payload),
            "inspection": inspected,
            "manifest": manifest_result,
            "structure": structure_result,
        }

    @router.post("/assets")
    async def upsert_asset(
        asset: ConfiguratorAssetCreate,
        _: str = Depends(_require_admin),
    ):
        variant = await db.variants.find_one(
            {"variant_id": asset.variant_id},
            {"_id": 0, "model_id": 1, "brand_id": 1},
        )
        if not variant:
            raise HTTPException(status_code=404, detail="Variant not found")
        if variant.get("model_id") != asset.model_id or variant.get("brand_id") != asset.brand_id:
            raise HTTPException(status_code=422, detail="Asset model_id/brand_id does not match the variant")

        now = datetime.now(timezone.utc).isoformat()
        existing = await db.configurator_assets.find_one({"asset_id": asset.asset_id}, {"_id": 0})
        document = asset.model_dump(mode="json")
        document["created_at"] = existing.get("created_at", now) if existing else now
        document["updated_at"] = now
        document["published"] = False
        document["validation_passed"] = False

        await db.configurator_assets.replace_one(
            {"asset_id": asset.asset_id},
            document,
            upsert=True,
        )
        return ConfiguratorAsset(**document)

    @router.post("/assets/publish")
    async def publish_asset(
        request: AssetPublicationRequest,
        _: str = Depends(_require_admin),
    ):
        asset_doc = await db.configurator_assets.find_one({"asset_id": request.asset_id}, {"_id": 0})
        if not asset_doc:
            raise HTTPException(status_code=404, detail="Asset not found")
        asset = ConfiguratorAsset(**asset_doc)
        if request.publish:
            if not asset.is_publishable():
                raise HTTPException(status_code=422, detail="Asset does not satisfy publication gates")
            update = {"published": True, "updated_at": datetime.now(timezone.utc).isoformat()}
        else:
            update = {"published": False, "updated_at": datetime.now(timezone.utc).isoformat()}
        await db.configurator_assets.update_one({"asset_id": request.asset_id}, {"$set": update})
        return {"asset_id": request.asset_id, "published": request.publish}

    @router.post("/assets/assign")
    async def assign_asset(
        request: AssetAssignmentRequest,
        _: str = Depends(_require_admin),
    ):
        asset = await db.configurator_assets.find_one(
            {"asset_id": request.asset_id, "variant_id": request.variant_id, "published": True, "validation_passed": True},
            {"_id": 0, "asset_id": 1, "version": 1},
        )
        if not asset:
            raise HTTPException(status_code=422, detail="Only a published, validated asset for the same variant can be assigned")

        result = await db.variants.update_one(
            {"variant_id": request.variant_id},
            {"$set": {"configurator_asset_id": request.asset_id, "configurator_status": ConfiguratorStatus.AVAILABLE}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Variant not found")
        return {"variant_id": request.variant_id, "asset_id": request.asset_id, "configurator_status": ConfiguratorStatus.AVAILABLE}

    @router.post("/assets/unassign")
    async def unassign_asset(
        request: AssetAssignmentRequest,
        _: str = Depends(_require_admin),
    ):
        result = await db.variants.update_one(
            {"variant_id": request.variant_id, "configurator_asset_id": request.asset_id},
            {"$set": {"configurator_asset_id": None, "configurator_status": ConfiguratorStatus.COMING_SOON}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Variant/asset assignment not found")
        return {"variant_id": request.variant_id, "asset_id": None, "configurator_status": ConfiguratorStatus.COMING_SOON}

    return router


def mount_asset_admin_routes(app, db) -> None:
    """Mount admin-only asset management routes."""
    app.include_router(make_asset_admin_router(db))
