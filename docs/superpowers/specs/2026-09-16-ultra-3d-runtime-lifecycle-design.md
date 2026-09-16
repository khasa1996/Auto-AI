# Ultra 3D Runtime Lifecycle Hardening — Design

## Status
Proposed for implementation review.

## Context
The production configurator now uses verified manifest-backed GLB/GLTF assets. `VehicleModel` clones the loaded scene and clones mesh materials so runtime paint/interior changes do not mutate the source asset. The current lifecycle helper tracks owned materials and disposes them on React cleanup.

The next boundary is to make resource ownership explicit and safe across repeated asset/configuration changes, while preserving the manifest-backed visual configuration and animation systems.

## Goals
- Prevent GPU/resource leaks when a configured vehicle is replaced or unmounted.
- Dispose only resources created/owned by the configurator runtime.
- Cover geometries, cloned materials, and runtime-created textures where applicable.
- Avoid disposing shared source GLTF resources owned by Drei/Three loaders.
- Avoid stale references after asset replacement.
- Preserve paint, interior, wheel, roof, accessory, and verified animation mappings.
- Add regression tests that exercise repeated lifecycle transitions.

## Non-goals
- No new vehicle assets or fabricated production assets.
- No changes to production asset licensing/publication policy.
- No changes to the merged AI recommendation flow.
- No new animation behavior beyond lifecycle safety.
- No redesign of the configurator UI.

## Approaches considered

### 1. Dispose the complete scene recursively
Simple, but unsafe because loader-managed/shared resources can be disposed while still referenced elsewhere.

### 2. Track runtime-owned resources explicitly — selected
Clone the scene, mark or register resources created by the runtime, collect them deterministically, and dispose only those resources during cleanup. This keeps ownership aligned with the existing cloned-material model and is testable without requiring browser GPU integration.

### 3. Global Three.js resource manager
A centralized reference-counting layer could manage all resources across the application, but it adds complexity and scope before the configurator has multiple independent consumers requiring shared resource ownership.

## Design

### Resource ownership
- Source GLTF scene, source geometries, source materials, and loader-managed textures remain external/shared resources.
- Runtime-created material clones are owned by the cloned vehicle instance.
- If runtime code creates texture instances or geometry clones in future lifecycle paths, those resources must be registered with the same owner before use.
- Ownership is instance-scoped; a resource is disposed at most once by its owner.

### Cleanup boundary
`VehicleModel` owns the lifecycle of the cloned runtime scene. On replacement/unmount, cleanup runs for the previous instance and releases only registered runtime-owned resources.

The cleanup implementation must be idempotent and tolerate duplicate references. It must not traverse into the original loader scene and dispose source resources.

### React lifecycle
The implementation will use memoized runtime instances plus effect cleanup so that:
1. first mount creates one owned runtime set;
2. a new GLB/scene identity creates a new owned set;
3. cleanup of the old instance occurs exactly once;
4. unmount releases the current instance;
5. configuration-only changes do not recreate or dispose the scene unnecessarily.

### Configuration compatibility
The existing manifest-backed projection remains authoritative. Lifecycle changes must not alter option IDs, material mappings, mesh visibility, or verified animation mapping semantics.

## Testing strategy
Tests are written first and must demonstrate the failure mode before implementation where practical.

Required coverage:
- owned resource registration/collection;
- duplicate-reference deduplication;
- disposal of owned materials/geometries/textures exactly once;
- source/shared resources are not disposed;
- cleanup is safe when resources are already disposed or absent;
- runtime replacement releases the previous instance before its ownership becomes stale;
- configuration-only changes do not trigger scene resource disposal;
- existing `VehicleModel` visual configuration and animation tests remain green.

The full frontend/backend CI gates must pass before this work is considered complete.

## Failure handling
- Invalid or unavailable verified assets continue to fail closed through the existing readiness/runtime gates.
- Resource cleanup failures must not cause the configurator to silently fall back to synthetic imagery.
- Cleanup functions should be defensive and non-throwing for missing optional disposal methods.

## Acceptance criteria
- No known lifecycle path leaks runtime-created material/geometry/texture resources.
- Shared loader resources remain untouched by runtime cleanup.
- Replacing the configured vehicle does not retain the previous runtime resource set.
- Existing verified visual configuration behavior remains unchanged.
- Regression tests cover the ownership boundary and pass.
- Full CI passes on the isolated branch.
- Main is not modified or merged without explicit approval.
