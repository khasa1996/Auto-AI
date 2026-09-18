# Legacy catalog migration boundary

The existing `cars` collection is a legacy flat vehicle dataset. It is useful as
migration input but is **not** a production configurator catalog.

## Adapter contract

`backend/legacy_configurator_adapter.py` converts legacy records into canonical
identity candidates without writing to MongoDB.

Every candidate remains:

- `verification_status: unverified`
- `configurator_status: COMING_SOON`
- `migration_status: REVIEW_REQUIRED`
- linked to the original `legacy_car_id`

The adapter does not manufacture pricing, options, 3D assets, provenance,
licenses, checksums, or publication evidence.

## Promotion boundary

A candidate must later be replaced by authoritative, verified records for:

1. Brand/model/variant identity.
2. Variant pricing and city pricing.
3. Compatible colors, wheels, and interiors.
4. Authorized/licensed 3D asset and published active revision.
5. Source/provenance and validation evidence.

Only then can the existing readiness contract evaluate the variant as production-ready.

No production database writes are performed by this adapter.
