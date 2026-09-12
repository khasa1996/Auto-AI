"""Cross-check inspected GLB structure against the declared asset manifest."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List

from configurator_schemas import ConfiguratorAssetCreate

_INTERACTION_TOKENS = {
    "doors": ("door", "doors"),
    "hood": ("hood", "bonnet"),
    "boot": ("boot", "trunk"),
    "frunk": ("frunk",),
    "sunroof": ("sunroof", "roof"),
    "headlights": ("headlight", "headlights"),
    "drl": ("drl",),
    "taillights": ("taillight", "taillights"),
    "fog_lights": ("fog", "foglight", "fog_lights"),
    "left_indicator": ("left_indicator", "indicator_left", "leftindicator"),
    "right_indicator": ("right_indicator", "indicator_right", "rightindicator"),
    "hazard": ("hazard",),
    "interior_lights": ("interior_light", "interior_lights"),
    "camera_exterior": ("camera_exterior",),
    "camera_interior": ("camera_interior",),
}


def _missing(values: Iterable[str], available: Iterable[str]) -> List[str]:
    available_set = set(available)
    return sorted({str(value) for value in values if str(value) and str(value) not in available_set})


def _required_animation_tokens(interaction: str) -> tuple[str, ...]:
    return _INTERACTION_TOKENS.get(interaction, (interaction,))


def _has_animation(interaction: str, animation_names: Iterable[str]) -> bool:
    names = [name.lower() for name in animation_names]
    return any(token in name for token in _required_animation_tokens(interaction) for name in names)


def build_verified_asset_metadata(asset: ConfiguratorAssetCreate, inspected: Dict[str, Any]) -> Dict[str, Any]:
    """Cross-check manifest mappings against names extracted from the actual GLB."""
    errors: List[str] = []
    mesh_names = inspected.get("mesh_names", [])
    node_names = inspected.get("node_names", [])
    material_names = inspected.get("material_names", [])
    animation_names = inspected.get("animation_names", [])

    if inspected.get("format") != "glb":
        errors.append("Only GLB assets can be verified by binary ingestion")

    available_geometry_names = list(dict.fromkeys([*mesh_names, *node_names]))
    mapped_meshes = [*asset.wheel_mesh_names.values(), *(mesh for meshes in asset.option_mesh_names.values() for mesh in meshes)]
    missing_meshes = _missing(mapped_meshes, available_geometry_names)
    missing_materials = _missing(asset.paint_material_names, material_names)

    if missing_meshes:
        errors.append("Manifest references missing meshes: " + ", ".join(missing_meshes))
    if missing_materials:
        errors.append("Manifest references missing paint materials: " + ", ".join(missing_materials))

    missing_animations = sorted(
        interaction
        for interaction in asset.supported_interactions
        if not _has_animation(interaction, animation_names)
    )
    if missing_animations:
        errors.append("Manifest declares interactions without matching animations: " + ", ".join(missing_animations))

    return {
        "valid": not errors,
        "errors": errors,
        "missing_meshes": missing_meshes,
        "missing_materials": missing_materials,
        "missing_animations": missing_animations,
        "inspected": {
            "mesh_count": inspected.get("mesh_count", len(mesh_names)),
            "node_count": inspected.get("node_count", len(node_names)),
            "material_count": inspected.get("material_count", len(material_names)),
            "animation_count": inspected.get("animation_count", len(animation_names)),
        },
    }
