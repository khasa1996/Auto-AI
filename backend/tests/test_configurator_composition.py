"""Regression tests for the production configurator ASGI composition contract."""

from fastapi import FastAPI

from configurator_composition import mount_configurator_router


class _FakeDatabase:
    """Minimal database surface required while mounting the router."""


def test_mount_configurator_router_registers_versioned_routes() -> None:
    app = FastAPI()

    mount_configurator_router(app, _FakeDatabase())

    paths = {route.path for route in app.routes}

    assert "/api/v1/brands" in paths
    assert "/api/v1/models" in paths
    assert "/api/v1/variants" in paths
    assert "/api/v1/configurator/validate" in paths
    assert "/api/v1/configurator/price" in paths
    assert "/api/v1/configurations" in paths
