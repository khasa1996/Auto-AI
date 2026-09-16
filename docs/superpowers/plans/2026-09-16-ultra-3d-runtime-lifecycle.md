# Ultra 3D Runtime Lifecycle Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the verified GLB/GLTF configurator runtime explicitly own and safely release runtime-created Three.js resources across mount, unmount, and asset replacement without disposing loader-managed source resources.

**Architecture:** Extend the existing instance-scoped lifecycle helper so runtime-created materials, geometries, and textures can be registered, deduplicated, and disposed idempotently. Keep `VehicleModel` responsible for creating a cloned runtime scene and registering only resources it owns; source GLTF resources remain loader-managed. Preserve the existing manifest-backed visual configuration and animation projection unchanged.

**Tech Stack:** React, React Three Fiber, Three.js, `@react-three/drei`, Jest.

**Spec:** `docs/superpowers/specs/2026-09-16-ultra-3d-runtime-lifecycle-design.md`

## Global Constraints

- Source GLTF scene, source geometries, source materials, and loader-managed textures remain external/shared resources.
- Runtime-created resources are instance-scoped and disposed at most once by their owner.
- No fake or fabricated production vehicle assets.
- No changes to production asset licensing/publication policy.
- No changes to the merged AI recommendation flow.
- No new animation behavior beyond lifecycle safety.
- No configurator UI redesign.
- Main must not be modified or merged without explicit approval.

---

### Task 1: Establish failing resource-ownership regression coverage

**Files:**
- Modify: `frontend/src/three/runtimeLifecycle.test.js`
- Test target: `frontend/src/three/runtimeLifecycle.js`

**Interfaces:**
- Consumes: existing `markRuntimeOwnedMaterials`, `collectOwnedMaterialResources`, and `disposeOwnedMaterialResources` behavior.
- Produces: failing tests defining generic owned-resource registration/collection and exact-once disposal for materials, geometries, and textures.

- [ ] **Step 1: Write failing tests for resource registration and deduplication**

Add tests that model resources with `dispose` functions and assert that only explicitly runtime-owned resources are collected, duplicate references are returned once, and unowned source resources remain excluded.

- [ ] **Step 2: Run the lifecycle test file to verify the new expectations fail**

Run: `cd frontend && npm test -- --runInBand src/three/runtimeLifecycle.test.js`

Expected: the newly added geometry/texture ownership expectations fail because the current helper only supports material ownership.

- [ ] **Step 3: Write the minimal generic lifecycle API implementation**

Add instance-safe helpers in `runtimeLifecycle.js` for registering resource collections, deduplicating resources, and disposing resources defensively. Keep the existing material helpers backward-compatible.

- [ ] **Step 4: Run the lifecycle test file to verify the ownership API passes**

Run: `cd frontend && npm test -- --runInBand src/three/runtimeLifecycle.test.js`

Expected: PASS, including existing material ownership tests and the new generic resource tests.

- [ ] **Step 5: Commit the lifecycle ownership helper and tests**

```bash
git add frontend/src/three/runtimeLifecycle.js frontend/src/three/runtimeLifecycle.test.js
git commit -m "test: harden three runtime resource ownership"
```

---

### Task 2: Make cloned VehicleModel resources instance-owned

**Files:**
- Modify: `frontend/src/three/VehicleModel.jsx`
- Modify: `frontend/src/three/runtimeLifecycle.js`
- Test: `frontend/src/three/runtimeLifecycle.test.js`

**Interfaces:**
- Consumes: the generic ownership/disposal API from Task 1 and the existing cloned-scene creation path.
- Produces: one ownership set per `LoadedVehicle` runtime scene, disposed during the component cleanup effect.

- [ ] **Step 1: Add failing coverage for cloned runtime resource ownership**

Extend the lifecycle tests with a cloned mesh containing a runtime-owned material and an explicitly owned geometry, plus an unowned source geometry/material. Assert cleanup disposes only the owned resources once.

- [ ] **Step 2: Run the targeted lifecycle tests and verify the new integration expectation fails**

Run: `cd frontend && npm test -- --runInBand src/three/runtimeLifecycle.test.js`

Expected: the new integration expectation fails until `VehicleModel` registers the full runtime ownership set.

- [ ] **Step 3: Implement ownership registration in VehicleModel**

During cloned-scene construction, keep the existing material cloning behavior and create an instance-owned resource set containing only resources created by that runtime clone. Register cloned geometries only when the runtime actually clones them; do not mark or dispose source scene geometry. Continue using the existing cleanup effect, but have it dispose the complete owned set.

- [ ] **Step 4: Verify configuration-only changes do not dispose the runtime scene**

Run the existing VehicleModel/runtime visual tests together with the lifecycle tests and confirm paint/interior/wheel/roof/accessory mapping remains unchanged while configuration updates reuse the same cloned scene.

Run: `cd frontend && npm test -- --runInBand src/three/runtimeLifecycle.test.js src/components/configurator/runtimeVisualConfiguration.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the VehicleModel lifecycle integration**

```bash
git add frontend/src/three/VehicleModel.jsx frontend/src/three/runtimeLifecycle.js frontend/src/three/runtimeLifecycle.test.js
git commit -m "feat: own configurator runtime resources safely"
```

---

### Task 3: Verify asset replacement and unmount lifecycle

**Files:**
- Modify: `frontend/src/three/runtimeLifecycle.test.js`
- Modify: `frontend/src/three/VehicleModel.jsx` only if a lifecycle regression is exposed

**Interfaces:**
- Consumes: instance-scoped ownership from Task 2.
- Produces: regression coverage proving old runtime resources are released and configuration-only updates do not trigger disposal.

- [ ] **Step 1: Write failing lifecycle-transition tests**

Test the ownership boundary as a sequence: runtime A is created, runtime B replaces it, A is disposed exactly once, B remains active until unmount, then B is disposed exactly once. Add a separate configuration-only transition assertion that does not call disposal.

- [ ] **Step 2: Run the targeted tests and verify the transition expectations**

Run: `cd frontend && npm test -- --runInBand src/three/runtimeLifecycle.test.js`

Expected: failures identify any duplicate cleanup, stale ownership, or premature disposal.

- [ ] **Step 3: Implement the smallest lifecycle correction required by the failing evidence**

Keep cleanup tied to the runtime instance identity rather than configuration state. Ensure cleanup is idempotent and tolerates missing optional `dispose` methods.

- [ ] **Step 4: Run lifecycle, VehicleModel, animation, and configurator visual tests**

Run: `cd frontend && npm test -- --runInBand src/three/runtimeLifecycle.test.js src/three/VehicleModel.test.jsx src/components/configurator/runtimeVisualConfiguration.test.js`

Expected: PASS with no regression in verified animation or visual configuration behavior.

- [ ] **Step 5: Commit the lifecycle regression coverage and correction**

```bash
git add frontend/src/three/runtimeLifecycle.test.js frontend/src/three/VehicleModel.jsx
git commit -m "test: cover configurator asset replacement cleanup"
```

---

### Task 4: Run complete verification and prepare review

**Files:**
- Inspect: frontend test/configuration files and CI workflow definitions as required by failures
- Modify: only files required to resolve verified lifecycle regressions

**Interfaces:**
- Consumes: all lifecycle implementation and regression coverage from Tasks 1–3.
- Produces: verified isolated branch with full frontend/backend CI gates green and no main merge.

- [ ] **Step 1: Run the complete frontend test suite**

Run: `cd frontend && npm test -- --runInBand`

Expected: PASS.

- [ ] **Step 2: Run the backend test suite**

Run: `cd backend && pytest -q`

Expected: PASS; lifecycle work must not alter backend behavior.

- [ ] **Step 3: Run repository production gates available in the project**

Run the repository's documented lint/build/check commands from its package/workflow configuration, using the exact scripts already defined by the project rather than inventing new commands.

Expected: all applicable gates PASS.

- [ ] **Step 4: Review the branch diff against the post-AI-recommendation main baseline**

Confirm changes are limited to lifecycle hardening and its documentation/tests, with no changes to the merged AI recommendation flow and no production asset fabrication.

- [ ] **Step 5: Commit any final verification-only documentation adjustment if required**

Use a focused commit message only if an actual documentation correction is needed; otherwise leave the verified implementation commits intact.

- [ ] **Step 6: Stop before merging**

Report branch name, commits, test results, changed files, and remaining production-asset dependency. Do not merge into `main` until Abhishek explicitly approves the merge.
