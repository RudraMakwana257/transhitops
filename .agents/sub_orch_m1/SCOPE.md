# Scope: Milestone M1 (R1 Backend Architecture Unification & Feature Completion)

## Parent Context
- Parent: Project Orchestrator (Conv ID: dca839ff-d004-46b6-a511-0ed7229e8bfe)
- Project Root: /home/zayron/Main/Hackathon/transitops
- Scope Document: /home/zayron/Main/Hackathon/transitops/.agents/sub_orch_m1/SCOPE.md
- Global Project Document: /home/zayron/Main/Hackathon/transitops/.agents/orchestrator/PROJECT.md
- Original Request File: /home/zayron/Main/Hackathon/transitops/.agents/ORIGINAL_REQUEST.md

## Objectives
1. **Model Architecture Unification**:
   - Resolve dual model structure split between legacy root `server/app/models/*.py` and public/tenant models (`server/app/models/public/*.py` & `server/app/models/tenant/*.py`).
   - Fix `Company` ↔ `VehicleHealth` relationship loading error in SQLAlchemy mappers.
   - Ensure all Pytest model mapper initialization errors (19 errors) are completely resolved.

2. **Route Schema & Field Alignment**:
   - `trips.py`: Fix `Trip.origin` → `source` query filter & `actual_start_time` → `dispatched_at`.
   - `fuel.py`: Fix `FuelLog` parameter initialization (`cost` → `total_cost`, `odometer_km` → `odometer_reading`, `vendor` → `fuel_station`).
   - `expenses.py`: Fix `Expense` query filter & model field (`category` → `type`).

3. **Sub-resource Endpoint & Dummy Stub Completion**:
   - Implement real queries for vehicle/driver sub-resources (`vehicles/<id>/trips`, `vehicles/<id>/maintenance`, `vehicles/<id>/fuel`, `drivers/<id>/trips`).
   - Complete `PUT /api/maintenance/<id>/complete` DB log update and vehicle status reset.
   - Implement vehicle recommendation logic (`GET /api/trips/recommend-vehicle`).
   - Implement real aggregate queries for expense summary (`GET /api/expenses/summary`), dashboard endpoints (`alerts`, `kpis`, `fuel-trend`, `financial-kpis`, `safety-kpis`), and analytics endpoints (`GET /api/analytics/*`).

4. **RBAC & Tenant Isolation Enforcement**:
   - Ensure `@role_required` decorators and `company_id` multi-tenant filtering are strictly applied to all backend routes and admin controllers.

## Required Iteration Loop Procedure
1. Spawn 3 **Explorer(s)** (or 2 Explorers + 1 Spec Miner) to detail exact file changes needed across `server/app/models/`, `server/app/routes/`, and `server/app/services/`.
2. Spawn a **Worker** (`teamwork_preview_worker`) with Explorer findings to implement changes and run `venv/bin/pytest tests/`.
3. Spawn 2 **Reviewer(s)** (`teamwork_preview_reviewer`) to independently review model unification, route fixes, RBAC checks, and tenant isolation.
4. Spawn 2 **Challenger(s)** (`teamwork_preview_challenger`) to stress test API endpoints and verify correctness.
5. Spawn a **Forensic Auditor** (`teamwork_preview_auditor`) to verify implementation integrity (BINARY VETO).
6. Evaluate Gate and report results back to parent orchestrator.
