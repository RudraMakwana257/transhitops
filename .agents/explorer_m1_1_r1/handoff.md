# Handoff Report — Task 1 of Milestone M1: Fix Root vs. Public/Tenant SQLAlchemy Mapper Collisions

## 1. Observation

### 1.1 Dual Model Hierarchy Collision
The TransitOps backend codebase currently contains two distinct, conflicting SQLAlchemy ORM model trees under `/home/zayron/Main/Hackathon/transitops/server/app/models`:

1. **Root Model Tree (`server/app/models/*.py`)**:
   - Defined using Flask-SQLAlchemy `app.db.Model`.
   - Files: `company.py`, `user.py`, `vehicle.py`, `driver.py`, `trip.py`, `trip_event.py`, `maintenance_log.py`, `fuel_log.py`, `expense.py`, `notification.py`, `vehicle_health.py`, `audit_log.py`, `company_feature.py`, `company_subscription.py`, `subscription_plan.py`, `login_attempt.py`, `password_reset_token.py`.
   - All classes define flat multi-tenant tables (with `company_id` foreign key columns) matching Alembic migration `001_phase1_schema_bootstrap.py` line-for-line (e.g. `reg_number`, `odometer_km`, `capacity_kg`, `acquisition_cost`, `license_category`, `source`, `destination`, `dispatched_at`, `total_cost`, `odometer_reading`, `fuel_station`).

2. **Schema-Split Tree (`server/app/models/public/*.py` & `server/app/models/tenant/*.py`)**:
   - Defined using SQLAlchemy 2.0 `DeclarativeBase` (`PublicSoftDeleteModel` & `TenantSoftDeleteModel` from `app.database.base`).
   - Files: `public/company.py`, `public/subscription_plan.py`, `tenant/vehicle.py`, `tenant/driver.py`, `tenant/vehicle_health.py`, etc.
   - Uses schema-level isolation (`__table_args__ = ({"schema": "tenant"},)`) and different column names (e.g. `current_odometer` instead of `odometer_km`, `purchase_price` instead of `acquisition_cost`, `license_class` instead of `license_category`).

### 1.2 Import Discrepancies Across Codebase
- `server/app/models/__init__.py` (lines 4-34): Re-exports model classes from `app.models.public` and `app.models.tenant`.
- `server/run.py` (line 2), `server/seed.py` (line 2), `server/migrations/env.py` (lines 41-46): Import from `app.models` (package-level).
- **All 16 Flask Route Blueprints** (`server/app/routes/*.py` and `server/app/routes/admin/*.py`):
  - `admin/companies.py` (lines 5-7): `from app.models.company import Company`, `from app.models.company_feature import CompanyFeature`, `from app.models.company_subscription import CompanySubscription`
  - `vehicles.py` (line 3): `from app.models.vehicle import Vehicle`
  - `drivers.py` (line 3): `from app.models.driver import Driver`
  - `trips.py` (lines 3-5): `from app.models.trip import Trip`, `from app.models.trip_event import TripEvent`, `from app.models.audit_log import AuditLog`
  - `fuel.py` (lines 3-5): `from app.models.fuel_log import FuelLog`, `from app.models.vehicle import Vehicle`, `from app.models.driver import Driver`
  - `expenses.py` (lines 3-5): `from app.models.expense import Expense`, `from app.models.vehicle import Vehicle`, `from app.models.trip import Trip`
  - `maintenance.py` (lines 3-4): `from app.models.maintenance_log import MaintenanceLog`, `from app.models.vehicle import Vehicle`
  - `auth.py` (lines 3, 6): `from app.models.user import User`, `from app.models.password_reset_token import PasswordResetToken`
  - `dashboard.py` (lines 3-6): `from app.models.vehicle import Vehicle`, `from app.models.driver import Driver`, `from app.models.trip import Trip`, `from app.models.maintenance_log import MaintenanceLog`
  - `middleware/tenant.py` (lines 61-62): `from app.models.company import Company`, `from app.models.company_feature import CompanyFeature`
  - `middleware/rbac.py` (line 4): `from app.models.user import User`
  - `services/trip_service.py` (lines 2-6): `from app.models.trip import Trip`, `from app.models.vehicle import Vehicle`, `from app.models.driver import Driver`
  - `commands/seed_demo.py` (lines 4-12): `from app.models.company import Company`, `from app.models.user import User`, `from app.models.vehicle import Vehicle`, etc.
  - `tests/conftest.py` (lines 30-32): `from app.models.user import User`, `from app.models.company import Company`, `from app.models.company_feature import CompanyFeature`

### 1.3 Exact Cause of Mapper Collision (`InvalidRequestError`)
When the Flask app or test suite starts up:
1. Python executes `from app.models.company import Company`, which loads `server/app/models/company.py` (`Company` defined on `db.Model`).
2. Root `Company` defines relationships to `'User'`, `'Vehicle'`, `'Driver'`, `'Trip'`, `'VehicleHealth'`, `'AuditLog'`, etc.
3. Simultaneously, `app.models.__init__.py` imports `Company` from `app.models.public` (`PublicSoftDeleteModel`) and `VehicleHealth` from `app.models.tenant.vehicle_health` (`TenantSoftDeleteModel`).
4. SQLAlchemy ORM attempts to build mappers for two separate classes named `Company` both bound to table `'companies'`.
5. When root `Company` resolves relationship `'VehicleHealth'`, SQLAlchemy looks in its registry. Because `VehicleHealth` in `app.models.tenant` uses a different base class (`TenantSoftDeleteModel`), or because root `vehicle_health.py` hasn't registered its `db.Model` class, mapper configuration fails with:
   `InvalidRequestError: Mapper[Company(companies)] failing to locate name 'VehicleHealth'`
6. In SQLite in-memory tests (`tests/conftest.py`), `TenantSoftDeleteModel` specifies `{"schema": "tenant"}` which SQLite does not support, throwing schema errors during `db.create_all()`.

---

## 2. Logic Chain

1. **Observation**: Alembic migration `001_phase1_schema_bootstrap.py` creates single-schema tables in public database (`companies`, `users`, `vehicles`, `drivers`, `trips`, `maintenance_logs`, `fuel_logs`, `expenses`, `vehicle_health`, etc.) with `company_id` columns.
2. **Observation**: Root models in `server/app/models/*.py` match these migration tables and column names exactly (`odometer_km`, `acquisition_cost`, `license_category`, `source`, `destination`, `dispatched_at`, `total_cost`, `odometer_reading`, `fuel_station`, `type`).
3. **Observation**: All 16 Flask route blueprints, middleware, services, CLI commands (`seed-demo`), and test suites import directly from submodules `app.models.<name>` (e.g. `from app.models.company import Company`).
4. **Reasoning**: The schema-split models in `app.models.public` and `app.models.tenant` are redundant, incompatible with migration `001` and SQLite test databases, and create duplicate ORM mapper declarations for the same table names (`companies`, `vehicles`, `drivers`, `trips`).
5. **Conclusion**: Unifying all models into the root model architecture (`server/app/models/*.py`) and making `server/app/models/__init__.py`, `server/app/models/public/__init__.py`, and `server/app/models/tenant/__init__.py` re-export from the single canonical root models will completely eliminate duplicate class declarations, resolve mapper collisions, ensure 100% test compatibility with SQLite and PostgreSQL, and maintain zero breaking changes across all 16 route modules.

---

## 3. Caveats

1. **Scope**: Read-only investigation. No source files under `server/app/` were modified by explorer.
2. **Dynamic Execution**: Terminal command `run_command` timed out waiting for user prompt approval during initial exploration, so analysis was conducted via comprehensive static inspection of all server Python files, routes, middleware, services, and tests.
3. **Unused Schema Models**: Models present only in `public/` or `tenant/` (`PlatformUser`, `SystemSetting`, `ExpenseCategory`, `NotificationPreference`, `AIConversation`, `AIMessage`, `Setting`, `FileMetadata`) are not used by any route blueprint or test. If needed in future milestones, they should be added as canonical `db.Model` classes in `server/app/models/`.

---

## 4. Conclusion & Precise Step-by-Step Implementation Plan

### Step-by-Step Implementation Plan for Implementer:

1. **Clean up `server/app/models/__init__.py`**:
   Replace `app.models.__init__.py` content to re-export all canonical models directly from root `app.models.<module>`:
   ```python
   """Models package - exports all canonical models for TransitOps."""

   from app.models.company import Company
   from app.models.user import User
   from app.models.vehicle import Vehicle
   from app.models.driver import Driver
   from app.models.trip import Trip
   from app.models.trip_event import TripEvent
   from app.models.maintenance_log import MaintenanceLog
   from app.models.fuel_log import FuelLog
   from app.models.expense import Expense
   from app.models.notification import Notification
   from app.models.vehicle_health import VehicleHealth
   from app.models.audit_log import AuditLog
   from app.models.company_feature import CompanyFeature, FEATURE_KEYS
   from app.models.company_subscription import CompanySubscription
   from app.models.subscription_plan import SubscriptionPlan
   from app.models.login_attempt import LoginAttempt
   from app.models.password_reset_token import PasswordResetToken

   __all__ = [
       "Company",
       "User",
       "Vehicle",
       "Driver",
       "Trip",
       "TripEvent",
       "MaintenanceLog",
       "FuelLog",
       "Expense",
       "Notification",
       "VehicleHealth",
       "AuditLog",
       "CompanyFeature",
       "FEATURE_KEYS",
       "CompanySubscription",
       "SubscriptionPlan",
       "LoginAttempt",
       "PasswordResetToken",
   ]
   ```

2. **Redirect Submodule Packages `public` and `tenant`**:
   - Update `server/app/models/public/__init__.py` to re-export from `app.models`:
     ```python
     from app.models import (
         Company,
         SubscriptionPlan,
         CompanySubscription,
         AuditLog,
         LoginAttempt,
         PasswordResetToken,
     )
     ```
   - Update `server/app/models/tenant/__init__.py` to re-export from `app.models`:
     ```python
     from app.models import (
         User,
         CompanyFeature,
         Vehicle,
         Driver,
         Trip,
         TripEvent,
         MaintenanceLog,
         FuelLog,
         Expense,
         Notification,
         VehicleHealth,
     )
     ```
   - Remove or deprecate individual duplicate files inside `server/app/models/public/` and `server/app/models/tenant/` so SQLAlchemy only registers models defined in `server/app/models/*.py`.

3. **Verify Root Model Relationship References**:
   Ensure root `Company` (`server/app/models/company.py`) and root `Vehicle` (`server/app/models/vehicle.py`) have matching relationships:
   - In `Company`:
     `users = db.relationship('User', backref='company', lazy='dynamic')`
     `vehicles = db.relationship('Vehicle', backref='company', lazy='dynamic')`
     `drivers = db.relationship('Driver', backref='company', lazy='dynamic')`
     `trips = db.relationship('Trip', backref='company', lazy='dynamic')`
     `maintenance_logs = db.relationship('MaintenanceLog', backref='company', lazy='dynamic')`
     `fuel_logs = db.relationship('FuelLog', backref='company', lazy='dynamic')`
     `expenses = db.relationship('Expense', backref='company', lazy='dynamic')`
     `vehicle_health_records = db.relationship('VehicleHealth', backref='company', lazy='dynamic')`
     `notifications = db.relationship('Notification', backref='company', lazy='dynamic')`
     `audit_logs = db.relationship('AuditLog', backref='company', lazy='dynamic')`
   - In `VehicleHealth` (`server/app/models/vehicle_health.py`):
     `vehicle = db.relationship('Vehicle', backref=db.backref('health_record', uselist=False))`

---

## 5. Verification Method

To verify that model mapper collisions are completely resolved:

1. **Run Pytest Suite**:
   Execute in `server/` directory:
   ```bash
   pytest
   ```
   *Expected Result*: Zero `InvalidRequestError` or `Mapper` initialization exceptions. `conftest.py` fixture creates all tables in SQLite memory cleanly.

2. **Verify Database Seeding**:
   Execute seed scripts in `server/`:
   ```bash
   python seed.py
   flask seed-demo
   ```
   *Expected Result*: Tables are populated and CLI outputs `"Database seeded successfully!"` and `"Demo Fleet Co created successfully"`.

3. **Verify Flask Backend Launch**:
   Execute in `server/`:
   ```bash
   python run.py
   ```
   *Expected Result*: Flask application initializes without mapper errors or circular import errors.

4. **Invalidation Conditions**:
   - Any `InvalidRequestError` thrown during model import or app setup.
   - Any `Table 'companies' already defined` or duplicate mapper error.
