# Project: TransitOps Intelligent Fleet Operations Center

## Architecture
- **Backend**: Flask (Python 3) using SQLAlchemy ORM, Alembic migrations, PostgreSQL, JWT Authentication, Marshmallow schemas, Flask-Limiter.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Zustand state management, Axios client.
- **Data Flow & Multi-Tenancy**: Every tenant request carries JWT Bearer token containing `company_id` and `user.role`. Middleware extracts tenant context for scoping database queries.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Model Architecture Unification | Fix root vs public/tenant SQLAlchemy mapper collision | M1 | survey |
| 2 | Trip Route Fixes | Fix `origin` -> `source` and `actual_start_time` -> `dispatched_at` | M1 | survey |
| 3 | Fuel Route Fixes | Fix `cost` -> `total_cost`, `odometer_km` -> `odometer_reading`, `vendor` -> `fuel_station` | M1 | survey |
| 4 | Expense Route Fixes | Fix `category` -> `type` in filtering and creation | M1 | survey |
| 5 | Maintenance Complete Endpoint | Implement `PUT /api/maintenance/<id>/complete` DB update & vehicle status reset | M1 | survey |
| 6 | Vehicle Recommendation | Implement `GET /api/trips/recommend-vehicle` algorithmic selection | M1 | survey |
| 7 | Dashboard & Analytics Aggregations | Replace synthetic mock data with real SQL aggregate queries | M1 | survey |
| 8 | Sub-resource Pagination | Implement pagination for vehicle/driver sub-resource endpoints | M1 | survey |
| 9 | Frontend Store Fixes | Fix dispatch toast message and remove GET detail toasts | M2 | survey |
| 10| Frontend API Endpoint Alignment | Align `api.settings` helper with `/settings/users` route | M2 | survey |
| 11| Frontend Build & Type Check Verification | Ensure `npm run build` and `tsc` pass with 0 errors | M2 | survey |
| 12| UI/API Integration & RBAC | Verify 28 page routes, RBAC visibility, multi-tenant headers | M2 | survey |
| 13| Vehicle State Machine Guards | Enforce `Available` ↔ `On Trip` ↔ `In Shop` transition rules | M3 | survey |
| 14| Trip Lifecycle Guards | Enforce `Draft` → `Dispatched` → `Completed` / `Cancelled` transitions | M3 | survey |
| 15| Dispatch Eligibility Checks | Enforce driver license expiry, vehicle capacity, availability checks | M3 | survey |
| 16| Backend Test Suite Clean Run | Achieve 100% pass rate on `pytest tests/` (113/113) | M3 | survey |
| 17| Business Logic Test Suite | Add `test_business_logic.py` covering negative dispatch cases | M3 | survey |
| 18| E2E & Phase Script Verification | Validate `test_phase1/2/3.py` and `run_checks.sh` pass cleanly | M3 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Architecture Unification & Feature Completion | Fix models, routes, schemas, stubs, and SQL aggregations | none | IN_PROGRESS |
| M2 | Frontend UI/API Integration & Security Enforcement | Fix stores, API helpers, build clean, verify RBAC/tenant isolation | M1 | PLANNED |
| M3 | Business Logic Safeguards & Automated Testing | Enforce state machines, dispatch eligibility, complete test suite | M1, M2 | PLANNED |

## Code Layout
- Backend: `/home/zayron/Main/Hackathon/transitops/server`
  - `app/models/`: SQLAlchemy ORM model classes
  - `app/routes/`: 16 Flask route blueprints
  - `app/services/`: Business logic services (`trip_service.py`, `notification_service.py`)
  - `app/middleware/`: Auth, RBAC, tenant isolation middleware
  - `tests/`: Pytest suite files
- Frontend: `/home/zayron/Main/Hackathon/transitops/client`
  - `src/pages/`: 28 React page components
  - `src/stores/`: Zustand state management stores
  - `src/api/`: Axios API clients (`client.ts`, `index.ts`)
  - `src/components/`: Reusable UI components & layouts
