# Auto AI India — Production Release Implementation Plan

**Date:** 2026-09-13
**Design:** `docs/superpowers/specs/2026-09-13-auto-ai-production-release-design.md`
**Execution branch:** `phase-3/production-release-candidate`

## Objective

Convert the approved Phase 3 design into a verified release candidate while keeping `main` production-safe. The real 3D configurator is the critical path.

## Task 1 — Establish release-candidate branch and audit baseline
- Start from the current canonical Phase 3 configurator chain, not from an arbitrary stale branch.
- Record base/head SHAs and PR dependencies.
- Confirm the production baseline remains unchanged.
- Produce a compact release ledger with decisions, risks and test evidence.
- **Acceptance:** release branch ancestry is explicit and no production branch is modified.

## Task 2 — Reconcile configurator foundation
- Inspect PRs #44, #46, #45, #47, #48 and #50 and their dependencies.
- Resolve overlapping frontend/backend changes into one coherent candidate.
- Preserve the existing R3F/Three.js architecture and authoritative backend boundary.
- **Acceptance:** one candidate contains the intended configurator foundation without duplicate/conflicting implementations.

## Task 3 — Harden 3D asset contract
- Verify GLB/GLTF loading, supported interaction metadata, loading/error states and runtime capability checks.
- Ensure unsupported interactions are unavailable rather than simulated.
- Validate asset identity/version/provenance metadata paths.
- **Acceptance:** valid assets render; invalid/missing assets fail explicitly; capability checks gate interactions.

## Task 4 — Harden configuration state and compatibility
- Verify deterministic configurator state for vehicle, variant, powertrain, colour, interior, wheels and accessories.
- Enforce compatibility server-side.
- Ensure save/restore/share accepts only valid configuration state.
- **Acceptance:** invalid combinations cannot become persisted authoritative configurations.

## Task 5 — Harden authoritative pricing and EMI
- Verify backend pricing calculation and city/location inputs.
- Verify frontend does not become price authority.
- Verify EMI requires authoritative rate/tenure and never invents missing values.
- **Acceptance:** totals and EMI inputs are traceable to authoritative backend responses.

## Task 6 — Harden AI live configurator context
- Verify current build context reaches AI.
- Preserve active build unless the user explicitly requests a change.
- Prevent AI from overriding compatibility, price, finance or asset capabilities.
- **Acceptance:** AI is advisory and all mutations pass authoritative validation.

## Task 7 — MongoDB Atlas production readiness
- Validate canonical `autoai` collections and indexes required by the release.
- Validate configuration persistence and vehicle/variant/asset/pricing records.
- Do not invent production vehicle data; distinguish controlled seed/test records from verified production content.
- **Acceptance:** critical read/write paths succeed against the intended database and required indexes exist.

## Task 8 — Automated tests and quality gates
- Run frontend unit/component/build checks.
- Run backend tests and API validation.
- Add/fix regression coverage for configurator state, asset failure paths, pricing, EMI and AI context.
- **Acceptance:** all release-gate tests pass with no known high-severity regression.

## Task 9 — Production deployment validation
- Deploy only the approved candidate through the existing CI/CD path.
- Verify Vercel frontend, Render FastAPI health/readiness, MongoDB connectivity and critical APIs.
- Smoke test the customer journey: Discover → 3D Configurator → Configure → Validate → Price → EMI → Save/Share → AI.
- **Acceptance:** production candidate passes health and critical-path smoke checks.

## Task 10 — Final review and release decision
- Perform broad code/security/architecture review.
- Record residual risks, especially 3D asset licensing/content and real-time automotive data dependencies.
- Do not merge/publish shared branches without a separate explicit approval.
- **Acceptance:** release candidate is either approved for merge/publish or blocked with concrete evidence and remediation items.

## Execution rules

- Use TDD for implementation changes.
- Verify before claiming completion.
- Do not expose secrets or commit credentials.
- No fake data presented as verified production data.
- No destructive or irreversible infrastructure changes.
- Shared-branch merge/publish is an explicit side-effect gate.
