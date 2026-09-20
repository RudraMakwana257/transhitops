import pytest
import uuid
import threading
from datetime import datetime, date, timedelta
from app import db
from app.models import (
    Company, User, Vehicle, Driver, Trip, FuelLog, OperationalException,
    Customer, Shipment, ShipmentItem, FileMetadata, ManualPayment,
    SubscriptionPlan, CompanySubscription, CompanyFeature, VehicleHealth
)
from app.services.exception_service import ExceptionService
from app.services.trip_service import TripService
from app.services.manual_billing_service import ManualBillingService
from flask_jwt_extended import create_access_token


@pytest.fixture
def v2_setup(app):
    with app.app_context():
        # Ensure subscription plan exists
        plan = SubscriptionPlan.query.filter_by(slug='enterprise').first()
        if not plan:
            plan = SubscriptionPlan(
                name="Enterprise Plan",
                slug="enterprise",
                price_monthly=10000.0,
                price_yearly=100000.0,
                features={"all": True},
                limits={"vehicle_limit": 100, "driver_limit": 100, "user_limit": 100},
                is_active=True
            )
            db.session.add(plan)
            db.session.flush()

        # Setup Tenant A
        comp_a = Company(
            name="V2 Remediation Tenant A",
            slug=f"v2-tenant-a-{uuid.uuid4().hex[:6]}",
            email=f"admin-a-{uuid.uuid4().hex[:4]}@test.com",
            is_active=True,
            vehicle_limit=10,
            driver_limit=10,
            user_limit=10
        )
        db.session.add(comp_a)
        db.session.flush()

        # Setup Tenant B
        comp_b = Company(
            name="V2 Remediation Tenant B",
            slug=f"v2-tenant-b-{uuid.uuid4().hex[:6]}",
            email=f"admin-b-{uuid.uuid4().hex[:4]}@test.com",
            is_active=True,
            vehicle_limit=10,
            driver_limit=10,
            user_limit=10
        )
        db.session.add(comp_b)
        db.session.flush()

        # Features & Subscriptions
        for comp in [comp_a, comp_b]:
            sub = CompanySubscription(
                company_id=comp.id,
                plan_id=plan.id,
                status='active',
                current_period_start=datetime.utcnow(),
                current_period_end=datetime.utcnow() + timedelta(days=365)
            )
            db.session.add(sub)
            for fk in ['vehicles', 'drivers', 'trips', 'maintenance', 'fuel', 'expenses', 'dashboard', 'analytics', 'exceptions']:
                db.session.add(CompanyFeature(company_id=comp.id, feature_key=fk, is_enabled=True))

        # Users
        user_a_mgr = User(company_id=comp_a.id, name="Mgr A", email=f"mgr-a-{uuid.uuid4().hex[:4]}@test.com", role="fleet_manager", is_active=True)
        user_a_mgr.set_password("Pass@123")
        user_a_disp = User(company_id=comp_a.id, name="Disp A", email=f"disp-a-{uuid.uuid4().hex[:4]}@test.com", role="dispatcher", is_active=True)
        user_a_disp.set_password("Pass@123")
        db.session.add_all([user_a_mgr, user_a_disp])

        user_b_mgr = User(company_id=comp_b.id, name="Mgr B", email=f"mgr-b-{uuid.uuid4().hex[:4]}@test.com", role="fleet_manager", is_active=True)
        user_b_mgr.set_password("Pass@123")
        db.session.add(user_b_mgr)

        super_admin = User.query.filter_by(role='super_admin').first()
        if not super_admin:
            super_admin = User(name="Super Admin V2", email=f"superadmin-{uuid.uuid4().hex[:4]}@test.com", role="super_admin", is_active=True)
            super_admin.set_password("SuperAdmin@123")
            db.session.add(super_admin)

        # Resources for Tenant A
        veh_a = Vehicle(company_id=comp_a.id, name="Truck A", reg_number=f"MH-A-{uuid.uuid4().hex[:4].upper()}", type="Truck", capacity_kg=2000, acquisition_cost=100000.0, status="Available", is_active=True)
        drv_a = Driver(company_id=comp_a.id, name="Driver A", license_number=f"LIC-A-{uuid.uuid4().hex[:4].upper()}", license_category="HMV", license_expiry=date.today() + timedelta(days=180), phone="9876543201", status="Available", is_active=True)
        db.session.add_all([veh_a, drv_a])
        db.session.flush()

        trip_a = Trip(company_id=comp_a.id, trip_number=f"TRP-A-{uuid.uuid4().hex[:4].upper()}", vehicle_id=veh_a.id, driver_id=drv_a.id, source="City A", destination="City B", cargo_weight_kg=1500, status="Draft", created_by=user_a_mgr.id)
        cust_a = Customer(company_id=comp_a.id, name="Customer A", email=f"cust-a-{uuid.uuid4().hex[:4]}@test.com")
        db.session.add_all([trip_a, cust_a])
        db.session.flush()

        shp_a = Shipment(company_id=comp_a.id, customer_id=cust_a.id, tracking_number=f"SHP-A-{uuid.uuid4().hex[:4].upper()}", origin="City A", destination="City B", status="Pending")
        file_a = FileMetadata(company_id=comp_a.id, filename="doc_a.pdf", file_key=f"attachments/{uuid.uuid4().hex}.pdf", mime_type="application/pdf", file_size=1024, entity_type="general")
        db.session.add_all([shp_a, file_a])

        # Resources for Tenant B
        veh_b = Vehicle(company_id=comp_b.id, name="Truck B", reg_number=f"MH-B-{uuid.uuid4().hex[:4].upper()}", type="Truck", capacity_kg=4000, acquisition_cost=150000.0, status="Available", is_active=True)
        drv_b = Driver(company_id=comp_b.id, name="Driver B", license_number=f"LIC-B-{uuid.uuid4().hex[:4].upper()}", license_category="HMV", license_expiry=date.today() + timedelta(days=180), phone="9876543202", status="Available", is_active=True)
        db.session.add_all([veh_b, drv_b])
        db.session.flush()

        trip_b = Trip(company_id=comp_b.id, trip_number=f"TRP-B-{uuid.uuid4().hex[:4].upper()}", vehicle_id=veh_b.id, driver_id=drv_b.id, source="City X", destination="City Y", cargo_weight_kg=2500, status="Draft", created_by=user_b_mgr.id)
        file_b = FileMetadata(company_id=comp_b.id, filename="doc_b.pdf", file_key=f"attachments/{uuid.uuid4().hex}.pdf", mime_type="application/pdf", file_size=2048, entity_type="general")
        db.session.add_all([trip_b, file_b])
        db.session.commit()

        # Tokens
        token_a = create_access_token(identity=str(user_a_mgr.id), additional_claims={'role': 'fleet_manager', 'company_id': str(comp_a.id)})
        token_a_disp = create_access_token(identity=str(user_a_disp.id), additional_claims={'role': 'dispatcher', 'company_id': str(comp_a.id)})
        token_b = create_access_token(identity=str(user_b_mgr.id), additional_claims={'role': 'fleet_manager', 'company_id': str(comp_b.id)})
        token_super = create_access_token(identity=str(super_admin.id), additional_claims={'role': 'super_admin', 'company_id': None})

        return {
            "comp_a_id": str(comp_a.id),
            "comp_b_id": str(comp_b.id),
            "user_a_mgr_id": str(user_a_mgr.id),
            "user_a_disp_id": str(user_a_disp.id),
            "user_b_mgr_id": str(user_b_mgr.id),
            "super_admin_id": str(super_admin.id),
            "veh_a_id": str(veh_a.id),
            "veh_b_id": str(veh_b.id),
            "drv_a_id": str(drv_a.id),
            "drv_b_id": str(drv_b.id),
            "trip_a_id": str(trip_a.id),
            "trip_b_id": str(trip_b.id),
            "shp_a_id": str(shp_a.id),
            "file_a_id": str(file_a.id),
            "file_b_id": str(file_b.id),
            "headers_a": {"Authorization": f"Bearer {token_a}", "Content-Type": "application/json"},
            "headers_a_disp": {"Authorization": f"Bearer {token_a_disp}", "Content-Type": "application/json"},
            "headers_b": {"Authorization": f"Bearer {token_b}", "Content-Type": "application/json"},
            "headers_super": {"Authorization": f"Bearer {token_super}", "Content-Type": "application/json"},
        }


def test_v2_001_shipment_cross_tenant_trip_injection_rejected(client, v2_setup):
    """V2-001: Ensure setting trip_id of another tenant on a shipment is rejected with 404."""
    shp_a_id = v2_setup["shp_a_id"]
    trip_b_id = v2_setup["trip_b_id"]
    trip_a_id = v2_setup["trip_a_id"]
    headers_a = v2_setup["headers_a"]

    # 1. Attempt cross-tenant foreign trip assignment
    resp = client.put(f"/api/shipments/{shp_a_id}", headers=headers_a, json={
        "trip_id": trip_b_id
    })
    assert resp.status_code == 404

    # Verify DB was NOT updated
    shp_db = Shipment.query.get(shp_a_id)
    assert str(shp_db.trip_id) != trip_b_id

    # 2. Valid assignment with owned trip succeeds
    resp_valid = client.put(f"/api/shipments/{shp_a_id}", headers=headers_a, json={
        "trip_id": trip_a_id
    })
    assert resp_valid.status_code == 200
    shp_db = Shipment.query.get(shp_a_id)
    assert str(shp_db.trip_id) == trip_a_id

    # 3. Clearing trip_id succeeds
    resp_clear = client.put(f"/api/shipments/{shp_a_id}", headers=headers_a, json={
        "trip_id": None
    })
    assert resp_clear.status_code == 200
    shp_db = Shipment.query.get(shp_a_id)
    assert shp_db.trip_id is None


def test_v2_001_trip_cross_tenant_update_rejected(client, v2_setup):
    """V2-001: Ensure updating a trip with a foreign vehicle or driver is rejected with 404."""
    trip_a_id = v2_setup["trip_a_id"]
    veh_b_id = v2_setup["veh_b_id"]
    drv_b_id = v2_setup["drv_b_id"]
    headers_a = v2_setup["headers_a"]

    # Attempt cross-tenant vehicle assignment on existing trip
    resp_v = client.put(f"/api/trips/{trip_a_id}", headers=headers_a, json={
        "vehicle_id": veh_b_id
    })
    assert resp_v.status_code == 404

    # Attempt cross-tenant driver assignment on existing trip
    resp_d = client.put(f"/api/trips/{trip_a_id}", headers=headers_a, json={
        "driver_id": drv_b_id
    })
    assert resp_d.status_code == 404


def test_v2_002_fuel_log_creation_and_scoping(client, v2_setup):
    """V2-002: Ensure POST /api/fuel succeeds without 500 error and strictly scopes trip_id."""
    veh_a_id = v2_setup["veh_a_id"]
    drv_a_id = v2_setup["drv_a_id"]
    trip_a_id = v2_setup["trip_a_id"]
    trip_b_id = v2_setup["trip_b_id"]
    headers_a = v2_setup["headers_a"]

    # 1. Valid creation succeeds with 201
    resp = client.post("/api/fuel", headers=headers_a, json={
        "vehicle_id": veh_a_id,
        "driver_id": drv_a_id,
        "trip_id": trip_a_id,
        "date": str(date.today()),
        "liters": 65.5,
        "price_per_liter": 95.0,
        "odometer_reading": 12500.0,
        "fuel_station": "Indian Oil Station 4"
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["success"] is True
    log_id = data["data"]["id"]

    # Verify DB persistence
    fuel_db = FuelLog.query.get(log_id)
    assert fuel_db is not None
    assert float(fuel_db.liters) == 65.5
    assert str(fuel_db.company_id) == v2_setup["comp_a_id"]

    # 2. Creation with unowned foreign trip is rejected with 404
    resp_fk = client.post("/api/fuel", headers=headers_a, json={
        "vehicle_id": veh_a_id,
        "driver_id": drv_a_id,
        "trip_id": trip_b_id,
        "date": str(date.today()),
        "liters": 40.0,
        "price_per_liter": 95.0
    })
    assert resp_fk.status_code == 404


def test_v2_003_admin_vehicle_creation_and_health_initialization(client, v2_setup):
    """V2-003: Ensure POST /api/admin/vehicles succeeds without 500 error and initializes health."""
    comp_a_id = v2_setup["comp_a_id"]
    headers_super = v2_setup["headers_super"]
    reg_num = f"MH-ADM-{uuid.uuid4().hex[:4].upper()}"

    resp = client.post("/api/admin/vehicles", headers=headers_super, json={
        "company_id": comp_a_id,
        "reg_number": reg_num,
        "name": "Super Admin Truck",
        "type": "Truck",
        "capacity_kg": 7500.0,
        "acquisition_cost": 250000.0,
        "odometer_km": 0.0,
        "purchase_date": str(date.today()),
        "status": "Available"
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["success"] is True
    veh_id = data["data"]["id"]

    # Verify vehicle and health in DB
    v_db = Vehicle.query.get(veh_id)
    assert v_db is not None
    assert v_db.reg_number == reg_num
    assert v_db.health is not None
    assert float(v_db.health.health_score) == 100.0


def test_v2_004_exception_engine_concurrent_detection_deduplication(app, v2_setup):
    """V2-004: Ensure concurrent exception detection runs produce zero duplicate active exceptions."""
    comp_a_id = v2_setup["comp_a_id"]

    with app.app_context():
        # Create an expired driver to trigger exception rule
        expired_drv = Driver(
            company_id=comp_a_id,
            name="Concurrent Expired Driver",
            license_number=f"LIC-CONC-{uuid.uuid4().hex[:4].upper()}",
            license_category="HMV",
            license_expiry=date.today() - timedelta(days=15),
            phone="9876543299",
            status="Available",
            is_active=True
        )
        db.session.add(expired_drv)
        db.session.commit()
        drv_id = expired_drv.id

    threads = []
    errors = []

    def run_detection_thread():
        with app.app_context():
            try:
                ExceptionService.run_exception_detection(comp_a_id)
            except Exception as e:
                errors.append(str(e))

    for _ in range(5):
        t = threading.Thread(target=run_detection_thread)
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    assert len(errors) == 0

    with app.app_context():
        active_excs = OperationalException.query.filter(
            OperationalException.company_id == comp_a_id,
            OperationalException.entity_type == 'driver',
            OperationalException.entity_id == drv_id,
            OperationalException.status.in_(['ACTIVE', 'ACKNOWLEDGED'])
        ).all()

        # Exactly 1 active exception must exist, 0 duplicates
        assert len(active_excs) == 1
        assert active_excs[0].type == 'DRIVER_LICENSE_EXPIRED'


def test_v2_005_trip_dispatch_capacity_rule_enforcement(client, v2_setup):
    """V2-005: Ensure trips with cargo exceeding vehicle capacity are rejected at dispatch."""
    comp_a_id = v2_setup["comp_a_id"]
    veh_a_id = v2_setup["veh_a_id"] # capacity = 2000 kg
    drv_a_id = v2_setup["drv_a_id"]
    user_a_id = v2_setup["user_a_mgr_id"]
    headers_a = v2_setup["headers_a"]

    # 1. Create overloaded trip (5000 kg cargo on 2000 kg vehicle)
    trip_over = Trip(
        company_id=comp_a_id,
        trip_number=f"TRP-OVL-{uuid.uuid4().hex[:4].upper()}",
        vehicle_id=veh_a_id,
        driver_id=drv_a_id,
        source="City A",
        destination="City B",
        cargo_weight_kg=5000.0,
        status="Draft",
        created_by=user_a_id
    )
    db.session.add(trip_over)
    db.session.commit()
    trip_over_id = trip_over.id

    # Attempt dispatch -> must be rejected with 400
    resp_over = client.post(f"/api/trips/{trip_over_id}/dispatch", headers=headers_a)
    assert resp_over.status_code == 400
    data_over = resp_over.get_json()
    assert "capacity" in (data_over.get("error") or data_over.get("message") or "").lower()

    # Verify trip status remains Draft
    trip_db = Trip.query.get(trip_over_id)
    assert trip_db.status == "Draft"

    # 2. Create valid trip under capacity (1200 kg on 2000 kg vehicle)
    trip_valid = Trip(
        company_id=comp_a_id,
        trip_number=f"TRP-OK-{uuid.uuid4().hex[:4].upper()}",
        vehicle_id=veh_a_id,
        driver_id=drv_a_id,
        source="City A",
        destination="City B",
        cargo_weight_kg=1200.0,
        status="Draft",
        created_by=user_a_id
    )
    db.session.add(trip_valid)
    db.session.commit()
    trip_valid_id = trip_valid.id

    # Attempt dispatch -> succeeds
    resp_valid = client.post(f"/api/trips/{trip_valid_id}/dispatch", headers=headers_a)
    assert resp_valid.status_code == 200
    trip_db_valid = Trip.query.get(trip_valid_id)
    assert trip_db_valid.status == "Dispatched"


def test_v2_006_manual_payment_reference_uniqueness(client, v2_setup):
    """V2-006: Ensure duplicate confirmed payment reference numbers are rejected."""
    comp_a_id = v2_setup["comp_a_id"]
    headers_super = v2_setup["headers_super"]
    ref_num = f"TXN-UNQ-{uuid.uuid4().hex[:8].upper()}"

    # 1. Record first payment with reference number -> succeeds
    resp1 = client.post("/api/admin/payments", headers=headers_super, json={
        "company_id": comp_a_id,
        "plan_slug": "enterprise",
        "amount": 25000.0,
        "payment_method": "BANK_TRANSFER",
        "reference_number": ref_num,
        "billing_period_months": 6
    })
    assert resp1.status_code == 201
    pay_id = resp1.get_json()["data"]["id"]

    # 2. Attempt to record second payment with identical reference number -> rejected with 400
    resp2 = client.post("/api/admin/payments", headers=headers_super, json={
        "company_id": comp_a_id,
        "plan_slug": "enterprise",
        "amount": 25000.0,
        "payment_method": "BANK_TRANSFER",
        "reference_number": ref_num,
        "billing_period_months": 6
    })
    assert resp2.status_code == 400
    data2 = resp2.get_json()
    assert "already been recorded" in (data2.get("error") or data2.get("message") or "").lower()

    # Verify only 1 payment exists in DB
    pay_count = ManualPayment.query.filter_by(reference_number=ref_num).count()
    assert pay_count == 1

    # 3. Reverse payment
    rev_resp = client.post(f"/api/admin/payments/{pay_id}/reverse", headers=headers_super, json={
        "reason": "Test reversal"
    })
    assert rev_resp.status_code == 200
    assert rev_resp.get_json()["data"]["status"] == "REVERSED"


def test_v2_007_attachment_auth_and_access_control(client, v2_setup):
    """V2-007: Ensure GET /api/attachments/<id> enforces JWT auth and tenant ownership cleanly."""
    file_a_id = v2_setup["file_a_id"]
    file_b_id = v2_setup["file_b_id"]
    headers_a = v2_setup["headers_a"]

    # 1. Anonymous request without JWT -> must return 401 Unauthorized (never 500)
    resp_anon = client.get(f"/api/attachments/{file_a_id}")
    assert resp_anon.status_code == 401

    # 2. Cross-tenant request (Tenant A requesting Tenant B file) -> returns 404 Not Found
    resp_cross = client.get(f"/api/attachments/{file_b_id}", headers=headers_a)
    assert resp_cross.status_code == 404

    # 3. Authorized tenant request -> returns 200 OK
    resp_auth = client.get(f"/api/attachments/{file_a_id}", headers=headers_a)
    assert resp_auth.status_code == 200
    assert resp_auth.get_json()["data"]["id"] == file_a_id
