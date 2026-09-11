"""Composition helpers for mounting the Auto AI India configurator."""

from collections.abc import Callable
from typing import Optional

from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorDatabase

from configurator_routes import make_configurator_router


OptionalUserPhone = Optional[Callable[..., object]]


def mount_configurator_router(
    app: FastAPI,
    db: AsyncIOMotorDatabase,
    auth_dependency: OptionalUserPhone = None,
) -> FastAPI:
    """Mount the canonical configurator API onto the existing FastAPI app."""
    app.include_router(make_configurator_router(db, auth_dependency))
    return app
