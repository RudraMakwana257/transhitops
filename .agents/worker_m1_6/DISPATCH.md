## 2026-08-06T16:35:00Z

<USER_REQUEST>
You are worker_m1_6 for Milestone M1 (Backend Architecture Unification & Feature Completion) of TransitOps.

Working directory for agent metadata: /home/zayron/Main/Hackathon/transitops/.agents/worker_m1_6
Original request file: /home/zayron/Main/Hackathon/transitops/.agents/ORIGINAL_REQUEST.md
Codebase root: /home/zayron/Main/Hackathon/transitops/server

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please read the following explorer handoff blueprints carefully before implementing:
- /home/zayron/Main/Hackathon/transitops/.agents/explorer_m1_1_r1/handoff.md (Task 1: Model Architecture & Mapper Collision Fix)
- /home/zayron/Main/Hackathon/transitops/.agents/explorer_m1_2_r1/handoff.md (Tasks 2-4: Route Field Mismatches, Maintenance Complete Endpoint, Vehicle Recommendation)
- /home/zayron/Main/Hackathon/transitops/.agents/explorer_m1_3_r1/handoff.md (Tasks 5-6: Response Standardization & Dashboard/Analytics SQL Aggregations)

Your tasks to implement and verify:
1. Task 1: Fix root vs public/tenant SQLAlchemy mapper collisions:
   - Update `server/app/models/__init__.py`, `server/app/models/public/__init__.py`, `server/app/models/tenant/__init__.py` to re-export root `app.models` classes.
   - Deprecate/clean duplicate DeclarativeBase model classes in `public/` and `tenant/` so SQLAlchemy only registers canonical `db.Model` classes.
   - Ensure all root models (`Company`, `User`, `Vehicle`, `Driver`, `Trip`, `TripEvent`, `MaintenanceLog`, `FuelLog`, `Expense`, `Notification`, `VehicleHealth`, `AuditLog`, `CompanyFeature`, `CompanySubscription`, `SubscriptionPlan`, `LoginAttempt`, `PasswordResetToken`) have correct relationships and attributes.

2. Task 2: Fix route field mismatches across routes and services:
   - `trips.py`: replace `Trip.origin` with `Trip.source`, update `update_trip` updatable fields list and fallback for `origin`.
   - `trip_service.py`: replace `trip.actual_start_time` with `trip.dispatched_at`.
   - `fuel.py`: update `create_log` and `update_log` to use `total_cost`, `odometer_reading`, `fuel_station` with backward-compatible fallbacks for `cost`, `odometer_km`, `vendor`.
   - `expenses.py`: update `list_expenses`, `create_expense`, `update_expense` to use `Expense.type` instead of `category`.

3. Task 3: Implement `PUT /api/maintenance/<id>/complete` endpoint:
   - Update `server/app/routes/maintenance.py` to fetch `MaintenanceLog`, set status to `'Completed'`, set completion date/time, update cost/notes, reset associated vehicle status from `'In Shop'` to `'Available'`, create a notification, and commit to DB.

4. Task 4: Implement `GET /api/trips/recommend-vehicle` endpoint:
   - Update `server/app/routes/trips.py` to query active available vehicles for tenant company matching `capacity_kg >= cargo_weight`, calculate score (capacity utilization score + health score), and return sorted recommendations list.

5. Task 5: Standardize Flask route responses:
   - Create `server/app/utils/response.py` with `standard_response`, `success_response`, `error_response`.
   - Refactor Flask route blueprints to ensure all JSON responses follow `{ success: bool, data: dict/list/null, message: str/null, error: str/null }`.
   - Fix `GET /api/onboarding/status` to nest payload inside `data`.

6. Task 6: Replace synthetic mock data in Dashboard/Analytics with real SQL aggregations:
   - Refactor all 9 endpoints in `server/app/routes/dashboard.py` and `server/app/routes/analytics.py` using real SQLAlchemy SQL queries over database tables (`FuelLog`, `MaintenanceLog`, `Expense`, `Trip`, `Vehicle`, `Driver`), scoped by `g.company_id`.

Verification:
- Run backend pytest tests (`pytest tests/` and `python3 test_phase1.py` or equivalent in `server/`).
- Document all modified files, test outputs, and verification commands in `/home/zayron/Main/Hackathon/transitops/.agents/worker_m1_6/handoff.md`.
- Send a completion message back to the orchestrator when done.
</USER_REQUEST>
