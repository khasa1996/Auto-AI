"""Immutable configurator asset revisions and safe rollback APIs."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field


class AssetRollbackRequest(BaseModel):
    revision_id: str = Field(..., min_length=8, max_length=100)


async def _require_admin(authorization: Optional[str] = Header(None)) -> str:
    from server import require_admin

    return await require_admin(authorization)


def snapshot_asset(asset: dict, *, revision_id: str, snapshot_type: str, created_at: str) -> dict:
    """Create an immutable revision document without Mongo's internal id."""
    snapshot = {key: value for key, value in asset.items() if key != "_id"}
    snapshot["revision_id"] = revision_id
    snapshot["snapshot_type"] = snapshot_type
    snapshot["revision_created_at"] = created_at
    return snapshot


def _public_revision(revision: dict) -> dict:
    """Return revision metadata without duplicating the large inspection payload."""
    return {
        "revision_id": revision.get("revision_id"),
        "asset_id": revision.get("asset_id"),
        "variant_id": revision.get("variant_id"),
        "version": revision.get("version"),
        "storage_key": revision.get("storage_key"),
        "checksum_sha256": revision.get("checksum_sha256"),
        "file_size_bytes": revision.get("file_size_bytes"),
        "validation_passed": bool(revision.get("validation_passed")),
        "admin_reviewed": bool(revision.get("admin_reviewed")),
        "published": bool(revision.get("published")),
        "storage_status": revision.get("storage_status"),
        "review_notes": revision.get("review_notes"),
        "snapshot_type": revision.get("snapshot_type"),
        "revision_created_at": revision.get("revision_created_at"),
    }


def make_asset_version_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/api/v1/admin/configurator", tags=["configurator-asset-versioning"])

    @router.post("/assets/{asset_id}/prepare-version")
    async def prepare_asset_version(asset_id: str, _: str = Depends(_require_admin)):
        current = await db.configurator_assets.find_one({"asset_id": asset_id}, {"_id": 0})
        if not current:
            raise HTTPException(status_code=404, detail="Asset not found")
        if not current.get("storage_key") or not current.get("checksum_sha256"):
            return {"asset_id": asset_id, "revision_id": None, "snapshotted": False}

        now = datetime.now(timezone.utc).isoformat()
        revision_id = f"rev-{uuid4().hex}"
        await db.configurator_asset_versions.insert_one(
            snapshot_asset(
                current,
                revision_id=revision_id,
                snapshot_type="UPLOAD_SOURCE",
                created_at=now,
            )
        )
        return {"asset_id": asset_id, "revision_id": revision_id, "snapshotted": True}

    @router.get("/assets/{asset_id}/versions")
    async def list_asset_versions(asset_id: str, _: str = Depends(_require_admin)):
        revisions = await db.configurator_asset_versions.find(
            {"asset_id": asset_id},
            {"_id": 0},
        ).sort([("revision_created_at", -1)]).to_list(200)
        return {
            "asset_id": asset_id,
            "versions": [_public_revision(revision) for revision in revisions],
        }

    @router.post("/assets/{asset_id}/rollback")
    async def rollback_asset(
        asset_id: str,
        request: AssetRollbackRequest,
        _: str = Depends(_require_admin),
    ):
        current = await db.configurator_assets.find_one({"asset_id": asset_id}, {"_id": 0})
        if not current:
            raise HTTPException(status_code=404, detail="Asset not found")

        revision = await db.configurator_asset_versions.find_one(
            {
                "asset_id": asset_id,
                "revision_id": request.revision_id,
                "validation_passed": True,
                "admin_reviewed": True,
            },
            {"_id": 0},
        )
        if not revision:
            raise HTTPException(
                status_code=422,
                detail="Rollback target must be a technically validated and admin-reviewed revision",
            )

        if not revision.get("storage_key") or not revision.get("checksum_sha256"):
            raise HTTPException(status_code=422, detail="Rollback target does not contain a verified stored asset")

        now = datetime.now(timezone.utc).isoformat()
        source_revision = snapshot_asset(
            current,
            revision_id=f"rev-{uuid4().hex}",
            snapshot_type="ROLLBACK_SOURCE",
            created_at=now,
        )
        await db.configurator_asset_versions.insert_one(source_revision)

        restored = {key: value for key, value in revision.items() if key not in {"revision_id", "snapshot_type", "revision_created_at"}}
        restored["asset_id"] = asset_id
        restored["created_at"] = current.get("created_at", now)
        restored["updated_at"] = now
        restored["active_revision_id"] = request.revision_id
        restored["published"] = bool(revision.get("published"))
        restored["storage_status"] = "PUBLISHED" if restored["published"] else "VALIDATED"

        await db.configurator_assets.replace_one({"asset_id": asset_id}, restored, upsert=False)
        return {
            "asset_id": asset_id,
            "active_revision_id": request.revision_id,
            "version": restored.get("version"),
            "storage_key": restored.get("storage_key"),
            "published": restored["published"],
            "rolled_back_at": now,
        }

    return router


def mount_asset_version_routes(app, db):
    """Mount immutable asset version history and rollback endpoints."""
    app.include_router(make_asset_version_router(db))
