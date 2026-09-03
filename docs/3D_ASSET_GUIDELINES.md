# 3D Asset Guidelines

## Accepted Formats

| Format | Extension | Status |
|---|---|---|
| Binary GLTF | `.glb` | ACCEPTED |
| Text GLTF | `.gltf` (+ .bin + textures) | ACCEPTED |
| Everything else | `.jpg`, `.png`, `.mp4`, `.obj`, `.fbx`, etc. | REJECTED |

A `.jpg` or any image file is **never** a 3D asset. Auto AI India does not use rotating photographs.

## Provenance Classification

| Value | Meaning | May Publish? |
|---|---|---|
| `OEM_AUTHORIZED` | Provided/approved by the vehicle manufacturer | YES |
| `AUTO_AI_LICENSED` | Created by Auto AI India with proper rights | YES |
| `LICENSED_THIRD_PARTY` | Licensed from a verified 3D asset provider | YES |
| `AI_GENERATED_CONCEPT` | AI-generated, not OEM-accurate | NO |
| `UNKNOWN` | Provenance not established | NO |

An AI-generated concept model must never be presented as a production configurator asset for a specific vehicle.

## Required Asset Metadata

Every published asset must have:
- `asset_id` — unique identifier
- `variant_id` — exact variant it represents
- `url` — HTTPS CDN URL ending in `.glb` or `.gltf`
- `version` — semantic version string
- `provenance` — one of the publishable values above
- `license_name` — license under which the asset is used
- `publisher` — who created/provided the asset
- `checksum_sha256` — for integrity verification
- `paint_material_names` — list of semantic material names for paint changes
- `supported_interactions` — list of animation clip names present

## Semantic Mesh Structure

Production assets should follow this structure:

```
Vehicle (root)
├── Exterior
│   ├── Body              — MAT_BODY_PAINT
│   ├── Hood              — MAT_BODY_PAINT (animated: Hood_Open/Close)
│   ├── Door_FL           — MAT_BODY_PAINT (animated: Door_FL_Open/Close)
│   ├── Door_FR           — MAT_BODY_PAINT (animated)
│   ├── Door_RL           — MAT_BODY_PAINT (animated)
│   ├── Door_RR           — MAT_BODY_PAINT (animated)
│   ├── Boot              — MAT_BODY_PAINT (animated: Boot_Open/Close)
│   ├── Roof              — MAT_BODY_PAINT (or MAT_GLASS for panoramic)
│   ├── Glass             — MAT_GLASS
│   ├── Trim              — MAT_BLACK_TRIM
│   ├── Chrome            — MAT_CHROME
│   └── Mirrors           — MAT_BODY_PAINT
├── Wheels
│   ├── Wheel_FL          — MAT_WHEEL + MAT_TYRE
│   ├── Wheel_FR
│   ├── Wheel_RL
│   └── Wheel_RR
├── Lighting
│   ├── Headlight_L       — MAT_HEADLIGHT (emissive)
│   ├── Headlight_R       — MAT_HEADLIGHT
│   ├── DRL_L             — MAT_DRL
│   ├── DRL_R             — MAT_DRL
│   ├── Taillight_L       — MAT_TAILLIGHT
│   ├── Taillight_R       — MAT_TAILLIGHT
│   ├── Indicator_FL      — MAT_INDICATOR_L
│   ├── Indicator_RL      — MAT_INDICATOR_L
│   ├── Indicator_FR      — MAT_INDICATOR_R
│   └── Indicator_RR      — MAT_INDICATOR_R
├── Interior
│   ├── Dashboard         — MAT_DASHBOARD
│   ├── Steering          — MAT_LEATHER or MAT_FABRIC
│   ├── Seats             — MAT_LEATHER or MAT_FABRIC
│   ├── DoorPanels        — MAT_FABRIC
│   └── Trim              — MAT_BLACK_TRIM
└── Accessories           — varies per accessory
```

## Performance Targets

| Device | Target Polycount | Texture Budget | File Size |
|---|---|---|---|
| Desktop (LOD0) | ≤ 500k triangles | ≤ 256 MB | ≤ 50 MB |
| Tablet (LOD1) | ≤ 200k triangles | ≤ 128 MB | ≤ 25 MB |
| Mobile (LOD2) | ≤ 80k triangles | ≤ 64 MB | ≤ 10 MB |

- Use Draco compression for geometry (reduces size 6–10×).
- Use KTX2/Basis for textures where supported.
- Assets larger than 200 MB are rejected by the validation layer.

## Current Asset Availability

**Zero verified production assets exist.** Every vehicle currently shows "3D Configurator Coming Soon". This is the correct state. The architecture to add real assets is in place.

To add a production asset, an admin must:
1. Upload the GLB/GLTF to the CDN
2. Create a `configurator_assets` record via admin API with full provenance metadata
3. Pass validation (URL, extension, checksum, provenance, license)
4. Admin reviews and approves
5. `published = true` is set
6. The variant's `configurator_status` is updated to `AVAILABLE`
