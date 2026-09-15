# AI Multi-Variant Recommendations Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with TDD and verification gates.

**Goal:** Add a safe, bounded multi-variant recommendation flow that ranks only backend-provided vehicle variants and hands selected vehicles into the existing configurator.

**Architecture:** Candidate generation, eligibility filtering, and deterministic ranking remain backend-authoritative. The API exposes bounded recommendation facts and the frontend uses the existing configurator route; production 3D readiness and verified pricing are never inferred client-side.

**Tech Stack:** FastAPI, Pydantic, MongoDB/Motor, React, Jest, existing configurator services and production-readiness contracts.

**Spec:** `docs/superpowers/specs/2026-09-15-ai-multi-variant-recommendations-design.md`

## Global Constraints
- Backend is authoritative for eligibility, availability, pricing, compatibility, and 3D asset readiness.
- AI must never invent IDs, prices, features, availability, or asset capabilities.
- Recommendation output is bounded to 3–5 candidates.
- Missing data is never converted into a positive claim.
- No new persistence is added for the first recommendation slice.
- `main` remains untouched until explicit merge approval.

---

### Task 1: Recommendation contract and deterministic ranking
- [x] Define bounded request/response fields.
- [x] Filter explicit fuel, segment, budget, and inactive variants.
- [x] Rank deterministically with bounded scores.
- [x] Keep explanations grounded in candidate facts.

### Task 2: Backend recommendation API
- [x] Add `POST /api/v1/configurator/recommendations`.
- [x] Use verified pricing only.
- [x] Require published/validated assets before claiming configurator availability.
- [x] Return safe empty results when no candidates qualify.

### Task 3: Frontend API boundary
- [x] Expose `recommendVariants()` through the canonical configurator API service.
- [x] Preserve existing readiness and sharing behavior.

### Task 4: Deep verification and integration hardening
- [ ] Run backend unit and route tests.
- [ ] Run frontend unit tests and production build.
- [ ] Run production gate and smoke tests.
- [ ] Review security, data authority, deterministic ranking, readiness, and API response boundaries.
- [ ] Fix all discovered errors in the same pass before requesting merge approval.
