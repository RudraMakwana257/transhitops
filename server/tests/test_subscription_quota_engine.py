import uuid
import pytest
from app.models.company import Company
from app.models.subscription_plan import SubscriptionPlan
from app.models.company_subscription import CompanySubscription
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.services.quota_service import QuotaService, QuotaExceededException
from app import db

def test_subscription_plan_and_usage_summary_api(client, company_a_token, company_a_id, app):
    """Test /api/subscription/usage and /api/subscription/entitlements APIs."""
    headers = {'Authorization': f'Bearer {company_a_token}'}
    
    with app.app_context():
        QuotaService.change_plan(company_a_id, 'growth')

    # 1. Fetch usage summary
    res = client.get('/api/subscription/usage', headers=headers)
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['plan']['slug'] == 'growth'
    assert 'users' in data['resources']
    assert 'vehicles' in data['resources']
    assert 'drivers' in data['resources']
    assert 'active_trips' in data['resources']
    assert data['resources']['vehicles']['limit'] == 50

    # 2. Fetch entitlements
    res = client.get('/api/subscription/entitlements', headers=headers)
    assert res.status_code == 200
    ent = res.get_json()['data']
    assert ent['plan_slug'] == 'growth'
    assert ent['features']['exceptions'] is True
    assert ent['features']['analytics'] is True

def test_vehicle_quota_enforcement(client, company_a_token, company_a_id, app):
    """Test server-side enforcement of vehicle creation limits."""
    headers = {'Authorization': f'Bearer {company_a_token}'}

    with app.app_context():
        # Clear vehicles for Company A before test
        Vehicle.query.filter_by(company_id=uuid.UUID(company_a_id)).delete()
        db.session.commit()
        QuotaService.change_plan(company_a_id, 'free')

    # Company A now starts with 0 vehicles. Create 3 vehicles (should succeed).
    for i in range(3):
        res = client.post('/api/vehicles', json={
            'reg_number': f'MH-01-FREE-{i+1}',
            'name': f'Free Truck {i+1}',
            'type': 'Truck',
            'capacity_kg': 5000,
            'acquisition_cost': 100000
        }, headers=headers)
        assert res.status_code == 201

    # 4th vehicle creation MUST be rejected with HTTP 403 QUOTA_EXCEEDED
    res = client.post('/api/vehicles', json={
        'reg_number': 'MH-01-FREE-EXCEEDED',
        'name': 'Over Quota Truck',
        'type': 'Truck',
        'capacity_kg': 5000,
        'acquisition_cost': 100000
    }, headers=headers)
    assert res.status_code == 403
    err = res.get_json()['error']
    assert err['code'] == 'QUOTA_EXCEEDED'
    assert err['resource'] == 'vehicles'
    assert err['used'] == 3
    assert err['limit'] == 3

    with app.app_context():
        Vehicle.query.filter_by(company_id=uuid.UUID(company_a_id)).delete()
        db.session.commit()
        QuotaService.change_plan(company_a_id, 'growth')

def test_driver_quota_enforcement(client, company_b_token, company_b_id, app):
    """Test server-side enforcement of driver creation limits."""
    headers = {'Authorization': f'Bearer {company_b_token}'}

    with app.app_context():
        Driver.query.filter_by(company_id=uuid.UUID(company_b_id)).delete()
        db.session.commit()
        QuotaService.change_plan(company_b_id, 'free')

    # Create 3 drivers
    for i in range(3):
        res = client.post('/api/drivers', json={
            'name': f'Free Driver {i+1}',
            'license_number': f'LIC-FREE-{i+1}',
            'license_category': 'HMV',
            'license_expiry': '2027-12-31',
            'phone': f'999000111{i}'
        }, headers=headers)
        assert res.status_code == 201

    # 4th driver creation MUST be rejected
    res = client.post('/api/drivers', json={
        'name': 'Exceeded Driver',
        'license_number': 'LIC-FREE-EXCEEDED',
        'license_category': 'HMV',
        'license_expiry': '2027-12-31',
        'phone': '9990009999'
    }, headers=headers)
    assert res.status_code == 403
    err = res.get_json()['error']
    assert err['code'] == 'QUOTA_EXCEEDED'
    assert err['resource'] == 'drivers'

    with app.app_context():
        Driver.query.filter_by(company_id=uuid.UUID(company_b_id)).delete()
        db.session.commit()
        QuotaService.change_plan(company_b_id, 'starter')

def test_user_quota_enforcement(client, company_b_token, company_b_id, app):
    """Test server-side user limit enforcement."""
    headers = {'Authorization': f'Bearer {company_b_token}'}

    with app.app_context():
        QuotaService.change_plan(company_b_id, 'free') # limit 2 users

    # Company B currently has 1 user (Admin B). Create 2nd user (should succeed).
    res = client.post('/api/settings/users', json={
        'name': 'Second User',
        'email': 'user2@companyb.com',
        'role': 'dispatcher',
        'password': 'Password@123'
    }, headers=headers)
    assert res.status_code == 201

    # 3rd user creation MUST be rejected (limit 2)
    res = client.post('/api/settings/users', json={
        'name': 'Third User',
        'email': 'user3@companyb.com',
        'role': 'dispatcher',
        'password': 'Password@123'
    }, headers=headers)
    assert res.status_code == 403
    assert res.get_json()['error']['code'] == 'QUOTA_EXCEEDED'

    with app.app_context():
        User.query.filter_by(company_id=uuid.UUID(company_b_id), email='user2@companyb.com').delete()
        db.session.commit()
        QuotaService.change_plan(company_b_id, 'starter')

def test_safe_downgrade_handling_and_over_limit_state(client, company_a_token, company_a_id, app):
    """Test that plan downgrade preserves existing assets but blocks new creations."""
    headers = {'Authorization': f'Bearer {company_a_token}'}

    with app.app_context():
        # Set Growth plan (50 vehicles) and create 4 vehicles
        QuotaService.change_plan(company_a_id, 'growth')
        for i in range(4):
            v = Vehicle(company_id=uuid.UUID(company_a_id), reg_number=f'MH-DOWNGRADE-{i}', name=f'Truck {i}', type='Truck', capacity_kg=5000, acquisition_cost=100000)
            db.session.add(v)
        db.session.commit()

        # Downgrade Company A to 'free' plan (limit 3 vehicles)
        summary = QuotaService.change_plan(company_a_id, 'free')
        
        # Verify usage API shows over_limit = True and used = 4, limit = 3
        veh_quota = summary['resources']['vehicles']
        assert veh_quota['used'] >= 4
        assert veh_quota['limit'] == 3
        assert veh_quota['over_limit'] is True

    # Check via HTTP GET API
    res = client.get('/api/subscription/usage', headers=headers)
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['over_limit'] is True
    assert data['resources']['vehicles']['over_limit'] is True

    # Attempting to create a NEW vehicle while over_limit MUST be blocked
    res = client.post('/api/vehicles', json={
        'reg_number': 'MH-DOWNGRADE-NEW',
        'name': 'New Over Limit Truck',
        'type': 'Truck',
        'capacity_kg': 5000,
        'acquisition_cost': 100000
    }, headers=headers)
    assert res.status_code == 403

    # Clean up test vehicles and restore Growth plan
    with app.app_context():
        Vehicle.query.filter(Vehicle.reg_number.like('MH-DOWNGRADE-%')).delete(synchronize_session=False)
        db.session.commit()
        QuotaService.change_plan(company_a_id, 'growth')

def test_quota_reuse_on_deactivation(client, company_b_token, company_b_id, app):
    """Test that deactivating/deleting a resource frees up quota space."""
    headers = {'Authorization': f'Bearer {company_b_token}'}

    with app.app_context():
        QuotaService.change_plan(company_b_id, 'free') # limit 3 vehicles
        # Delete existing test vehicles for B
        Vehicle.query.filter_by(company_id=uuid.UUID(company_b_id)).delete()
        db.session.commit()

    # Fill 3 vehicles
    created_ids = []
    for i in range(3):
        res = client.post('/api/vehicles', json={
            'reg_number': f'MH-REUSE-{i}',
            'name': f'Reuse Truck {i}',
            'type': 'Truck',
            'capacity_kg': 5000,
            'acquisition_cost': 100000
        }, headers=headers)
        assert res.status_code == 201
        created_ids.append(res.get_json()['data']['id'])

    # 4th is rejected
    res = client.post('/api/vehicles', json={
        'reg_number': 'MH-REUSE-4',
        'name': 'Reuse Truck 4',
        'type': 'Truck',
        'capacity_kg': 5000,
        'acquisition_cost': 100000
    }, headers=headers)
    assert res.status_code == 403

    # Deactivate (soft delete) one vehicle
    res = client.delete(f'/api/vehicles/{created_ids[0]}', headers=headers)
    assert res.status_code == 200

    # Creation of new vehicle now SUCCEEDS (quota freed)
    res = client.post('/api/vehicles', json={
        'reg_number': 'MH-REUSE-SUCCESS',
        'name': 'Reuse Success Truck',
        'type': 'Truck',
        'capacity_kg': 5000,
        'acquisition_cost': 100000
    }, headers=headers)
    assert res.status_code == 201

    with app.app_context():
        Vehicle.query.filter_by(company_id=uuid.UUID(company_b_id)).delete()
        db.session.commit()
        QuotaService.change_plan(company_b_id, 'starter')

def test_tenant_isolation_subscription(client, company_a_token, company_b_token, company_a_id, company_b_id):
    """Verify Company A cannot view or modify Company B subscription/usage."""
    headers_a = {'Authorization': f'Bearer {company_a_token}'}
    headers_b = {'Authorization': f'Bearer {company_b_token}'}

    # GET /api/subscription/usage for A returns Company A stats
    res_a = client.get('/api/subscription/usage', headers=headers_a)
    assert res_a.status_code == 200
    data_a = res_a.get_json()['data']
    assert data_a['subscription']['company_id'] == company_a_id

    # GET /api/subscription/usage for B returns Company B stats
    res_b = client.get('/api/subscription/usage', headers=headers_b)
    assert res_b.status_code == 200
    data_b = res_b.get_json()['data']
    assert data_b['subscription']['company_id'] == company_b_id
