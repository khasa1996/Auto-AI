# Auto AI India — Master 3D Configurator Feature Checklist

> Scope baseline: consolidated from the approved Auto AI India configurator plan. This document is the feature source of truth for V1 planning; implementation status is based on the current repository at Phase 3 kickoff.

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
| 5 | OEM paint/color selection | PARTIAL | Color UI and backend data exist; semantic material integration needs full production mapping. |
| 6 | Wheel selection | PARTIAL | Backend option data exists; UI and 3D mesh switching need completion. |
| 7 | Interior selection | PARTIAL | Backend option data exists; UI and 3D mapping need completion. |
| 8 | Roof selection | PARTIAL | Backend option support exists; UI and 3D mapping need completion. |
| 9 | Accessory selection | PARTIAL | Backend support exists; multi-select UI and 3D mapping need completion. |
| 10 | Availability/compatibility rules | BUILT | Backend rules engine and validation foundation exist; frontend validation UX needs completion. |
| 11 | Backend-authoritative validation | PARTIAL | Endpoint exists; page does not yet run a complete validation workflow. |
| 12 | Backend-authoritative live pricing | PARTIAL | Price endpoint and automatic fetch exist; full breakdown UX needs completion. |
| 13 | Configuration summary | MISSING | Needs complete selected-option summary and state. |
| 14 | Save configuration | PARTIAL | Secure API foundation exists; customer UI flow is missing. |
| 15 | Share configuration | PARTIAL | Share-token API foundation exists; share UI/restore flow is missing. |
| 16 | Configuration restore/persistence | PARTIAL | API exists; frontend restore workflow is missing. |
| 17 | Verified/licensed asset gating | BUILT | Publication contract and availability gating exist. |
| 18 | Responsive desktop/mobile configurator | PARTIAL | Existing responsive layout exists; mobile bottom-sheet UX needs refinement. |
| 19 | Production tests and gates | BUILT | Backend/frontend/production smoke gates exist; new Phase 3 behavior must add coverage. |
| 20 | Security/backend authority | BUILT | Pricing, options, rules and save ownership remain backend-controlled. |

## P1 — Premium V1

| # | Feature | Status | Notes |
|---|---|---|---|
| 21 | AI conversational configurator | PARTIAL | Contract and endpoint exist; implementation is still a stub. |
| 22 | AI configuration recommendations | FUTURE | Must use backend option IDs and validation; no AI price/rule authority. |
| 23 | Door open/close | PARTIAL | Interaction state exists; asset animation mapping must be enforced. |
| 24 | Boot open/close | PARTIAL | State exists; real animation mapping must be enforced. |
| 25 | Bonnet/hood open/close | PARTIAL | State exists; real animation mapping must be enforced. |
| 26 | Sunroof open/close | PARTIAL | State exists; real animation mapping must be enforced. |
| 27 | Lights/DRL/hazard/interior lighting | PARTIAL | State/controller foundation exists; supported-interaction gating needs completion. |
| 28 | Feature hotspots | MISSING | Asset-aware interactive feature markers. |
| 29 | Cinematic showroom mode | MISSING | Premium guided camera presentation. |
| 30 | Configuration screenshot/share card | MISSING | Branded configured-car visual/QR output. |
| 31 | EMI/finance handoff | PARTIAL | Broader app has EMI capability; configurator-specific handoff needs wiring. |
| 32 | Insurance handoff | MISSING | Under-One-Roof conversion flow. |
| 33 | Dealer availability/enquiry/booking | PARTIAL | Test-drive link exists; full configured-vehicle lead payload needs wiring. |
| 34 | City/state pricing selector | PARTIAL | Backend accepts city/state; customer-facing selector needs authoritative source. |
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

The previously identified 21 missing items are explicitly added to the roadmap: full option UI, 3D wheel switching, interior/roof/accessory mapping, frontend validation workflow, save UI, share UI, configuration summary/price breakdown, variant integration, AI configurator integration, verified asset ingestion/management, AR mode, door/boot/bonnet/sunroof interactions, interior camera experience, feature hotspots, screenshot/share card, EMI/finance handoff, dealer availability/enquiry/booking, cinematic showroom mode, mobile/PWA UX, configuration history, and configuration comparison.

## Non-negotiable architecture rules

1. The frontend never invents vehicle options, option IDs, prices, availability, compatibility, or licensed 3D assets.
2. The backend is authoritative for availability, rules, validation, pricing, persistence, and publication state.
3. AI only extracts intent and may propose selections from backend-provided options; it never sets prices or bypasses rules.
4. A vehicle without a verified published asset remains `3D Coming Soon`/unavailable rather than using a fake 360 image rotation.
5. 3D visual changes only occur when the verified asset declares the required semantic material, mesh, or animation mapping.
6. Showroom interaction state never changes purchasable pricing state.
7. Saved/shareable configurations must be validated against current backend state when restored or acted upon.
8. OEM/licensed asset provenance is mandatory before production publication.
