# Production vehicle onboarding

A vehicle variant may be exposed as a production configurator vehicle only when the readiness contract passes.

## Required evidence

- Active, verified variant identity.
- Authoritative verified pricing with source.
- Available color, wheel, and interior options for the exact variant.
- Exact published, technically validated, reviewed 3D asset assigned to the variant.
- Asset provenance and licensing suitable for production publication.
- Semantic material/mesh/animation mappings matching the inspected asset.

The readiness API is deterministic and reports blockers instead of inventing missing data. A failed readiness check must remain a `3D Coming Soon`/unavailable state.

## First production vehicle

GitHub issue #60 tracks the first authorized production asset onboarding. The external vehicle data and asset rights are intentionally not fabricated in the repository.
