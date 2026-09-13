import json
import struct

import pytest

from configurator_asset_inspection import inspect_gltf_bytes


def make_glb(gltf):
    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_padding = (-len(json_bytes)) % 4
    json_bytes += b" " * json_padding
    total_length = 12 + 8 + len(json_bytes)
    return b"glTF" + struct.pack("<II", 2, total_length) + struct.pack("<II", len(json_bytes), 0x4E4F534A) + json_bytes


def test_inspection_extracts_mesh_material_animation_camera_and_pbr_names():
    payload = make_glb(
        {
            "asset": {"version": "2.0"},
            "nodes": [
                {"name": "Body"},
                {"name": "Wheel_FL", "mesh": 0},
                {"name": "Wheel_FR", "mesh": 0},
            ],
            "meshes": [{"name": "WheelMesh"}],
            "materials": [
                {"name": "BODY_PAINT", "pbrMetallicRoughness": {"metallicFactor": 0.0, "roughnessFactor": 0.35}},
                {"name": "INTERIOR"},
            ],
            "animations": [{"name": "OpenDoors"}, {"name": "OpenSunroof"}],
            "cameras": [{"name": "front"}, {"name": "interior"}],
        }
    )

    result = inspect_gltf_bytes(payload, filename="car.glb")

    assert result["format"] == "glb"
    assert result["version"] == 2
    assert result["mesh_names"] == ["WheelMesh"]
    assert result["node_names"] == ["Body", "Wheel_FL", "Wheel_FR"]
    assert result["material_names"] == ["BODY_PAINT", "INTERIOR"]
    assert result["pbr_material_names"] == ["BODY_PAINT"]
    assert result["animation_names"] == ["OpenDoors", "OpenSunroof"]
    assert result["camera_names"] == ["front", "interior"]


def test_inspection_rejects_invalid_glb_header():
    with pytest.raises(ValueError, match="valid GLB"):
        inspect_gltf_bytes(b"not-a-glb", filename="car.glb")


def test_inspection_rejects_gltf_version_other_than_two():
    payload = b"glTF" + struct.pack("<II", 1, 12)
    with pytest.raises(ValueError, match="version 2"):
        inspect_gltf_bytes(payload, filename="car.glb")


def test_inspection_rejects_json_with_duplicate_named_meshes():
    payload = make_glb(
        {
            "asset": {"version": "2.0"},
            "meshes": [{"name": "Body"}, {"name": "Body"}],
        }
    )

    with pytest.raises(ValueError, match="duplicate mesh"):
        inspect_gltf_bytes(payload, filename="car.glb")
