"""Validation rules for publishable Auto AI India 3D asset manifests."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List

from configurator_schemas import AssetProvenance, ConfiguratorAssetCreate

_ALLOWED_INTERACTIONS = {
    "doors",
    "hood",
    "boot",
    "frunk",
    "sunroof",
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

_CAMERA_INTERACTIONS = {"camera_exterior", "camera_interior"}
_ANIMATED_INTERACTIONS = _ALLOWED_INTERACTIONS - _CAMERA_INTERACTIONS
_MAX_TRIANGLES = 1_500_000
_MAX_TEXTURE_MEMORY_BYTES = 256 * 1024 * 1024


def validate_asset_manifest(
    asset: ConfiguratorAssetCreate,
    mesh_names: Iterable[str],
    *,
    material_names: Iterable[str] = (),
    pbr_material_names: Iterable[str] = (),
    animation_names: Iterable[str] = (),
    camera_names: Iterable[str] = (),
) -> Dict[str, Any]:
    """Validate metadata and exact capability mappings against inspected GLTF names."""
    errors: List[str] = []
    warnings: List[str] = []
    available_meshes = {str(name) for name in mesh_names if str(name).strip()}
    available_materials = {str(name) for name in material_names if str(name).strip()}
    available_pbr_materials = {str(name) for name in pbr_material_names if str(name).strip()}
    available_animations = {str(name) for name in animation_names if str(name).strip()}
    available_cameras = {str(name) for name in camera_names if str(name).strip()}

    if not asset.is_publishable():
        errors.append("Asset is not publishable: provenance, validation, admin review, license and publisher are all required")
    if asset.provenance == AssetProvenance.AI_GENERATED_CONCEPT:
        errors.append("AI-generated concept assets cannot be published as production vehicle assets")

    if not asset.paint_material_names:
        errors.append("Production asset must declare at least one paint material binding")
    elif not available_materials:
        errors.append("Paint material bindings cannot be verified without inspected material names")
    else:
        missing = [name for name in asset.paint_material_names if name not in available_materials]
        if missing:
            errors.append("Paint material bindings reference missing materials: " + ", ".join(missing))
        non_pbr = [name for name in asset.paint_material_names if name not in available_pbr_materials]
        if non_pbr:
            errors.append("Paint materials must use GLTF PBR metallic-roughness materials: " + ", ".join(non_pbr))

    if not asset.interior_material_names:
        errors.append("Production asset must declare at least one interior material binding")
    elif not available_materials:
        errors.append("Interior material bindings cannot be verified without inspected material names")
    else:
        missing = [name for name in asset.interior_material_names if name not in available_materials]
        if missing:
            errors.append("Interior material bindings reference missing materials: " + ", ".join(missing))

    if not asset.camera_preset_names:
        errors.append("Production asset must declare camera presets")
    elif not available_cameras:
        errors.append("Camera presets cannot be verified without inspected camera names")
    else:
        missing_cameras = [name for name in asset.camera_preset_names if name not in available_cameras]
        if missing_cameras:
            errors.append("Camera presets reference missing cameras: " + ", ".join(missing_cameras))
        if "camera_exterior" in asset.supported_interactions and not any(
            "exterior" in name.lower() or name.lower() in {"front", "rear", "side"}
            for name in asset.camera_preset_names
        ):
            errors.append("Exterior camera capability requires at least one exterior camera preset")
        if "camera_interior" in asset.supported_interactions and not any(
            "interior" in name.lower() for name in asset.camera_preset_names
        ):
            errors.append("Interior camera capability requires an interior camera preset")

    unknown_interactions = sorted(set(asset.supported_interactions) - _ALLOWED_INTERACTIONS)
    if unknown_interactions:
        errors.append("Unsupported interaction names: " + ", ".join(unknown_interactions))

    for interaction in sorted(set(asset.supported_interactions) & _ANIMATED_INTERACTIONS):
        mapping = asset.interaction_animation_names.get(interaction)
        if not mapping or not mapping.get("open") or not mapping.get("close"):
            errors.append(f"Interaction '{interaction}' requires both open and close animation mappings")
            continue
        if not available_animations:
            errors.append(f"Interaction '{interaction}' cannot be verified without inspected animation names")
            continue
        missing_animations = [
            animation_name
            for animation_name in (mapping["open"], mapping["close"])
            if animation_name not in available_animations
        ]
        if missing_animations:
            errors.append(
                f"Interaction '{interaction}' references missing animations: "
                + ", ".join(missing_animations)
            )

    for option_id, mesh_name in asset.wheel_mesh_names.items():
        if mesh_name not in available_meshes:
            errors.append(f"Wheel mapping '{option_id}' references missing mesh '{mesh_name}'")

    for option_id, mapped_meshes in asset.option_mesh_names.items():
        if not mapped_meshes:
            errors.append(f"Option mapping '{option_id}' must contain at least one mesh")
            continue
        missing = [mesh for mesh in mapped_meshes if mesh not in available_meshes]
        if missing:
            errors.append(f"Option mapping '{option_id}' references missing meshes: {', '.join(missing)}")

    duplicate_meshes = [
        mesh
        for mesh in available_meshes
        if sum(mesh in values for values in asset.wheel_mesh_names.values())
        + sum(mesh in meshes for meshes in asset.option_mesh_names.values())
        > 1
    ]
    if duplicate_meshes:
        warnings.append("Some optional mappings share mesh names; verify that this is intentional")

    return {"valid": not errors, "errors": errors, "warnings": warnings}


def validate_asset_quality(
    asset: ConfiguratorAssetCreate,
    *,
    triangle_count: int,
    texture_memory_bytes: int,
) -> Dict[str, Any]:
    """Enforce runtime geometry and texture-memory budgets before publication."""
    errors: List[str] = []
    warnings: List[str] = []

    if triangle_count < 0:
        errors.append("Triangle count cannot be negative")
    elif triangle_count > _MAX_TRIANGLES:
        errors.append(
            f"Triangle count {triangle_count:,} exceeds the production budget of {_MAX_TRIANGLES:,}"
        )

    if texture_memory_bytes < 0:
        errors.append("Texture memory cannot be negative")
    elif texture_memory_bytes > _MAX_TEXTURE_MEMORY_BYTES:
        errors.append(
            "Texture memory "
            f"{texture_memory_bytes / (1024 * 1024):.1f} MiB exceeds the production budget of "
            f"{_MAX_TEXTURE_MEMORY_BYTES / (1024 * 1024):.0f} MiB"
        )

    if asset.lod_level.value == "LOD0" and (triangle_count > 500_000 or texture_memory_bytes > 128 * 1024 * 1024):
        warnings.append("LOD0 exceeds the preferred interactive runtime budget; provide lower-cost LODs for mobile")

    return {"valid": not errors, "errors": errors, "warnings": warnings}
