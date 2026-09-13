# Auto AI India — Master 3D Configurator Feature Checklist

> Scope baseline: consolidated from the approved Auto AI India configurator plan. Status below reflects the current Phase 3 premium foundation and pricing-location work.

## Status legend
- **BUILT** — implemented and covered by the production architecture.
- **PARTIAL** — foundation exists, but the complete user experience or integration is missing.
- **MISSING** — not implemented yet.
- **FUTURE** — intentionally beyond first production V1.

## P0 — Production configurator foundation

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Real GLB/GLTF 3D vehicle | PARTIAL | Verified asset contract, binary GLB inspection, and R3F viewer exist; real licensed production assets are not yet seeded. |
| 2 | 360° orbit / rotate / zoom / pan / reset | BUILT | Orbit/zoom foundation plus smooth reset-to-exterior behavior are wired. |
| 3 | Exterior/interior/camera presets | BUILT | Camera presets are filtered by verified asset capabilities, with store-level gating as a second enforcement layer. |
| 4 | Auto-rotate | BUILT | Store and controls are implemented. |
| 5 | OEM paint/color selection | BUILT | Backend-driven color controls and semantic paint-material application are wired. |
| 6 | Wheel selection | BUILT | Backend-driven wheel UI and declared wheel mesh switching are wired. |
| 7 | Interior selection | BUILT | Backend-driven interior UI and declared option mesh mapping are wired. |
| 8 | Roof selection | BUILT | Backend-driven roof UI and declared option mesh mapping are wired. |
| 9 | Accessory selection | BUILT | Backend-driven multi-select UI and declared option mesh mapping are wired. |
| 10 | Availability/compatibility rules | BUILT | Backend rules engine remains authoritative. |
| 11 | Backend-authoritative validation | BUILT | Purchasable configurations are revalidated before pricing and save. |
| 12 | Backend-authoritative live pricing | BUILT | Server recalculates price; client snapshots are not trusted for persistence. |
| 13 | Configuration summary | BUILT | Vehicle, color, wheels, interior, roof and accessories are summarized from backend option data. |
| 14 | Save configuration | BUILT | Authenticated save revalidates configuration and persists server-calculated price. |
| 15 | Share configuration | BUILT | Share-token copy UI and public-token loading are wired. |
| 16 | Configuration restore/persistence | BUILT | `?config=` restore is wired and revalidated; history is available. |
| 17 | Verified/licensed asset gating | BUILT | Publication contract, provenance rules and availability gating exist. |
| 18 | Responsive desktop/mobile configurator | BUILT | Desktop remains two-column; mobile uses a sticky, scrollable bottom control sheet with safe-area handling. |
| 19 | Production tests and gates | BUILT | Contract/regression tests and production smoke gates pass on the latest CI-verified Phase 3 foundation head; newer storage/city commits still require CI verification. |
| 20 | Security/backend authority | BUILT | Pricing, options, rules, save ownership and saved snapshots are backend-controlled. |

## P1 — Premium V1

| # | Feature | Status | Notes |
|---|---|---|---|
| 21 | AI conversational configurator | BUILT | Natural-language intent is resolved only against backend catalog IDs, then validated and priced server-side; an in-configurator AI assistant applies only the returned backend configuration. |
| 22 | AI configuration recommendations | PARTIAL | Safe option selection exists; broader multi-variant recommendation remains. |
| 23 | Door open/close | PARTIAL | State and UI are asset-capability gated; real asset animation must be present. |
| 24 | Boot open/close | PARTIAL | State and UI are asset-capability gated; real asset animation must be present. |
| 25 | Bonnet/hood open/close | PARTIAL | State and UI are asset-capability gated; real asset animation must be present. |
| 26 | Sunroof open/close | PARTIAL | State and UI are asset-capability gated; real asset animation must be present. |
| 27 | Lights/DRL/hazard/interior lighting | PARTIAL | Controls are capability-gated; complete asset light animation remains. |
| 28 | Feature hotspots | BUILT | Backend hotspot manifest, publication gating, API and viewer markers/details are wired. |
| 29 | Cinematic showroom mode | PARTIAL | Fullscreen presentation mode is wired; guided camera sequence remains. |
| 30 | Configuration screenshot/share card | BUILT | Screenshot capture and branded share-card composition are implemented; QR composition remains. |
| 31 | EMI/finance handoff | BUILT | Configured conversion-lead backend and saved-configuration finance UI handoff are wired. |
| 32 | Insurance handoff | BUILT | Insurance assistance selection is included in the validated conversion handoff. |
| 33 | Dealer availability/enquiry/booking | BUILT | Dealer availability, enquiry, test-drive and booking intents are selectable in conversion handoff. |
| 34 | City/state pricing selector | PARTIAL | Backend now exposes only verified city/state pricing locations and rejects unverified cities; the UI still needs to replace free text with the authoritative picker. |
| 35 | Configuration history / saved cars | BUILT | Authenticated history endpoint and history UI are implemented. |
| 36 | Compare configurations | BUILT | Two saved configurations can be compared through the backend comparison contract. |
| 37 | OEM/variant data hierarchy | PARTIAL | Backend models/variants/options exist; scalable data population remains. |
| 38 | Admin asset management | BUILT | Admin create, validation, publish, assignment and unassignment workflow exists. |
| 39 | Asset ingestion/validation pipeline | BUILT | Multipart GLB ingestion, direct S3-compatible presigned upload, SHA-256 capture, structural inspection, manifest validation, immutable revision history and reviewed rollback are implemented; production storage credentials/bucket configuration remain. |
| 40 | Mobile/PWA premium UX | PARTIAL | PWA/mobile architecture exists; broader app-shell polish remains beyond the configurator-specific mobile sheet. |

## P2 — Advanced / future

| # | Feature | Status | Notes |
|---|---|---|---|
| 41 | WebAR vehicle placement | FUTURE | Real-world scale vehicle placement. |
| 42 | Mobile AR | FUTURE | Camera-based AR experience. |
| 43 | Interactive feature education | FUTURE | Clickable vehicle features with explanations. |
| 44 | Configured vehicle cinematic video | FUTURE | Render/share a configured-car presentation. |
| 45 | Advanced personalized AI build | FUTURE | Budget/use-case/feature-aware configuration recommendations across variants. |

## Approved 21 missing-feature additions

All 21 previously identified gaps remain explicitly tracked in this master plan, with implementation status updated as features land.

## Non-negotiable architecture rules

1. The frontend never invents vehicle options, option IDs, prices, availability, compatibility, or licensed 3D assets.
2. The backend is authoritative for availability, rules, validation, pricing, persistence, and publication state.
3. Pricing locations are backend-authoritative: only verified city/state records may be used for city-specific on-road pricing.
4. AI only proposes selections from backend-provided options; every selection is validated by the backend rules engine and priced by the backend pricing engine.
5. A vehicle without a verified published asset remains `3D Coming Soon`/unavailable rather than using a fake 360 image rotation.
