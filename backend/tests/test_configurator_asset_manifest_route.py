"""Regression tests for the complete configurator runtime asset manifest."""

from typing import Any, Dict, Optional

from fastapi import FastAPI
from fastapi.testclient import TestClient

from configurator_routes import make_configurator_router
from vehicle_schemas import ConfiguratorStatus


class FakeCollection:
    def __init__(self, documents: list[Optional[Dict[str, Any]]]) -> None:
        self.documents = iter(documents)
        self.queries: list[Dict[str, Any]] = []

    async def find_one(
        self,
        query: Dict[str, Any],
        projection: Optional[Dict[str, int]] = None,
    ) -> Optional[Dict[str, Any]]:
        self.queries.append(query)
        return next(self.documents)


class FakeDatabase:
    def __init__(self) -> None:
        self.variants = FakeCollection([
            {
                "configurator_status": ConfiguratorStatus.AVAILABLE,
                "configurator_asset_id": "asset-1",
            }
        ])
        self.configurator_assets = FakeCollection([
            {
                "asset_id": "asset-1",
                "variant_id": "variant-1",
                "url": "https://cdn.example.com/model.glb",
                "format": "glb",
                "version": "v1",
                "lod_level": 0,
                "published": True,
                "validation_passed": True,
                "supported_interactions": ["camera_exterior", "doors"],
                "paint_material_names": ["BodyPaint"],
                "interior_material_names": ["SeatLeather"],
                "interior_material_mappings": {"black": ["SeatLeather"]},
                "wheel_mesh_names": {"alloy": ["Wheel"]},
                "option_mesh_names": {"roof": {"sunroof": ["Sunroof"]}},
                "camera_preset_names": ["exterior", "interior"],
                "interaction_animation_names": {"doors": "door-open"},
            }
        ])


def test_asset_route_returns_complete_runtime_manifest() -> None:
    app = FastAPI()
    database = FakeDatabase()
    app.include_router(make_configurator_router(database))
    client = TestClient(app)

    response = client.get("/api/v1/configurator/variant-1/asset")

    assert response.status_code == 200
    asset = response.json()["asset"]
    assert asset["interior_material_names"] == ["SeatLeather"]
    assert asset["interior_material_mappings"] == {"black": ["SeatLeather"]}
    assert asset["camera_preset_names"] == ["exterior", "interior"]
    assert asset["interaction_animation_names"] == {"doors": "door-open"}
    assert database.configurator_assets.queries[-1]["variant_id"] == "variant-1"
