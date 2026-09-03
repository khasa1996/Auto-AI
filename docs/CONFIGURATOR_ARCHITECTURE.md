# Configurator Architecture

## Vehicle Data Hierarchy

```
Brand
  └── Model
        └── Variant
              ├── VariantPricing      (city-aware pricing)
              ├── VariantColors       (purchasable paint options)
              ├── VariantWheels       (purchasable wheel options)
              ├── VariantInteriors    (purchasable interior options)
              ├── ConfiguratorAsset   (GLB/GLTF metadata)
              ├── ConfiguratorOptions (roof, accessories, trim)
              └── ConfiguratorRules   (compatibility rules)
```

City is **not** part of vehicle identity. City-specific data:
```
City → variant_pricing.city_pricing[]
     → dealer_inventory (Phase 3+)
     → offers (Phase 3+)
```

## Configuration State Model

```
ConfigurationState
  ├── PurchasableConfiguration    ← affects price
  │     ├── variantId
  │     ├── paintId
  │     ├── wheelId
  │     ├── interiorId
  │     ├── roofId
  │     └── accessoryIds[]
  └── InteractionState            ← does NOT affect price
        ├── doors (FL/FR/RL/RR)
        ├── hoodOpen
        ├── bootOpen
        ├── frunkOpen
        ├── sunroofOpen
        ├── lighting (headlights/DRL/taillights/indicators/hazard/interior)
        ├── cameraPreset
        └── autoRotate
```

## 3D Engine Module Separation

```
ConfiguratorViewer.jsx      ← Canvas + scene orchestration
  VehicleModel.jsx          ← GLB/GLTF load + paint material system
  AnimationController.jsx   ← Semantic animation playback
  LightingController.jsx    ← Headlights, DRL, indicators, hazard
  CameraPresets.jsx         ← Named camera positions + OrbitControls
  AssetLoader.jsx           ← Suspense + error boundary + unavailable state
```

## Asset Status Flow

```
Vehicle in database
  ↓
configurator_status = COMING_SOON  (default, no verified asset)
  ↓
Admin uploads GLB/GLTF
  ↓
Validation: HTTPS, .glb/.gltf extension, size, checksum
  ↓
Provenance assigned: OEM_AUTHORIZED / AUTO_AI_LICENSED / LICENSED_THIRD_PARTY
  ↓
Admin reviews and approves
  ↓
published = true, validation_passed = true
  ↓
configurator_status = AVAILABLE
  ↓
Live 3D Configurator enabled
```

## Material System

Paint materials are identified by **semantic names declared in asset metadata**, not guessed by string matching.

```json
{
  "paintMaterialNames": ["MAT_BODY_PAINT", "MAT_BONNET_PAINT"]
}
```

The configurator reads this list from the asset record and only applies color changes to those exact material names. This prevents fragile substring matching on `"body"`, `"paint"`, `"shell"` etc.

Standard semantic material names:
- `MAT_BODY_PAINT` — main body paint surface
- `MAT_BLACK_TRIM` — black plastic trim
- `MAT_CHROME` — chrome/silver accents
- `MAT_GLASS` — windows
- `MAT_LEATHER` — leather seat surfaces
- `MAT_FABRIC` — fabric seat surfaces
- `MAT_DASHBOARD` — dashboard panel
- `MAT_WHEEL` — wheel face
- `MAT_TYRE` — tyre sidewall
- `MAT_HEADLIGHT` — headlight lens (emissive when on)
- `MAT_DRL` — DRL strip (emissive)
- `MAT_TAILLIGHT` — taillight lens (emissive)
- `MAT_INDICATOR_L` / `MAT_INDICATOR_R` — indicator lenses (blinking emissive)

## Animation Contract

All animation clips in a production GLB must follow these exact names:

| Interaction | Open Clip | Close Clip |
|---|---|---|
| Front-left door | `Door_FL_Open` | `Door_FL_Close` |
| Front-right door | `Door_FR_Open` | `Door_FR_Close` |
| Rear-left door | `Door_RL_Open` | `Door_RL_Close` |
| Rear-right door | `Door_RR_Open` | `Door_RR_Close` |
| Hood | `Hood_Open` | `Hood_Close` |
| Boot | `Boot_Open` | `Boot_Close` |
| Sunroof | `Sunroof_Open` | `Sunroof_Close` |
| Frunk (EVs) | `Frunk_Open` | `Frunk_Close` |

Missing animations are silently ignored. No fake movement substituted.

## Pricing Formula

```
base_ex_showroom
+ Σ(option price deltas)
= subtotal_ex_showroom
+ rto (city-specific)
+ insurance_approx (city-specific)
+ tcs
+ other_charges
- Σ(offer discounts)
= estimated_on_road
```

All components come from the database. None are invented.
