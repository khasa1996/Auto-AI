# Vercel Preview Provisioning Blocker

## Current state

As of 2026-09-11, Vercel Preview deployments for `phase-2/clean-production-integration` are failing before the application build starts.

Observed deployment state:

- Vercel project: `auto-ai`
- Project ID: `prj_179Zcvdq6lCWqlLZAfXDiSXSI0mQ`
- Branch: `phase-2/clean-production-integration`
- Latest tested commit: `96e3853fe57f23312f9da1463094fc8753835397`
- Error code: `BUILD_FAILED`
- Error message: `Resource provisioning failed`
- Build log events: none

The same failure occurred across multiple commits on the clean integration branch. This distinguishes the current blocker from ordinary application compilation failures.

## Evidence

The latest deployment reached `ERROR` immediately with `Resource provisioning failed`, while the Vercel build-log endpoint returned no build events.

The same Vercel project previously produced successful Preview deployments for the earlier 3D/configurator branches, including `phase-2/vehicle-data-and-configurator-foundation` and `phase-2/premium-3d-upgrade`.

The current frontend is a Create React App/CRACO application. Its `frontend/package.json` declares React 18, CRACO, `craco build`, and Node `>=20 <23`. The Vercel project metadata currently reports framework `nitro`; this should be treated as a project-level configuration signal, not as proof of an application build failure.

## Safety decision

Do not change production domains, production deployment targets, or production environment variables merely to work around this Preview-only provisioning failure.

Production remains on the known-good `main` deployment until the configurator release path has passed its own runtime gates.

## Resolution path

1. Inspect the Vercel project-level framework/root/build configuration.
2. Confirm the project is configured for the `frontend` CRA application rather than Nitro.
3. Re-run a clean Preview deployment after configuration correction.
4. If provisioning still fails before build, escalate the deployment ID and timestamp to Vercel support because there is no application build log to diagnose.
5. Do not represent a Preview provisioning repair as an application-code fix unless a subsequent build actually executes and passes.

## Production requirement

A successful Preview is not sufficient by itself. Before enabling the configurator in production, also verify:

- backend configurator routes against a runtime containing the Phase 2 backend code;
- authentication and ownership behavior;
- backend-authoritative pricing validation;
- frontend configurator route;
- graceful no-asset state;
- real licensed GLB/GLTF asset provenance before any vehicle is published.
