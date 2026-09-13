# Auto AI India Configurator V1 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the production-ready Configurator V1 foundation and wire the approved missing feature set without inventing vehicle data, prices, assets, or compatibility rules.

**Architecture:** Keep the canonical FastAPI `server:app` as the production API and MongoDB as the configuration source. Keep one Zustand frontend state model; route every purchasable change through backend validation/pricing and drive 3D changes only from verified asset metadata. Separate production P0/P1 implementation from future AR/media features while preserving their interfaces in the specification.

**Tech Stack:** FastAPI, Pydantic, MongoDB/Motor, React 18, Zustand, React Three Fiber, Three.js, Axios, Tailwind, Jest/CRA test runner, GitHub Actions, Vercel, Render.

**Spec:** `docs/configurator/master-feature-checklist.md`

## Global Constraints

- Frontend never invents vehicle options, prices, availability, compatibility, or licensed assets.
- Backend remains authoritative for validation and pricing.
- AI never sets prices or invents option IDs.
- Unverified 3D assets remain `3D Coming Soon`.
- 3D visual mappings are applied only when declared by the verified asset.
- Interaction state never changes purchasable pricing state.
- Saved/shared configurations are revalidated before consequential use.

---

## Task 1 — Contract and state hardening

- [ ] Add failing backend/frontend contract tests for asset option mappings and complete option grouping.
- [ ] Add optional asset `option_mesh_names` mapping for non-wheel purchasable options.
- [ ] Return the mapping from the public asset endpoint.
- [ ] Extend frontend asset state to retain the mapping.
- [ ] Verify backend tests and frontend build.
- [ ] Commit.

## Task 2 — Complete option controls and validation

- [ ] Add failing tests for option selection, validation error normalization, and stale-request protection.
- [ ] Implement reusable option panels for wheels, interiors, roofs and accessories.
- [ ] Add backend validation after purchasable changes with request sequencing so stale responses cannot overwrite newer state.
- [ ] Gate save/booking actions on valid configuration.
- [ ] Display backend validation errors/warnings.
- [ ] Verify tests/build.
- [ ] Commit.

## Task 3 — Price breakdown and configuration summary

- [ ] Add failing UI tests for backend price components and selected-option summary.
- [ ] Implement authoritative price breakdown UI.
- [ ] Show base price, option deltas, discounts, taxes/charges when returned, estimated on-road, effective date/source.
- [ ] Remove any misleading fallback that could look like an authoritative configured price.
- [ ] Verify tests/build.
- [ ] Commit.

## Task 4 — Save/share/restore workflow

- [ ] Add failing backend tests for save ownership and share-token public response; add frontend tests for save/restore states.
- [ ] Implement save configuration action with current validated state and backend price snapshot.
- [ ] Implement share link creation/display and restore from share token.
- [ ] Revalidate restored configurations against current options before allowing booking/save-as-new.
- [ ] Verify tests/build.
- [ ] Commit.

## Task 5 — 3D semantic option and interaction synchronization

- [ ] Add failing viewer tests/helpers for wheel and option mesh visibility and supported animation gating.
- [ ] Implement exact wheel mesh mapping.
- [ ] Implement generic declared option mesh mapping for interior/roof/accessories.
- [ ] Gate door/boot/hood/sunroof/lights controls by `supported_interactions` and do not fake unsupported behavior.
- [ ] Keep shared GLTF geometry lifecycle safe.
- [ ] Verify build and tests.
- [ ] Commit.

## Task 6 — Variant, city, finance and conversion handoffs

- [ ] Add failing contract tests for city/state propagation and configured lead payloads.
- [ ] Add authoritative city/state selection using an existing backend source; do not hard-code unsupported pricing.
- [ ] Wire configured vehicle state into EMI/finance and dealer/test-drive enquiry payloads using existing app routes where available.
- [ ] Preserve insurance/booking as conversion handoffs, not invented transaction logic.
- [ ] Verify build/tests.
- [ ] Commit.

## Task 7 — AI configurator contract implementation

- [ ] Add failing tests for intent-to-option resolution using only backend options.
- [ ] Implement AI endpoint orchestration: extract intent, resolve against backend options, validate, calculate price.
- [ ] Return unavailable/ambiguous selections explicitly instead of guessing.
- [ ] Wire conversational UI to apply validated configuration changes.
- [ ] Verify backend/frontend tests.
- [ ] Commit.

## Task 8 — Asset ingestion/admin foundation

- [ ] Add failing tests for publication gates and semantic metadata validation.
- [ ] Implement an asset manifest/ingestion validation service covering URL, checksum, provenance, license, publisher, supported interactions, paint materials, wheel mappings, and option mappings.
- [ ] Keep binary storage provider-neutral until approved storage credentials/integration exist.
- [ ] Add admin-safe publication contract without exposing unreviewed assets.
- [ ] Verify backend tests.
- [ ] Commit.

## Task 9 — Premium showroom UX foundations

- [ ] Add failing tests for responsive configurator states and feature hotspot metadata contracts.
- [ ] Implement mobile-friendly option navigation/bottom-sheet layout, configuration history scaffolding, configuration comparison model, and screenshot/share-card interface.
- [ ] Implement cinematic showroom mode using actual camera presets/asset-supported interactions.
- [ ] Keep AR, video rendering and unsupported feature visualizations behind explicit future capability flags.
- [ ] Verify build/tests.
- [ ] Commit.

## Task 10 — Production verification and release readiness

- [ ] Run backend unit/rules/configurator tests.
- [ ] Run frontend tests, lint, and production build.
- [ ] Run production smoke tests and exact-head CI.
- [ ] Verify Vercel preview and Render production deployment after merge.
- [ ] Review branch for stale temporary workflows, retired vendor references, inactive integration dependencies, invented vehicle data, or unverified assets.
- [ ] Complete final code review before release.
