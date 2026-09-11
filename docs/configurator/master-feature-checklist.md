# Auto AI India — Master 3D Configurator Feature Checklist

> Scope baseline: consolidated from the approved Auto AI India configurator plan. This document is the feature source of truth for V1 planning; status below reflects the current Phase 3 branch after the first implementation tranche.

## Status legend
- **BUILT** — implemented and covered by the current production architecture.
- **PARTIAL** — foundation exists, but the complete user experience or integration is missing.
- **MISSING** — not implemented yet.
- **FUTURE** — intentionally beyond first production V1, but retained in the approved vision.

## P0 — Production configurator foundation

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Real GLB/GLTF 3D vehicle | PARTIAL | Verified asset contract and R3F viewer exist; real licensed production assets are not yet seeded. |
| 2 | 360° orbit / rotate / zoom / pan / reset | PARTIAL | Orbit foundation exists; dedicated reset/polish remains. |
| 3 | Exterior/interior/camera presets | PARTIAL | Preset state exists; asset-supported camera availability needs enforcement. |
| 4 | Auto-rotate | BUILT | Store and controls are implemented. |
| 5 | OEM paint/color selection | BUILT | Backend-driven color controls and semantic paint-material application are wired. |
| 6 | Wheel selection | BUILT | Backend-driven wheel UI and declared wheel mesh switching are wired. |
| 7 | Interior selection | BUILT | Backend-driven interior UI and generic declared option mesh mapping are wired. |
| 8 | Roof selection | BUILT | Backend-driven roof UI and generic declared option mesh mapping are wired. |
| 9 | Accessory selection | BUILT | Backend-driven multi-select UI and generic declared option mesh mapping are wired. |
| 10 | Availability/compatibility rules | BUILT | Backend rules engine remains authoritative. |
| 11 | Backend-authoritative validation | BUILT | Every initialized/changed purchasable configuration is validated before pricing/commit actions. |
| 12 | Backend-authoritative live pricing | BUILT | Validation precedes `/price`; UI shows backend price breakdown and never calculates totals locally. |
| 13 | Configuration summary | BUILT | Vehicle, color, wheels, interior, roof and accessories are summarized from backend option data. |
| 14 | Save configuration | PARTIAL | Customer save UI is wired to the authenticated backend endpoint; authentication remains required. |
| 15 | Share configuration | PARTIAL | Share-token copy UI and public-token loading are wired; richer share card remains. |
| 16 | Configuration restore/persistence | PARTIAL | `?config=` restore is wired and then revalidated; history remains to be built. |
| 17 | Verified/licensed asset gating | BUILT | Publication contract and availability gating exist. |
| 18 | Responsive desktop/mobile configurator | PARTIAL | Responsive layout exists; dedicated mobile bottom-sheet UX remains. |
| 19 | Production tests and gates | BUILT | Existing gates remain; Phase 3 behavior has new contract tests and requires CI verification. |
| 20 | Security/backend authority | BUILT | Pricing, options, rules and save ownership remain backend-controlled. |

## P1 — Premium V1

| # | Feature | Status | Notes |
|---|---|---|---|
| 21 | AI conversational configurator | PARTIAL | Contract and endpoint exist; implementation is still a stub. |
| 22 | AI configuration recommendations | FUTURE | Must use backend option IDs and validation; no AI price/rule authority. |
| 23 | Door open/close | PARTIAL | State exists and UI is asset-capability gated; real asset animation must be present. |
| 24 | Boot open/close | PARTIAL | State exists and UI is asset-capability gated; real asset animation must be present. |
| 25 | Bonnet/hood open/close | PARTIAL | State exists and UI is asset-capability gated; real asset animation must be present. |
| 26 | Sunroof open/close | PARTIAL | State exists and UI is asset-capability gated; real asset animation must be present. |
| 27 | Lights/DRL/hazard/interior lighting | PARTIAL | Controls are capability-gated; complete asset light animation/controller mapping remains. |
| 28 | Feature hotspots | MISSING | Asset-aware interactive feature markers. |
| 29 | Cinematic showroom mode | MISSING | Premium guided camera presentation. |
| 30 | Configuration screenshot/share card | MISSING | Branded configured-car visual/QR output. |
| 31 | EMI/finance handoff | PARTIAL | Broader app has EMI capability; configurator-specific handoff needs wiring. |
| 32 | Insurance handoff | MISSING | Under-One-Roof conversion flow. |
| 33 | Dealer availability/enquiry/booking | PARTIAL | Configured test-drive gate exists; configured-vehicle lead payload needs wiring. |
| 34 | City/state pricing selector | PARTIAL | City input is wired to backend pricing; authoritative city/state picker remains. |
| 35 | Configuration history / saved cars | MISSING | Premium personalization feature. |
| 36 | Compare configurations | MISSING | Compare two saved/active configurations. |
| 37 | OEM/variant data hierarchy | PARTIAL | Backend models/variants/options exist; full scalable data population pipeline is missing. |
| 38 | Admin asset management | PARTIAL | Asset schema/publication gates exist; full admin workflow is missing. |
| 39 | Asset ingestion/validation pipeline | PARTIAL | Metadata validation foundation exists; binary ingestion and semantic inspection workflow is missing. |
| 40 | Mobile/PWA premium UX | PARTIAL | PWA/mobile architecture exists; configurator-specific mobile polish remains. |

## P2 — Advanced / future

| # | Feature | Status | Notes |
|---|---|---|---|
| 41 | WebAR vehicle placement | FUTURE | Real-world scale vehicle placement. |
| 42 | Mobile AR | FUTURE | Camera-based AR experience. |
| 43 | Interactive feature education | FUTURE | Clickable vehicle features with explanations. |
| 44 | Configured vehicle cinematic video | FUTURE | Render/share a configured-car presentation. |
| 45 | Advanced personalized AI build | FUTURE | Budget/use-case/feature-aware configuration recommendations. |

## Approved 21 missing-feature additions

All 21 previously identified gaps are explicitly represented in this master plan: full option UI, 3D wheel switching, interior/roof/accessory mapping, frontend validation workflow, save UI, share UI, configuration summary/price breakdown, variant integration, AI configurator integration, verified asset ingestion/management, AR mode, door/boot/bonnet/sunroof interactions, interior camera experience, feature hotspots, screenshot/share card, EMI/finance handoff, dealer availability/enquiry/booking, cinematic showroom mode, mobile/PWA UX, configuration history, and configuration comparison.

## Non-negotiable architecture rules

1. The frontend never invents vehicle options, option IDs, prices, availability, compatibility, or licensed 3D assets.
2. The backend is authoritative for availability, rules, validation, pricing, persistence, and publication state.
3. AI only extracts intent and may propose selections from backend-provided options; it never sets prices or bypasses rules.
4. A vehicle without a verified published asset remains `3D Coming Soon`/unavailable rather than using a fake 360 image rotation.
5. 3D visual changes only occur when the verified asset declares the required semantic material, mesh, or animation mapping.
6. Showroom interaction state never changes purchasable pricing state.
7. Saved/shareable configurations must be validated against current backend state when restored or acted upon.
8. OEM/licensed asset provenance is mandatory before production publication.
