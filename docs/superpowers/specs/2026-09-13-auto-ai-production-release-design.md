# Auto AI India — Production Release Design

**Date:** 2026-09-13  
**Scope:** GitHub → Vercel → Render → MongoDB Atlas, with the real 3D configurator as the critical path.

## 1. Objective

Move Auto AI India from a substantially built automotive platform to a controlled production release candidate without destabilising `main`. The release must preserve the existing application while completing and validating the real 3D configurator, configuration state, authoritative pricing/EMI, AI live context, production asset readiness, and end-to-end production gates.

The configurator is a real 3D system based on GLB/GLTF assets and React Three Fiber/Three.js. Image rotation must not be treated as an equivalent substitute.

## 2. Current constraints and evidence

- `main` remains the production baseline.
- Configurator work exists across a chain of PRs, including PRs for the V1 foundation, asset storage, premium foundations, authoritative pricing locations, cinematic showroom, and AI live context.
- PR #50 establishes an authority model: AI suggests; backend catalog, compatibility rules, and pricing remain authoritative. Budget parsing and EMI calculation must not invent rate or tenure.
- Production infrastructure is Vercel frontend + Render FastAPI backend + MongoDB Atlas, with Redis/rate limiting and Razorpay payment infrastructure already present.
- MongoDB Atlas configurator work is concentrated in `autoai`; the audit identified `autoai.configurations` as empty and vehicle data as seeded/partial. This means schema/data readiness is a release risk rather than an infrastructure-performance problem.
- The uploaded project audit identifies the real 3D configurator, production-quality vehicle assets, advanced configuration, real-time automotive data, complete dealer ecosystem, complete QA, and final launch as remaining work.

## 3. Architecture

### Frontend

- React application already contains vehicle discovery, comparison, AI, finance, booking, showroom, premium, dealer and admin surfaces.
- 3D rendering uses React Three Fiber, Drei and Three.js.
- Configurator state is explicit and must remain deterministic/recoverable.
- Unsupported vehicle interactions are disabled or unavailable rather than simulated.

### Backend

- FastAPI remains the authoritative API boundary.
- Vehicle catalog, variant compatibility, configuration rules, pricing, EMI inputs and persisted configuration are authoritative server-side concerns.
- AI is an advisory layer and receives verified configuration/city context.

### Data

- MongoDB Atlas is the persistence layer.
- Configuration data must be validated before publication.
- Vehicle/variant/pricing/asset records require provenance and versioning where applicable.

### Deployment

- Vercel hosts the web frontend.
- Render hosts FastAPI.
- CI must remain the release gate before deployment.

## 4. Configurator product contract

A production configuration represents, at minimum:

1. Vehicle/model
2. Variant
3. Engine/powertrain where applicable
4. Transmission where applicable
5. Exterior colour
6. Interior/trim where supported
7. Wheels where supported
8. Accessories where supported
9. Supported interaction state
10. Price inputs and calculated totals
11. City/location context when pricing requires it
12. Asset/version identity

The viewer must support:

- 360 orbit, zoom and pan
- camera presets
- exterior/interior views where assets support them
- material/paint switching
- compatible wheel/interior/accessory switching
- supported doors/boot/bonnet/sunroof interactions
- responsive desktop/mobile controls
- explicit asset loading/error states
- save/restore/share of a valid configuration
- capture/share where already supported
- cinematic showroom sequence where supported

No feature may imply an interaction that the underlying asset cannot actually perform.

## 5. Pricing and finance contract

The pricing flow is:

`base variant + supported options + applicable location/registration/insurance estimates → authoritative estimated total → EMI calculation`

The frontend may display calculations but must not be the source of truth for price, compatibility, or finance assumptions.

EMI requires explicit or configured authoritative rate/tenure inputs. The AI must never fabricate missing finance parameters.

## 6. AI integration contract

AI can:

- interpret natural-language buying intent
- recommend vehicles/options
- explain trade-offs
- interpret budget constraints
- propose a configuration
- explain price/EMI results

AI cannot:

- override backend compatibility
- invent a vehicle, option, price, rate, tenure, asset, or city value
- persist an invalid configuration
- claim unsupported 3D interactions exist

The live configurator state must be passed as verified context, and AI changes must preserve the active build unless the user explicitly requests a configuration change.

## 7. Asset pipeline

Production assets follow:

`source/provenance → inspection → validation → optimisation → storage → publication → frontend load → runtime validation`

Each published vehicle asset must have enough metadata to identify:

- vehicle/model
- asset format/version
- source/provenance
- supported materials/options
- supported animations/interactions
- camera/view support where relevant
- optimisation/LOD status
- validation status

Missing or invalid assets produce a controlled failure state, never a fake fallback presented as a 3D vehicle.

## 8. Data readiness

The release candidate must establish a canonical model for:

- models
- variants
- specifications
- prices
- city/state pricing inputs
- colours
- wheels
- interiors
- accessories
- images
- 3D assets
- compatibility rules
- configuration records

Seed data may be used for tests and controlled initial content, but production claims must be clearly sourced/verified. A later ingestion pipeline can add licensed/authorised sources, validation, normalisation and scheduled updates.

## 9. Release sequence

1. Reconcile the configurator PR chain into a controlled release candidate.
2. Verify changed files and regression coverage for the 3D foundation, asset management, pricing, premium foundations, showroom, and AI live context.
3. Validate the asset/data contracts against MongoDB and backend APIs.
4. Complete or repair missing configurator state, compatibility, pricing, save/restore/share and AI integration paths.
5. Run frontend, backend, integration and production-gate tests.
6. Deploy the release candidate through the existing CI/CD path.
7. Smoke-test Vercel → Render → MongoDB and the critical customer journey.
8. Only after verification, request/perform the shared-branch merge or production publish as a separate approval-controlled action.

## 10. End-to-end acceptance journey

`Discover → Select vehicle → Open 3D configurator → Configure → Validate → Calculate price → Calculate EMI → Save/share → Ask AI about current build → Select dealer/finance path → Booking/payment where applicable`

The critical path must work on desktop and mobile-sized viewports, and failures must be explicit and recoverable.

## 11. Non-goals for this release

- Replacing the entire platform architecture.
- Rebuilding working core modules unnecessarily.
- Treating third-party scraped data as authoritative without licensing/verification.
- Publishing unsupported OEM assets or invented specifications.
- Introducing irreversible infrastructure changes without separate approval.
- Merging or publishing to shared production branches merely because tests pass.

## 12. Quality gates

A release candidate is acceptable only when:

- frontend build passes
- backend tests pass
- production gate passes
- configurator regression tests pass
- 3D asset failure/loading paths are covered
- configuration compatibility is enforced server-side
- pricing is authoritative server-side
- AI cannot override authoritative rules
- persistence is validated
- production environment variables/secrets are not exposed
- Vercel and Render deployments are healthy
- critical smoke journey succeeds

## 13. Open risks

1. Production-quality licensed/authorised 3D vehicle assets are the largest content dependency.
2. The configurator branch chain may contain overlapping changes that require careful reconciliation.
3. Atlas configurator collections need real validated data before the feature can be considered production-complete.
4. Real-time automotive pricing/inventory remains a separate data-product dependency.
5. Native mobile store release and full dealer operations are not prerequisites for the first web release candidate, but remain launch work.

## 14. Decision

Proceed with a controlled Phase 3 release-candidate implementation centred on the real 3D configurator, authoritative data/pricing, and AI live context. Preserve `main` until all gates pass. Shared-branch merge/publish remains an explicit side-effect approval step.
