# Production Audit Checkpoint

This branch restores the known-good backend runtime from commit `002a9ab633db3d243f4a8d96a7005b9e6f4491cf` and keeps CI focused on deterministic local tests.

The production API exposes `/health`, `/health/live`, and `/health/ready` for deployment checks.
