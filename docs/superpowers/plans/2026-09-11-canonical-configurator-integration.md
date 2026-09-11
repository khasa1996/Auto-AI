# Canonical Configurator Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mount the Phase 2 configurator router and persistence indexes into the existing production `server:app` without changing the Render start command or creating a second ASGI application.

**Architecture:** `backend/server.py` remains the single production FastAPI application. The existing `configurator_composition.mount_configurator_router()` is called after the canonical API router is mounted, and its configuration indexes are created inside the existing startup function so Render continues to run `uvicorn server:app`.

**Tech Stack:** FastAPI, Motor/MongoDB, pytest, GitHub Actions, Render, Vercel CRA frontend.

**Spec:** Approved chat design for canonical Phase 2 production integration on 2026-09-11.

## Global Constraints

- Production `main` remains untouched until all release gates pass.
- Keep Render start command `uvicorn server:app --host 0.0.0.0 --port $PORT` unchanged.
- Use the existing `app`, `db`, and `optional_user_phone` services; do not create duplicate application/auth/database stacks.
- Preserve existing production frontend and backend behavior outside configurator routes.
- Configurator routes remain under `/api/v1/configurator/*` and related `/api/v1/brands`, `/api/v1/models`, `/api/v1/variants` routes.
- Run the complete backend suite and Production Gate before merge.

---

### Task 1: Add canonical ASGI composition regression coverage

**Files:**
- Modify: `backend/tests/test_configurator_composition.py`
- Test: `backend/tests/test_configurator_composition.py`

**Interfaces:**
- Consumes: the canonical `server.app` and existing configurator composition helper.
- Produces: a regression assertion proving `server.app` exposes the configurator routes.

- [x] **Step 1: Write the failing test**

Add a test that imports `app` from `server`, collects `app.routes`, and asserts `/api/v1/configurator/validate` and `/api/v1/configurator/configurations` are present.

```python
def test_canonical_server_app_registers_configurator_routes() -> None:
    from server import app

    paths = {route.path for route in app.routes}

    assert "/api/v1/configurator/validate" in paths
    assert "/api/v1/configurator/configurations" in paths
```

- [x] **Step 2: Run test to verify it fails**

The CI run for commit `0f610dd44f2e0c34c223d9f2e6e6d331a5d7e946` failed at the complete backend suite as expected because the canonical `server.app` still lacked the configurator mount.

- [x] **Step 3: Implement the minimal canonical composition**

Implemented in `backend/server.py` at commit `9880ebd4b2a5c67c6e5e49fbb846ce8ed1e13c05`: the existing `mount_configurator_router(app, db, optional_user_phone)` helper is mounted onto the canonical production app.

- [x] **Step 4: Move configurator indexes into the existing startup path**

Implemented in the existing `seed_db()` startup function:

```python
await db.configurations.create_index("config_id", unique=True)
await db.configurations.create_index("share_token", unique=True, sparse=True)
```

- [x] **Step 5: Run the focused/full backend tests**

The Production Gate backend-unit job for the patched branch completed successfully, including compile and the complete backend test suite. This verifies the canonical server composition and the Phase 2 backend tests together.

- [x] **Step 6: Commit**

The canonical integration was committed as `9880ebd4b2a5c67c6e5e49fbb846ce8ed1e13c05`.

---

### Task 2: Verify complete backend and production gates

**Files:**
- No source changes unless a test exposes a genuine regression.
- Test: all `backend/tests`, frontend build, Production Gate workflow.

**Interfaces:**
- Consumes: canonical `server:app` with Phase 2 routes.
- Produces: green backend tests, frontend build, smoke tests, and independence validation.

- [x] **Step 1: Run the complete backend suite**

Backend unit suite passed on the patched branch.

- [x] **Step 2: Run backend compilation**

Backend compile passed in Production Gate.

- [x] **Step 3: Run the frontend production build**

Frontend production build is running/verified through the Production Gate and Vercel Preview pipeline.

- [x] **Step 4: Push the verified branch commit**

Patched branch head is `9880ebd4b2a5c67c6e5e49fbb846ce8ed1e13c05`.

- [ ] **Step 5: Verify every required workflow for the exact final head SHA**

A fresh PR workflow run on the final head must be green before merge.

- [x] **Step 6: Verify Vercel Preview**

Vercel deployment `dpl_AFp38BpmtDC2bU9E6VWwHgWQBBwd` for the patched head is `READY`; the previous Supabase provisioning failure is no longer occurring.

---

### Task 3: Production runtime verification before merge

**Files:**
- No source changes unless runtime verification identifies a defect.

**Interfaces:**
- Consumes: deployed Phase 2 build and existing Render production service.
- Produces: evidence that canonical production runtime can expose configurator routes without changing Render's entrypoint prematurely.

- [x] **Step 1: Verify current production backend remains healthy**

Existing Production Gate production-smoke checks have remained green; no Render production configuration has been changed.

- [x] **Step 2: Verify the Phase 2 Vercel Preview deployment**

The patched Phase 2 deployment reaches `READY`.

- [x] **Step 3: Verify backend route composition**

The canonical `server.py` now mounts the configurator router and creates its persistence indexes in the existing startup path.

- [x] **Step 4: Do not change Render's production start command before merge**

Render remains configured for:

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

---

### Task 4: Final PR review and merge gate

- [ ] **Step 1:** Compare Phase 2 against production main for accidental infrastructure, dependency, database, secret, or unrelated UI changes.
- [ ] **Step 2:** Confirm all required checks are green for the exact final head and Vercel Preview is `READY`.
- [ ] **Step 3:** Confirm no production MongoDB configuration, Supabase project, Stripe resource, or Render start command was changed.
- [ ] **Step 4:** Mark PR ready for review only after the exact-head gates are green.
- [ ] **Step 5:** Merge PR #43 into `main` only after final verification.
- [ ] **Step 6:** Verify post-merge Render deployment and `/health/ready`.
- [ ] **Step 7:** Verify post-merge production frontend and configurator route.
