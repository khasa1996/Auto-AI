# AI Multi-Variant Recommendations Design

## Status
Approved feature direction; design recorded for review before implementation planning.

## Goal
Extend Auto AI India's existing safe configurator AI from single-variant option selection to multi-variant recommendations. The system must recommend only variants that the backend makes eligible and must preserve the existing authoritative validation, pricing, availability, and production-asset rules.

## Non-negotiable constraints
- Backend is authoritative for variant eligibility, availability, pricing, compatibility, and published 3D asset readiness.
- AI must never invent variant IDs, option IDs, prices, features, availability, or asset capabilities.
- A recommendation must be explainable using backend-provided facts.
- City/state pricing is used only when verified pricing data exists; otherwise the response must clearly indicate that pricing is unavailable/estimated according to existing pricing rules.
- Variants without a verified published 3D asset may be recommended as vehicles, but must not be represented as configurator-ready; the handoff must respect the existing readiness gate.
- Selecting a recommendation must reuse the existing configurator flow rather than create a second configuration system.
- No changes to `main` until explicit merge approval.

## User flow
1. User describes a need such as budget, fuel preference, family use, features, performance, running cost, or city.
2. Backend resolves the request into structured recommendation intent.
3. Backend builds a candidate pool from active variants and authoritative catalog/pricing data.
4. Hard filters remove candidates that violate explicit requirements or cannot be safely evaluated.
5. Deterministic scoring ranks the remaining candidates using only trusted backend fields.
6. The AI layer produces concise explanations from the ranked backend facts; it does not decide eligibility or manufacture facts.
7. API returns a bounded shortlist, target 3–5 variants, with score signals, reasons, caveats, and configurator readiness.
8. Frontend lets the user compare candidates or select one and enter the existing configurator.

## Recommendation contract
Each recommendation should contain:
- `variant_id`
- vehicle identity fields already available from backend
- rank
- overall fit score
- requirement-fit signals
- budget-fit signal
- running-cost/fuel-fit signal when data exists
- availability/readiness status
- verified pricing context when resolved
- short `why_it_fits` explanation
- short `tradeoff` explanation when meaningful
- `configurator_available` derived from the existing production readiness contract

The API must return the backend candidate facts needed for the UI so the frontend does not infer or fabricate recommendation metadata.

## Scoring model
Use deterministic weighted scoring after hard eligibility filtering. Explicit user requirements receive the strongest weights. Suggested dimensions:
- requirement/segment fit
- budget fit
- fuel/powertrain fit
- use-case fit where reliable backend data exists
- feature fit where structured data exists
- ownership/running-cost fit where structured data exists

Missing data must not be converted into positive claims. Scores should be bounded and reproducible. The exact weights belong in the implementation plan after inspection of existing schemas/data coverage.

## AI role
Reuse the existing `configurator_ai.py` safety pattern. AI receives a backend-generated candidate set and trusted facts, then produces structured explanations. Any AI-selected IDs must be checked against the candidate set. If the provider fails or returns invalid structured output, deterministic backend ranking remains the safe fallback.

## API/data boundaries
Likely backend additions:
- recommendation request/response schemas in `backend/configurator_schemas.py`
- recommendation service/module alongside `backend/configurator_ai.py`
- versioned route in `backend/configurator_routes.py`
- tests for candidate filtering, deterministic scoring, bounded output, invalid AI output, and configurator readiness handoff

Likely frontend additions:
- configurator AI/recommendation service method
- recommendation result UI integrated with existing configurator selection flow
- tests proving the UI renders only API-provided candidates and uses the existing configurator handoff

No new database collection is required for the first slice unless inspection shows that persisted recommendation history is already an established requirement. Do not add persistence merely for analytics.

## Error handling
- Unknown/invalid request: return a structured validation error.
- No eligible candidates: return an empty shortlist plus a clear explanation and safe next-step suggestions based only on available filters.
- AI provider unavailable: return deterministic recommendations with a non-AI explanation.
- Invalid AI output: discard it and use deterministic ranking/explanations.
- Stale/unavailable pricing: do not present it as current authoritative pricing.
- Configurator asset unavailable: expose the existing `COMING_SOON`/unavailable state; never substitute a fake 3D asset.

## Testing strategy
TDD is mandatory. First write failing tests for the recommendation contract and deterministic ranking. Then implement the minimum service needed to pass. Add route tests for authorization/input/output boundaries and frontend tests for rendering/handoff. Existing backend, frontend, production-build, and production-smoke gates must remain green.

## Security and reliability
- Bound request length, candidate count, and returned recommendation count.
- Never expose secrets or provider credentials to the frontend.
- Treat all model output as untrusted input.
- Validate every returned ID against the backend candidate set.
- Do not let AI output override pricing, compatibility, availability, or asset readiness.
- Avoid unbounded LLM calls; one bounded generation is preferred after deterministic candidate generation.

## Out of scope for this slice
- Autonomous purchasing/booking.
- Invented or unlicensed 3D assets.
- New recommendation analytics platform.
- Personalized user-profile learning beyond data already available to the recommendation request.
- Mobile-native redesign unrelated to the recommendation flow.

## Success criteria
A user can request a vehicle recommendation and receive a bounded, reproducible shortlist of eligible variants with trustworthy reasons; choosing a result enters the existing validated configurator; all existing production gates remain green; and no recommendation can bypass backend authority.
