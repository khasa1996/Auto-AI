# Auto AI India — Car Asset Audit

**Audit date:** 2026-09-03  
**Scope:** MongoDB Atlas car catalog and repository asset references  
**Production policy:** `main` remains untouched until all verification gates pass.

## Verified MongoDB findings

The connected MongoDB Atlas project `Auto AI` contains two car collections:

- `auto_ai.cars`: 106 documents
- `autoai.cars`: 106 documents

Both collections have unique `id` values. Grouping by `(brand, model)` also produced no duplicate model groups in either collection.

The live car schema currently contains the legacy catalog fields only. It does **not** contain source/provenance fields or a 3D asset contract.

## Image-quality finding

The catalog is not currently using model-specific OEM imagery consistently. Multiple unrelated vehicles reuse the same generic Unsplash image URL. The largest observed duplicate image groups include 12, 10, 9, 7, 7, 6, 6 and 5 vehicles respectively.

This is a data-quality defect for a premium automotive showroom because a vehicle card can display an image that does not represent the selected vehicle.

The audit did not find direct `carwale`, `cardekho`, `car-dekho`, or `stimg` URL strings in the live `image` fields. However, repository code still contains CarWale-specific coupling, including a CarWale referer in the image proxy and a CarWale attribution comment in `frontend/src/lib/carImages.js`.

## 3D asset finding

No verified 3D asset field is present in the live car collection. The Phase 2 frontend viewer correctly refuses to treat ordinary image URLs as 3D models and shows an explicit asset-required state when no verified GLB/GLTF URL exists.

The catalog must not claim that a vehicle has a live 3D model until a legitimate model asset and provenance record are present.

## Required remediation

1. Introduce explicit image provenance metadata.
2. Classify existing image assets before replacement or deletion.
3. Quarantine unknown/unverified assets rather than silently presenting them as OEM imagery.
4. Replace repeated generic vehicle imagery with legitimate model-specific assets where licensing permits.
5. Remove unnecessary CarWale-specific coupling from the generic image proxy.
6. Introduce a verified 3D asset contract with provenance before publishing any model.
7. Add ingestion validation so future imports cannot silently reintroduce generic, duplicated, or unverified assets.
8. Keep the two MongoDB catalogs synchronized and establish one canonical production database/collection.

## Safety rule

Do **not** mass-delete the current 106 records from either database as part of this remediation. Preserve the existing data until each record has been classified and a replacement/rollback path exists.
