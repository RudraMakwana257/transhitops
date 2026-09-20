import pytest
import json
import uuid
from app import db
from app.models.user import User
from app.models.company import Company
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.company_feature import CompanyFeature
from app.models.operational_exception import OperationalException
from app.models.manual_payment import ManualPayment
from flask_jwt_extended import create_access_token

def test_tenant_user_cannot_create_super_admin(client, company_a_token, company_a_id):
    """P0-SEC-01: Ensure tenant fleet manager cannot create super_admin user."""
    res = client.post(
        '/api/settings/users',
        headers={'Authorization': f'Bearer {company_a_token}'},
        json={
            'name': 'Malicious Super Admin',
            'email': 'evil_admin@companya.com',
            'password': 'Password@123',
            'role': 'super_admin'
        }
    )
    assert res.status_code in [400, 403, 422]
    # Verify user was not created with super_admin role
    user = User.query.filter_by(email='evil_admin@companya.com').first()
    assert user is None

def test_tenant_user_cannot_update_to_super_admin(client, company_a_token, company_a_id):
    """P0-SEC-01: Ensure tenant fleet manager cannot promote user to super_admin."""
    # Create normal driver first
    driver_user = User(
        company_id=uuid.UUID(company_a_id),
        name='Normal Driver',
        email='unique_regression_driver@companya.com',
        role='driver',
        is_active=True
    )
    driver_user.set_password('Password@123')
    db.session.add(driver_user)
    db.session.commit()

    res = client.put(
        f'/api/settings/users/{driver_user.id}',
        headers={'Authorization': f'Bearer {company_a_token}'},
        json={'role': 'super_admin'}
    )
    assert res.status_code in [400, 403, 422]
    db.session.refresh(driver_user)
    assert driver_user.role == 'driver'

def test_shorthand_role_names_cannot_authenticate(client):
    """P0-SEC-02: Ensure shorthand role strings cannot be used as login identifiers."""
    res = client.post(
        '/api/auth/login',
        json={'email': 'manager', 'password': 'Admin@123'}
    )
    assert res.status_code == 401
    
    res2 = client.post(
        '/api/auth/login',
        json={'email': 'dispatcher', 'password': 'Admin@123'}
    )
    assert res2.status_code == 401

def test_admin_impersonate_stop_lifecycle(client, super_admin_token, seed_data):
    """P1-SEC-03: Verify impersonation start and clean termination without NameError."""
    # 1. Impersonate company A admin
    res = client.post(
        '/api/admin/impersonate',
        headers={'Authorization': f'Bearer {super_admin_token}'},
        json={'user_id': seed_data['admin_a_id']}
    )
    assert res.status_code == 200
    imp_data = res.get_json()
    assert imp_data['success'] is True
    imp_token = imp_data['data']['access_token']

    # 2. Stop impersonation
    res_stop = client.post(
        '/api/admin/stop-impersonation',
        headers={'Authorization': f'Bearer {imp_token}'}
    )
    assert res_stop.status_code == 200
    assert res_stop.get_json()['success'] is True

def test_admin_update_features_returns_200(client, super_admin_token, company_a_id):
    """P1-SEC-04: Verify update_company_features returns valid 200 response."""
    res = client.put(
        f'/api/admin/companies/{company_a_id}/features',
        headers={'Authorization': f'Bearer {super_admin_token}'},
        json={'features': {'ai_chat': False, 'analytics': True}}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert 'data' in data

def test_cannot_mutate_vehicle_or_driver_on_dispatched_trip(client, company_a_token, company_a_id):
    """P1-SEC-05: Ensure vehicle/driver cannot be altered on a Dispatched trip."""
    # Seed vehicle and driver
    from datetime import date, timedelta
    v1 = Vehicle(company_id=uuid.UUID(company_a_id), reg_number='REG-TEST-1', name='Truck 1', type='Truck', capacity_kg=1000.0, acquisition_cost=25000.0, status='On Trip')
    v2 = Vehicle(company_id=uuid.UUID(company_a_id), reg_number='REG-TEST-2', name='Truck 2', type='Truck', capacity_kg=1000.0, acquisition_cost=25000.0, status='Available')
    d1 = Driver(company_id=uuid.UUID(company_a_id), license_number='LIC-TEST-1', name='Driver 1', license_category='Commercial', license_expiry=date.today() + timedelta(days=365), phone='+919876543210', status='On Trip')
    d2 = Driver(company_id=uuid.UUID(company_a_id), license_number='LIC-TEST-2', name='Driver 2', license_category='Commercial', license_expiry=date.today() + timedelta(days=365), phone='+919876543211', status='Available')
    db.session.add_all([v1, v2, d1, d2])
    db.session.flush()

    trip = Trip(
        company_id=uuid.UUID(company_a_id),
        trip_number='TRIP-TEST-001',
        vehicle_id=v1.id,
        driver_id=d1.id,
        source='City A',
        destination='City B',
        cargo_weight_kg=500,
        status='Dispatched'
    )
    db.session.add(trip)
    db.session.commit()

    # Attempt to swap vehicle on dispatched trip
    res = client.put(
        f'/api/trips/{trip.id}',
        headers={'Authorization': f'Bearer {company_a_token}'},
        json={'vehicle_id': str(v2.id)}
    )
    assert res.status_code == 400
    assert "Cannot change vehicle_id on a dispatched trip" in res.get_json()['message']

def test_analytics_fuel_and_cost_aggregation(client, company_a_token, company_a_id):
    """P1-SEC-06: Verify analytics endpoints aggregate data cleanly without errors."""
    res_fuel = client.get(
        '/api/analytics/fuel-efficiency',
        headers={'Authorization': f'Bearer {company_a_token}'}
    )
    assert res_fuel.status_code == 200
    assert res_fuel.get_json()['success'] is True

    res_cost = client.get(
        '/api/analytics/operational-cost',
        headers={'Authorization': f'Bearer {company_a_token}'}
    )
    assert res_cost.status_code == 200
    assert res_cost.get_json()['success'] is True

def test_attachment_upload_rejects_unowned_entity(client, company_a_token, company_b_id):
    """Phase 7: Ensure uploading attachment for an entity belonging to another company fails."""
    # Create vehicle in Company B
    v_b = Vehicle(company_id=uuid.UUID(company_b_id), reg_number='REG-COMP-B', name='Truck B', type='Truck', capacity_kg=1000.0, acquisition_cost=25000.0, status='Available')
    db.session.add(v_b)
    db.session.commit()

    # Company A user attempts to attach file to Company B vehicle
    import io
    data = {
        'file': (io.BytesIO(b'%PDF-1.4 test file content'), 'document.pdf'),
        'entity_type': 'vehicle',
        'entity_id': str(v_b.id)
    }
    res = client.post(
        '/api/attachments/upload',
        headers={'Authorization': f'Bearer {company_a_token}'},
        data=data,
        content_type='multipart/form-data'
    )
    assert res.status_code == 404

def test_public_self_service_registration(client):
    """Phase 10: Test self-service organization signup."""
    res = client.post(
        '/api/auth/register',
        json={
            'company_name': 'Horizon Express',
            'name': 'Alice Founder',
            'email': 'alice@horizonexpress.com',
            'password': 'SecurePassword@123'
        }
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['data']['user']['email'] == 'alice@horizonexpress.com'
    assert data['data']['user']['role'] == 'fleet_manager'
    assert 'access_token' in data['data']

def test_admin_dashboard_dynamic_health(client, super_admin_token):
    """Phase 12: Verify admin dashboard reports correct dynamic health and exceptions."""
    res = client.get(
        '/api/admin/dashboard',
        headers={'Authorization': f'Bearer {super_admin_token}'}
    )
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['system_health']['database'] == 'Healthy'
    assert 'critical_exceptions' in data
