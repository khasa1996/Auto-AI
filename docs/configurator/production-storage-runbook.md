# Auto AI India — Configurator Production Asset Storage Runbook

## Purpose

This runbook defines the production controls required before verified 3D vehicle assets are uploaded or published through the Configurator Asset Manager.

The application supports S3-compatible object storage and never requires storage credentials in frontend code.

## Required environment variables

Configure these only on the backend service (for example, Render):

- `ASSET_STORAGE_BUCKET`
- `ASSET_STORAGE_REGION`
- `ASSET_STORAGE_ACCESS_KEY_ID`
- `ASSET_STORAGE_SECRET_ACCESS_KEY`
- `ASSET_STORAGE_ENDPOINT_URL` — optional for S3-compatible providers other than AWS S3
- `ASSET_STORAGE_PUBLIC_BASE_URL` — optional CDN/public delivery base URL
- `ASSET_STORAGE_UPLOAD_TTL_SECONDS` — 60–3600 seconds; default 900

Never place access keys, secret keys, or bucket credentials in:

- React environment variables (`REACT_APP_*`)
- GitHub source files
- browser requests
- screenshots, tickets, or chat messages

## Bucket security baseline

1. Keep the object bucket private when the selected provider supports private origin access.
2. Deliver published GLB files through an explicit CDN/public delivery layer when possible.
3. Do not enable anonymous bucket listing.
4. Restrict the backend IAM/service account to the configurator asset prefix required by the application.
5. Permit object writes only for the backend-issued presigned upload flow.
6. Do not grant delete permissions to the application unless a future retention workflow explicitly requires them.
7. Enable provider-side encryption at rest.
8. Enable object versioning where supported. Application-level revisions remain the authoritative rollback history.
9. Enable access logging/audit logging where available.
10. Configure lifecycle retention for abandoned upload objects only after confirming that application revision retention is unaffected.

## CORS baseline

The storage bucket must allow the production frontend origin to perform browser uploads using the presigned URL.

Allow:

- the production origin `https://autoaiindia.com`
- the production `www` origin if used
- approved Vercel preview origins during controlled QA, if preview uploads are intentionally enabled

Allow method:

- `PUT`

Allow request header:

- `Content-Type`

Expose only headers needed by the browser upload flow. Do not use wildcard origins for production storage uploads.

## Upload lifecycle

```text
Admin Asset Manager
      |
      | authenticated request
      v
Backend upload-url endpoint
      |
      | short-lived presigned PUT URL
      v
S3-compatible object storage
      |
      | direct browser upload
      v
Backend finalize endpoint
      |
      +--> object size check (<= 200 MB)
      +--> streamed object read
      +--> SHA-256 integrity check
      +--> GLB v2 structural inspection
      +--> manifest/name validation
      +--> technical validation
      v
Admin technical review
      |
      v
Publication gate
      |
      v
Published configurator asset
```

## Publication gates

A vehicle asset must not become publicly selectable merely because a file exists in storage.

Before publication, verify all of the following:

- GLB structure is valid.
- File is within the 200 MB limit.
- SHA-256 checksum is recorded.
- Manifest matches inspected mesh/node/material/animation names.
- Required configurator capabilities are represented by verified asset mappings.
- Provenance is `OEM_AUTHORIZED`, `AUTO_AI_LICENSED`, or `LICENSED_THIRD_PARTY`.
- License name and publisher are recorded.
- Technical validation has passed.
- Admin review has been approved.
- Commercial use, modification/optimization, web delivery, and required redistribution/display rights are documented outside the code repository.

## Versioning and rollback

Before replacing an existing stored asset, the official uploader snapshots the current verified asset revision. Previous storage objects are retained; rollback restores a validated and reviewed revision rather than reconstructing an asset from frontend state.

Rollback targets must have:

- a verified storage key
- a checksum
- technical validation passed
- admin review approved

Never delete the previous production object as part of a normal replacement. Retention and deletion should be a separate controlled lifecycle process.

## Operational readiness checklist

Before enabling production uploads:

- [ ] Create the production storage bucket.
- [ ] Create a least-privilege service identity for backend access.
- [ ] Configure backend secrets privately.
- [ ] Configure storage CORS for approved frontend origins.
- [ ] Configure private origin/CDN delivery if applicable.
- [ ] Confirm `ASSET_STORAGE_PUBLIC_BASE_URL` resolves to the actual GLB delivery path.
- [ ] Upload a small test GLB through the admin UI.
- [ ] Confirm finalize records checksum, size, inspection and validation status.
- [ ] Confirm an unreviewed asset cannot be published.
- [ ] Confirm an invalid asset is rejected.
- [ ] Confirm rollback restores a previously reviewed revision.
- [ ] Confirm the public configurator only receives published + technically validated assets.
- [ ] Remove test assets after verification using the storage provider's controlled retention process.

## Incident response

If a published asset is suspected to be incorrect or unauthorized:

1. Unpublish the asset immediately through the admin publication control.
2. Keep the stored object and revision history intact for investigation.
3. Record the reason in the review/audit notes.
4. Replace it only with a verified asset revision.
5. Re-run technical validation and admin review before republishing.
6. If the issue is licensing/provenance related, block publication until rights documentation is corrected.

This runbook is an operational control document, not legal advice. Commercial vehicle trademarks, designs, imagery and other intellectual-property rights must be cleared through the appropriate rights holder or legal process before production publication.
