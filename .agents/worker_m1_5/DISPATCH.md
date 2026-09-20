## 2026-08-06T21:37:49Z
You are teamwork_preview_worker (worker_m1_5) executing Milestone M1: Backend Architecture Unification & Feature Completion for TransitOps.

Your Working Directory for metadata: /home/zayron/Main/Hackathon/transitops/.agents/worker_m1_5
Project Root: /home/zayron/Main/Hackathon/transitops

Please read the following authoritative specification files FIRST before starting work:
- /home/zayron/Main/Hackathon/transitops/.agents/ORIGINAL_REQUEST.md
- /home/zayron/Main/Hackathon/transitops/PROJECT.md
- /home/zayron/Main/Hackathon/transitops/.agents/explorer_m1_1_r1/handoff.md
- /home/zayron/Main/Hackathon/transitops/.agents/explorer_m1_2_r1/handoff.md
- /home/zayron/Main/Hackathon/transitops/.agents/explorer_m1_3_r1/handoff.md

Tasks to execute:
1. Fix SQLAlchemy mapper collisions across models (`server/app/models/`):
   - Unify models onto the canonical root models (`server/app/models/*.py`).
   - Update `server/app/models/__init__.py`, `server/app/models/public/__init__.py`, and `server/app/models/tenant/__init__.py` to re-export canonical models. Remove duplicate declarations in public/ and tenant/ subfolders that collide with root models.
2. Fix route field mismatches:
   - `server/app/routes/trips.py`: `origin` -> `source`.
   - `server/app/services/trip_service.py`: `actual_start_time` -> `dispatched_at`.
   - `server/app/routes/fuel.py`: `cost` -> `total_cost`, `odometer_km` -> `odometer_reading`, `vendor` -> `fuel_station`.
   - `server/app/routes/expenses.py`: `category` -> `type`.
3. Implement `PUT /api/maintenance/<id>/complete` endpoint and vehicle status reset in `server/app/routes/maintenance.py`.
   - Update log status to 'Completed', set completed timestamp, reset vehicle status from 'In Shop' to 'Available'.
4. Implement `GET /api/trips/recommend-vehicle` algorithmic selection in `server/app/routes/trips.py`.
   - Filter active available vehicles with capacity >= `cargo_weight`, score fit based on capacity utilization (max 50) + health score (max 50), return sorted array.
5. Standardize all Flask route responses to `{ success, data, message, error }`:
   - Create `server/app/utils/response.py` with standard response helpers.
   - Refactor blueprints in `server/app/routes/` and `server/app/routes/admin/` to use standardized responses.
   - Fix `GET /api/onboarding/status` payload to nest fields inside `data`.
6. Replace synthetic mock data in Dashboard & Analytics endpoints with real SQL aggregate queries:
   - Refactor 9 endpoints across `server/app/routes/dashboard.py` and `server/app/routes/analytics.py` to run real SQLAlchemy aggregate queries scoped to `g.company_id`.
