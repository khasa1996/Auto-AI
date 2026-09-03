# Auto AI India — 3D Configurator

> **Status key used throughout these docs:**
> - `IMPLEMENTED` — built, tested, production-ready at foundation level
> - `FOUNDATION` — architecture defined, awaiting real data or Phase 3+ work
> - `PLANNED` — design intent documented, not yet started

---

## What Is the Configurator?

The Auto AI India configurator is a real-time 3D vehicle configuration system. It uses genuine GLB/GLTF 3D assets rendered via React Three Fiber. It is **not** a 360° photo viewer, image flipper, or slideshow.

---

## What Exists After Phase 2

### Backend (IMPLEMENTED)

| Component | File | Status |
|---|---|---|
| Vehicle schemas (Brand/Model/Variant) | `backend/vehicle_schemas.py` | IMPLEMENTED |
| Configurator schemas (assets, rules, config state) | `backend/configurator_schemas.py` | IMPLEMENTED |
| Pricing engine | `backend/pricing_engine.py` | IMPLEMENTED |
| Rules engine | `backend/rules_engine.py` | IMPLEMENTED |
| API routes (`/api/v1/*`) | `backend/configurator_routes.py` | IMPLEMENTED |
| MongoDB indexes (21 new) | `backend/server.py` | IMPLEMENTED |
| Tests (38 offline unit tests) | `backend/tests/test_phase2.py` | IMPLEMENTED |

### Frontend (FOUNDATION)

| Component | File | Status |
|---|---|---|
| Configurator store (Zustand) | `frontend/src/state/configuratorStore.js` | IMPLEMENTED |
| Vehicle model loader (GLB/GLTF) | `frontend/src/three/VehicleModel.jsx` | IMPLEMENTED |
| Animation controller | `frontend/src/three/AnimationController.jsx` | FOUNDATION |
| Lighting controller | `frontend/src/three/LightingController.jsx` | IMPLEMENTED |
| Camera presets | `frontend/src/three/CameraPresets.jsx` | IMPLEMENTED |
| Asset loader + error states | `frontend/src/three/AssetLoader.jsx` | IMPLEMENTED |
| Configurator viewer (Canvas) | `frontend/src/components/configurator/ConfiguratorViewer.jsx` | IMPLEMENTED |
| Configurator page | `frontend/src/pages/CarConfigurator.jsx` | IMPLEMENTED |
| Configurator API service | `frontend/src/services/configuratorApi.js` | IMPLEMENTED |

---

## Key Design Rules

1. **Real 3D only.** No image rotation, no photo flipping. If no GLB/GLTF asset exists for a vehicle, the UI shows "3D Configurator Coming Soon".
2. **Purchasable configuration ≠ showroom interaction.** Doors, hood, lights do not change price. Paint, wheels, interior, roof do.
3. **Backend is pricing authority.** The frontend never calculates price. All prices come from `/api/v1/configurator/price`.
4. **AI cannot bypass rules.** All AI-selected options must pass `/api/v1/configurator/validate` before application.
5. **Asset provenance is mandatory.** Only `OEM_AUTHORIZED`, `AUTO_AI_LICENSED`, or `LICENSED_THIRD_PARTY` assets may be published.

---

## What Is Still Required

- **Real 3D assets** (GLB/GLTF) for specific vehicles — zero exist yet. Phase 3+.
- Full Indian vehicle database population (brands, models, variants). Phase 3+.
- AI configurator natural language flow. Phase 3+.
- City-specific pricing data. Phase 3+.

See `docs/CONFIGURATOR_ARCHITECTURE.md` for the full technical design.
