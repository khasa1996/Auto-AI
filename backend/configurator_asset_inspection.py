"""Inspect GLB/GLTF structure without trusting client-supplied mesh metadata."""

from __future__ import annotations

import json
import struct
from typing import Any, Dict, List, Optional

_GLB_MAGIC = b"glTF"
_GLB_VERSION = 2
_JSON_CHUNK_TYPE = 0x4E4F534A
_HEADER_SIZE = 12
_CHUNK_HEADER_SIZE = 8


def _unique_names(items: List[Dict[str, Any]], kind: str) -> List[str]:
    names = [str(item["name"]) for item in items if isinstance(item, dict) and str(item.get("name", "")).strip()]
    if len(names) != len(set(names)):
        raise ValueError(f"duplicate {kind} name")
    return names


def _read_glb_json(payload: bytes) -> Dict[str, Any]:
    if len(payload) < _HEADER_SIZE or payload[:4] != _GLB_MAGIC:
        raise ValueError("Not a valid GLB file")

    version, declared_length = struct.unpack_from("<II", payload, 4)
    if version != _GLB_VERSION:
        raise ValueError("GLB version 2 is required")
    if declared_length != len(payload):
        raise ValueError("GLB declared length does not match payload length")

    offset = _HEADER_SIZE
    while offset + _CHUNK_HEADER_SIZE <= len(payload):
        chunk_length, chunk_type = struct.unpack_from("<II", payload, offset)
        offset += _CHUNK_HEADER_SIZE
        end = offset + chunk_length
        if end > len(payload):
            raise ValueError("GLB chunk extends beyond payload")
        chunk = payload[offset:end]
        offset = end
        if chunk_type == _JSON_CHUNK_TYPE:
            try:
                document = json.loads(chunk.rstrip(b" \t\r\n").decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise ValueError("GLB JSON chunk is invalid") from exc
            if not isinstance(document, dict):
                raise ValueError("GLB JSON root must be an object")
            return document

    raise ValueError("GLB does not contain a JSON chunk")


def inspect_gltf_bytes(payload: bytes, filename: Optional[str] = None) -> Dict[str, Any]:
    """Return deterministic structural metadata from a GLB payload."""
    if not isinstance(payload, bytes):
        raise TypeError("GLB payload must be bytes")
    if filename and filename.lower().endswith(".gltf"):
        raise ValueError("Binary inspection requires a GLB payload")

    document = _read_glb_json(payload)
    asset = document.get("asset")
    if not isinstance(asset, dict) or asset.get("version") != "2.0":
        raise ValueError("GLTF asset version 2.0 is required")

    meshes = document.get("meshes", [])
    materials = document.get("materials", [])
    nodes = document.get("nodes", [])
    animations = document.get("animations", [])
    cameras = document.get("cameras", [])
    for collection, kind in (
        (meshes, "meshes"),
        (materials, "materials"),
        (nodes, "nodes"),
        (animations, "animations"),
        (cameras, "cameras"),
    ):
        if not isinstance(collection, list):
            raise ValueError(f"GLTF {kind} must be an array")

    material_names = _unique_names(materials, "material")
    pbr_material_names = [
        str(material["name"])
        for material in materials
        if isinstance(material, dict)
        and str(material.get("name", "")).strip()
        and isinstance(material.get("pbrMetallicRoughness"), dict)
    ]

    return {
        "format": "glb",
        "version": 2,
        "mesh_names": _unique_names(meshes, "mesh"),
        "node_names": _unique_names(nodes, "node"),
        "material_names": material_names,
        "pbr_material_names": pbr_material_names,
        "animation_names": _unique_names(animations, "animation"),
        "camera_names": _unique_names(cameras, "camera"),
        "mesh_count": len(meshes),
        "material_count": len(materials),
        "node_count": len(nodes),
        "animation_count": len(animations),
        "camera_count": len(cameras),
    }
