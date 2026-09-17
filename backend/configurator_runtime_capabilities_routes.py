"""Runtime capability contract API for the production 3D configurator."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from configurator_runtime_capabilities import build_runtime_capability_contract


def make_runtime_capabilities_router(db: Any) -> APIRouter:
    router = APIRouter(prefix="/api/v1", tags=["configurator-runtime"])

    @router.get("/configurator/{variant_id}/capabilities")
    async def runtime_capabilities(variant_id: str) -> Dict[str, Any]:
        try:
            return await build_runtime_capability_contract(db, variant_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    return router
