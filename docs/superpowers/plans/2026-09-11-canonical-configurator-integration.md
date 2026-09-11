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

- [ ] **Step 3: Implement the minimal canonical composition**

In `backend/server.py`, import the existing helper:

```python
from configurator_composition import mount_configurator_router
```

After the existing canonical `app.include_router(api_router)` call, mount the configurator onto the same application:

```python
app.include_router(api_router)
mount_configurator_router(app, db, optional_user_phone)
```

- [ ] **Step 4: Move configurator indexes into the existing startup path**

Inside `seed_db()`, after the existing persistence indexes, add:

```python
await db.configurations.create_index("config_id", unique=True)
await db.configurations.create_index("share_token", unique=True, sparse=True)
```

Do not register a second startup function for the same production server path.

- [ ] **Step 5: Run the focused test**

Run:

```bash
cd backend && pytest tests/test_configurator_composition.py -v
```

Expected: PASS for both the helper-level route test and canonical-server route test.

- [ ] **Step 6: Commit**

```bash
git add backend/server.py backend/tests/test_configurator_composition.py
git commit -m "feat: mount configurator on canonical server app"
```

---

### Task 2: Verify complete backend and production gates

**Files:**
- No source changes unless a test exposes a genuine regression.
- Test: all `backend/tests`, frontend build, Production Gate workflow.

**Interfaces:**
- Consumes: canonical `server:app` with Phase 2 routes.
- Produces: green backend tests, frontend build, smoke tests, and independence validation.

- [ ] **Step 1: Run the complete backend suite**

```bash
cd backend && pytest -q
```

Expected: all tests pass.

- [ ] **Step 2: Run backend compilation**

```bash
python -m compileall -q backend
```

Expected: exit code 0.

- [ ] **Step 3: Run the frontend production build**

```bash
cd frontend && npm ci && npm run build
```

Expected: exit code 0 and `frontend/build` generated.

- [ ] **Step 4: Push the verified branch commit**

Push `phase-2/clean-production-integration` and wait for GitHub Actions.

- [ ] **Step 5: Verify every required workflow**

Confirm Backend Tests, Production Gate, frontend build, production smoke, and independence validation are green for the exact head SHA.

- [ ] **Step 6: Verify Vercel Preview**

Confirm the Phase 2 deployment reaches `READY` and is no longer blocked by integration provisioning.

---

### Task 3: Production runtime verification before merge

**Files:**
- No source changes unless runtime verification identifies a defect.

**Interfaces:**
- Consumes: deployed Phase 2 build and existing Render production service.
- Produces: evidence that canonical production runtime can expose configurator routes without changing Render's entrypoint prematurely.

- [ ] **Step 1: Verify current production backend remains healthy**

Check the existing Render `auto-ai-api` health endpoint before merge.

- [ ] **Step 2: Verify the Phase 2 Vercel Preview routes**

Open the generated Preview and verify the configurator frontend route loads without a JavaScript bootstrap failure.

- [ ] **Step 3: Verify backend route composition through the test/runtime gate**

Confirm the canonical application includes `/api/v1/configurator/validate`, `/api/v1/configurator/price`, and configuration persistence routes.

- [ ] **Step 4: Do not change Render's production start command before merge**

The production service must continue using:

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

The router is now part of `server.app`, so no alternate `configurator_entry:app` is required.

---

### Task 4: Final PR review and merge gate

**Files:**
- Modify only if review finds a concrete correctness issue.

- [ ] **Step 1: Compare Phase 2 against production main**

Review all changed files for accidental infrastructure, dependency, database, secret, or unrelated UI changes.

- [ ] **Step 2: Verify PR #43 release gates**

All required CI checks must be green and the Vercel Preview must be `READY`.

- [ ] **Step 3: Verify production safety**

Confirm no production MongoDB configuration, Supabase project, Stripe resource, or Render start command was changed as part of this integration.

- [ ] **Step 4: Mark PR ready for review**

Remove draft status only after all automated gates are green.

- [ ] **Step 5: Merge only after final verification**

Merge PR #43 into `main` only when the exact reviewed head SHA has passed all required checks.

- [ ] **Step 6: Verify post-merge Render deployment**

Confirm `auto-ai-api` deploys the new `main` commit successfully and `/health/ready` remains healthy.

- [ ] **Step 7: Verify post-merge production frontend**

Confirm `autoaiindia.com` serves the production frontend and that the configurator route is reachable after the merge.

---

Execution note: a one-off repository workflow has been staged to apply the two canonical `server.py` changes and then dispatch the normal verification workflows. It is self-removing and does not alter production infrastructure.
