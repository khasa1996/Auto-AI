"""Composition helpers for mounting the Auto AI India configurator."""

from collections.abc import Callable
from typing import Optional

from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorDatabase

from configurator_routes import make_configurator_router
from configurator_premium_routes import mount_premium_configurator_routes
from configurator_asset_admin_routes import mount_asset_admin_routes
from configurator_asset_versioning import mount_asset_version_routes
from configurator_hotspots import mount_hotspot_routes

OptionalUserPhone = Optional[Callable[..., object]]


def mount_configurator_router(
    app: FastAPI,
    db: AsyncIOMotorDatabase,
    auth_dependency: OptionalUserPhone = None,
) -> FastAPI:
    """Mount the canonical configurator API onto the existing FastAPI app."""
    app.include_router(make_configurator_router(db, auth_dependency))
    mount_premium_configurator_routes(app, db, auth_dependency)
    mount_asset_admin_routes(app, db)
    mount_asset_version_routes(app, db)
    mount_hotspot_routes(app, db)
    return app
