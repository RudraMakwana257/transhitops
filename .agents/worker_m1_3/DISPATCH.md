# Task Dispatch: Milestone M1 Worker 3

## Identity & Context
- **Role**: teamwork_preview_worker (Implementer / QA Specialist)
- **Working Directory**: /home/zayron/Main/Hackathon/transitops/.agents/worker_m1_3
- **Project Root**: /home/zayron/Main/Hackathon/transitops
- **Milestone**: Milestone M1 (Backend Architecture Unification & Feature Completion)

## Reference Documents
Please carefully read the following detailed Explorer Handoff Reports before implementing:
1. /home/zayron/Main/Hackathon/transitops/.agents/explorer_m1_1_r1/handoff.md (Task 1: Model Mapper Collisions)
2. /home/zayron/Main/Hackathon/transitops/.agents/explorer_m1_2_r1/handoff.md (Tasks 2, 3, 4: Route Field Mismatches, Maintenance Complete, Vehicle Recommendation)
3. /home/zayron/Main/Hackathon/transitops/.agents/explorer_m1_3_r1/handoff.md (Tasks 5, 6: Response Standardization & SQL Aggregations)
4. /home/zayron/Main/Hackathon/transitops/.agents/ORIGINAL_REQUEST.md
5. /home/zayron/Main/Hackathon/transitops/PROJECT.md

## Scope & Target Tasks

### Task 1: Fix SQLAlchemy Mapper Collisions
- Unify models in `server/app/models/*.py`.
- Update `server/app/models/__init__.py` to re-export all canonical models.
- Update `server/app/models/public/__init__.py` and `server/app/models/tenant/__init__.py` to re-export from `app.models`.
- Ensure zero `InvalidRequestError` or duplicate mapper declarations exist.

### Task 2: Fix Route Field Mismatches
- `trips.py`: Fix `origin` -> `source` query filter & `actual_start_time` -> `dispatched_at`.
- `trip_service.py`: Fix `trip.actual_start_time` -> `trip.dispatched_at`.
- `fuel.py`: Fix `cost` -> `total_cost`, `odometer_km` -> `odometer_reading`, `vendor` -> `fuel_station`.
- `expenses.py`: Fix `category` -> `type` filtering and creation.

### Task 3: Implement Maintenance Completion Endpoint
- In `server/app/routes/maintenance.py`, implement `PUT /api/maintenance/<id>/complete`.
- Update maintenance log status to `'Completed'`, set completion timestamp (`completed_date` / `completed_at`).
- Automatically update vehicle status from `'In Shop'` to `'Available'` if applicable.

### Task 4: Implement Vehicle Recommendation Algorithm
- In `server/app/routes/trips.py`, implement `GET /api/trips/recommend-vehicle`.
- Filter active available vehicles with capacity >= requested cargo weight.
- Score vehicles using capacity utilization ratio + health score. Return sorted recommendations array.

### Task 5: Standardize All Route Responses
- Create `server/app/utils/response.py` with standard helpers (`standard_response`, `success_response`, `error_response`).
- Refactor all Flask route blueprints in `server/app/routes/` and `server/app/routes/admin/` to return uniform JSON schema `{ success, data, message, error }`.
- Fix `GET /api/onboarding/status` to nest payload inside `"data"`.

### Task 6: Real SQL Aggregations in Dashboard & Analytics
- Replace all synthetic loops and hardcoded dictionaries across `dashboard.py` (fuel-trend, financial-kpis, safety-kpis, alerts) and `analytics.py` (fuel-efficiency, fleet-utilization, operational-cost, vehicle-roi, driver-performance) with real SQLAlchemy aggregate queries scoped to `g.company_id`.

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Completion Criteria & Verification
- Execute `pytest` and `python3 test_phase1.py` inside `server/` directory.
- Confirm all tests pass with 0 failures.
- Document exact files changed, build/test results, and detailed verification output in your `handoff.md`.
- Report completion back via `send_message`.
