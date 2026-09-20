import pytest
import uuid
from datetime import date
from config import ProductionConfig
from app.models.user import User
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.company import Company
from app.models.company_subscription import CompanySubscription
from app.models.subscription_plan import SubscriptionPlan
from app.services.quota_service import QuotaService, QuotaExceededException
from app.services.trip_service import TripService
from flask_jwt_extended import create_access_token

def test_production_config_secret_validation(monkeypatch):
    """Verify ProductionConfig raises ValueError if default insecure secrets are used."""
    monkeypatch.setenv('SECRET_KEY', 'dev-secret-key')
    monkeypatch.setenv('JWT_SECRET_KEY', 'dev-jwt-key')
    with pytest.raises(ValueError, match="CRITICAL CONFIGURATION ERROR"):
        ProductionConfig()

def test_production_config_valid_secrets(monkeypatch):
    """Verify ProductionConfig succeeds with strong secrets."""
    monkeypatch.setenv('SECRET_KEY', 'super-secure-random-64-character-production-secret-key-12345')
    monkeypatch.setenv('JWT_SECRET_KEY', 'super-secure-random-64-character-jwt-production-secret-key-12345')
    monkeypatch.setenv('POSTGRES_PASSWORD', 'super-secure-postgres-password-12345')
    monkeypatch.setenv('DATABASE_URL', 'postgresql://transitops:super-secure-postgres-password-12345@localhost:5432/transitops')
    cfg = ProductionConfig()
    assert cfg.JWT_COOKIE_CSRF_PROTECT is True

def test_driver_portal_idor_prevention(client, app, company_a_id):
    """Verify a driver cannot supply ?driver_id=other_driver to view another driver's trips."""
    cid = uuid.UUID(company_a_id)
    with app.app_context():
        from app import db
        user1 = User(name="Driver User 1", email="driver1@companya.com", role="driver", company_id=cid, is_active=True)
        user1.set_password("Driver@123")
        db.session.add(user1)
        db.session.flush()

        v1 = Vehicle(company_id=cid, reg_number="REG-IDOR-1", name="Truck 1", type="Truck", capacity_kg=5000, acquisition_cost=1000, status="Available", is_active=True)
        v2 = Vehicle(company_id=cid, reg_number="REG-IDOR-2", name="Truck 2", type="Truck", capacity_kg=5000, acquisition_cost=1000, status="Available", is_active=True)
        driver1 = Driver(company_id=cid, user_id=user1.id, name="Driver One", license_number="DL-1001", license_category="LMV", license_expiry=date(2030, 1, 1), phone="1234567890", status="Available", is_active=True)
        driver2 = Driver(company_id=cid, name="Driver Two", license_number="DL-1002", license_category="LMV", license_expiry=date(2030, 1, 1), phone="1234567891", status="Available", is_active=True)
        db.session.add_all([v1, v2, driver1, driver2])
        db.session.flush()

        trip1 = Trip(trip_number="TRP-D1", company_id=cid, vehicle_id=v1.id, driver_id=driver1.id, cargo_weight_kg=100.0, source="A", destination="B", status="Dispatched")
        trip2 = Trip(trip_number="TRP-D2", company_id=cid, vehicle_id=v2.id, driver_id=driver2.id, cargo_weight_kg=100.0, source="X", destination="Y", status="Dispatched")
        db.session.add_all([trip1, trip2])
        db.session.commit()

        token = create_access_token(identity=str(user1.id), additional_claims={'role': 'driver', 'name': user1.name, 'company_id': str(cid)})
        driver2_id_str = str(driver2.id)

    headers = {'Authorization': f'Bearer {token}'}
    res = client.get(f'/api/driver/assigned-trips?driver_id={driver2_id_str}', headers=headers)
    assert res.status_code == 200
    data = res.json['data']
    trip_numbers = [t['trip_number'] for t in data]
    assert "TRP-D1" in trip_numbers
    assert "TRP-D2" not in trip_numbers

def test_driver_portal_invalid_state_transition(client, app, company_a_id):
    """Verify driver cannot jump from Completed back to Dispatched or In Progress."""
    cid = uuid.UUID(company_a_id)
    with app.app_context():
        from app import db
        user = User(name="Driver State User", email="driverstate@companya.com", role="driver", company_id=cid, is_active=True)
        user.set_password("Driver@123")
        db.session.add(user)
        db.session.flush()

        v = Vehicle(company_id=cid, reg_number="REG-STATE-1", name="Truck State", type="Truck", capacity_kg=5000, acquisition_cost=1000, status="Available", is_active=True)
        driver = Driver(company_id=cid, user_id=user.id, name="State Driver", license_number="DL-STATE", license_category="LMV", license_expiry=date(2030, 1, 1), phone="1234567890", status="Available", is_active=True)
        db.session.add_all([v, driver])
        db.session.flush()

        trip = Trip(trip_number="TRP-COMP-TEST", company_id=cid, vehicle_id=v.id, driver_id=driver.id, cargo_weight_kg=100.0, source="A", destination="B", status="Completed")
        db.session.add(trip)
        db.session.commit()
        trip_id = str(trip.id)

        token = create_access_token(identity=str(user.id), additional_claims={'role': 'driver', 'name': user.name, 'company_id': str(cid)})

    headers = {'Authorization': f'Bearer {token}'}
    res = client.post(f'/api/driver/trips/{trip_id}/update-status', json={"status": "Dispatched"}, headers=headers)
    assert res.status_code == 400
    assert "Invalid state transition" in res.json['message']

def test_quota_row_locking(app):
    """Verify QuotaService enforce_quota executes locking and raises QuotaExceededException when limit reached."""
    with app.app_context():
        from app import db
        temp_company = Company(name="Quota Test Co", slug="quota-test-co", email="quota@test.com")
        db.session.add(temp_company)
        db.session.flush()

        zero_plan = SubscriptionPlan(name="Zero Plan", slug="zero_plan_temp", price_monthly=0, limits={'vehicle_limit': 0}, is_active=True)
        db.session.add(zero_plan)
        db.session.flush()

        sub = CompanySubscription(company_id=temp_company.id, plan_id=zero_plan.id, status='active')
        db.session.add(sub)
        db.session.commit()

        with pytest.raises(QuotaExceededException):
            QuotaService.enforce_quota(temp_company.id, 'vehicles')

def test_double_dispatch_locking_protection(app, company_a_id, seed_data):
    """Verify trip dispatch prevents double-assigning an already dispatched vehicle."""
    cid = uuid.UUID(company_a_id)
    admin_id = uuid.UUID(seed_data['admin_a_id'])
    with app.app_context():
        from app import db
        v = Vehicle(company_id=cid, reg_number="REG-LOCK-1", name="Truck Lock", type="Truck", capacity_kg=5000, acquisition_cost=1000, status="Available", is_active=True)
        d = Driver(company_id=cid, name="Driver Lock", license_number="LIC-LOCK", license_category="LMV", license_expiry=date(2030, 1, 1), phone="1234567890", status="Available", is_active=True)
        db.session.add(v)
        db.session.add(d)
        db.session.commit()

        t1 = TripService.create_trip(cid, v.id, d.id, "A", "B", 100, user_id=admin_id)
        t2 = TripService.create_trip(cid, v.id, d.id, "A", "C", 150, user_id=admin_id)

        # Dispatch first trip
        TripService.dispatch_trip(cid, t1.id, user_id=admin_id)
        assert v.status == 'On Trip'

        # Attempt to dispatch second trip with same vehicle
        with pytest.raises(ValueError, match="Dispatch ineligible: Vehicle is already On Trip"):
            TripService.dispatch_trip(cid, t2.id, user_id=admin_id)
