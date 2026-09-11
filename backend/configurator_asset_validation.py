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


def validate_asset_manifest(asset: ConfiguratorAssetCreate, mesh_names: Iterable[str]) -> Dict[str, Any]:
    """Validate metadata and exact mesh mappings before publication."""
    errors: List[str] = []
    warnings: List[str] = []
    available_meshes = {str(name) for name in mesh_names if str(name).strip()}

    if not asset.is_publishable():
        errors.append("Asset is not publishable: provenance, validation, admin review, license and publisher are all required")
    if asset.provenance == AssetProvenance.AI_GENERATED_CONCEPT:
        errors.append("AI-generated concept assets cannot be published as production vehicle assets")

    unknown_interactions = sorted(set(asset.supported_interactions) - _ALLOWED_INTERACTIONS)
    if unknown_interactions:
        errors.append("Unsupported interaction names: " + ", ".join(unknown_interactions))

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

    duplicate_meshes = [mesh for mesh in available_meshes if sum(mesh in values for values in asset.wheel_mesh_names.values()) + sum(mesh in meshes for meshes in asset.option_mesh_names.values()) > 1]
    if duplicate_meshes:
        warnings.append("Some optional mappings share mesh names; verify that this is intentional")

    return {"valid": not errors, "errors": errors, "warnings": warnings}
