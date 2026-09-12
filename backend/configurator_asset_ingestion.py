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
}

_LIGHTING_MATERIALS = {
    "headlights": ("MAT_HEADLIGHT",),
    "drl": ("MAT_DRL",),
    "taillights": ("MAT_TAILLIGHT",),
    "fog_lights": ("MAT_FOGLIGHT",),
    "left_indicator": ("MAT_INDICATOR_L",),
    "right_indicator": ("MAT_INDICATOR_R",),
    "hazard": ("MAT_INDICATOR_L", "MAT_INDICATOR_R"),
    "interior_lights": ("MAT_INTERIOR_LIGHT",),
}

_NON_ANIMATED_INTERACTIONS = {
    "headlights",
    "drl",
    "taillights",
    "fog_lights",
    "left_indicator",
    "right_indicator",
    "hazard",
    "interior_lights",
    "camera_exterior",
    "camera_interior",
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

    normalized_materials = {str(name).upper() for name in material_names}
    missing_animations: List[str] = []
    missing_lighting_materials: List[str] = []
    for interaction in asset.supported_interactions:
        if interaction in _NON_ANIMATED_INTERACTIONS:
            required_materials = _LIGHTING_MATERIALS.get(interaction, ())
            missing_lighting_materials.extend(
                material for material in required_materials if material.upper() not in normalized_materials
            )
            continue
        if not _has_animation(interaction, animation_names):
            missing_animations.append(interaction)

    if missing_animations:
        errors.append("Manifest declares interactions without matching animations: " + ", ".join(sorted(missing_animations)))
    if missing_lighting_materials:
        errors.append("Manifest declares lighting interactions without matching materials: " + ", ".join(sorted(set(missing_lighting_materials))))

    return {
        "valid": not errors,
        "errors": errors,
        "missing_meshes": missing_meshes,
        "missing_materials": missing_materials,
        "missing_animations": sorted(missing_animations),
        "missing_lighting_materials": sorted(set(missing_lighting_materials)),
        "inspected": {
            "mesh_count": inspected.get("mesh_count", len(mesh_names)),
            "node_count": inspected.get("node_count", len(node_names)),
            "material_count": inspected.get("material_count", len(material_names)),
            "animation_count": inspected.get("animation_count", len(animation_names)),
        },
    }
