# Production Audit Checkpoint

This branch restores the known-good backend runtime from commit `002a9ab633db3d243f4a8d96a7005b9e6f4491cf` after the production `main` branch was found to contain a large accidental `backend/server.py` truncation.

The restored runtime includes:

- `/health`
- `/health/live`
- `/health/ready`
- guarded image prewarming with `_IMAGE_CACHE` initialized before startup
- production-safe CORS validation
- Razorpay signature verification and payment idempotency protections

CI changes on this branch keep backend tests deterministic and avoid treating the live production API as a unit-test database.
