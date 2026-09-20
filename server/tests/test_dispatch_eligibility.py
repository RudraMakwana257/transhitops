import pytest
from app import db
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from datetime import date, timedelta

def test_dispatch_eligibility_vehicle_and_driver_rules(client, company_a_token, company_a_id):
    """Test server-side dispatch eligibility rules for vehicle and driver status/license."""
    # Setup vehicles in various states
    v_avail = Vehicle(company_id=company_a_id, reg_number='ELIG-01', name='Available Truck', type='Truck', capacity_kg=5000, acquisition_cost=50000.0, status='Available')
    v_shop = Vehicle(company_id=company_a_id, reg_number='ELIG-02', name='In Shop Truck', type='Truck', capacity_kg=5000, acquisition_cost=50000.0, status='In Shop')
    v_retired = Vehicle(company_id=company_a_id, reg_number='ELIG-03', name='Retired Truck', type='Truck', capacity_kg=5000, acquisition_cost=50000.0, status='Retired')
    v_ontrip = Vehicle(company_id=company_a_id, reg_number='ELIG-04', name='On Trip Truck', type='Truck', capacity_kg=5000, acquisition_cost=50000.0, status='On Trip')

    # Setup drivers in various states
    d_valid = Driver(company_id=company_a_id, name='Valid Driver', license_number='LIC-E-1', license_category='Commercial', license_expiry=date.today() + timedelta(days=100), phone='1234567890', status='Available', is_active=True)
    d_expired = Driver(company_id=company_a_id, name='Expired Driver', license_number='LIC-E-2', license_category='Commercial', license_expiry=date.today() - timedelta(days=10), phone='1234567890', status='Available', is_active=True)
    d_inactive = Driver(company_id=company_a_id, name='Inactive Driver', license_number='LIC-E-3', license_category='Commercial', license_expiry=date.today() + timedelta(days=100), phone='1234567890', status='Available', is_active=False)
    d_ontrip = Driver(company_id=company_a_id, name='Busy Driver', license_number='LIC-E-4', license_category='Commercial', license_expiry=date.today() + timedelta(days=100), phone='1234567890', status='On Trip', is_active=True)

    db.session.add_all([v_avail, v_shop, v_retired, v_ontrip, d_valid, d_expired, d_inactive, d_ontrip])
    db.session.commit()

    # 1. In Shop Vehicle -> Dispatch Fails
    res_trip1 = client.post('/api/trips', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'vehicle_id': str(v_shop.id), 'driver_id': str(d_valid.id), 'source': 'A', 'destination': 'B', 'cargo_weight_kg': 100
    })
    trip1_id = res_trip1.json['data']['id']
    res_disp1 = client.post(f'/api/trips/{trip1_id}/dispatch', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res_disp1.status_code == 400
    assert "In Shop" in res_disp1.json['message']

    # 2. Retired Vehicle -> Dispatch Fails
    res_trip2 = client.post('/api/trips', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'vehicle_id': str(v_retired.id), 'driver_id': str(d_valid.id), 'source': 'A', 'destination': 'B', 'cargo_weight_kg': 100
    })
    trip2_id = res_trip2.json['data']['id']
    res_disp2 = client.post(f'/api/trips/{trip2_id}/dispatch', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res_disp2.status_code == 400
    assert "Retired" in res_disp2.json['message']

    # 3. Expired Driver License -> Dispatch Fails
    res_trip3 = client.post('/api/trips', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'vehicle_id': str(v_avail.id), 'driver_id': str(d_expired.id), 'source': 'A', 'destination': 'B', 'cargo_weight_kg': 100
    })
    trip3_id = res_trip3.json['data']['id']
    res_disp3 = client.post(f'/api/trips/{trip3_id}/dispatch', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res_disp3.status_code == 400
    assert "license has expired" in res_disp3.json['message']

    # 4. Inactive Driver -> Dispatch Fails
    res_trip4 = client.post('/api/trips', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'vehicle_id': str(v_avail.id), 'driver_id': str(d_inactive.id), 'source': 'A', 'destination': 'B', 'cargo_weight_kg': 100
    })
    trip4_id = res_trip4.json['data']['id']
    res_disp4 = client.post(f'/api/trips/{trip4_id}/dispatch', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res_disp4.status_code == 400
    assert "Driver is inactive" in res_disp4.json['message']

    # 5. Valid Vehicle & Driver -> Dispatch Succeeds
    res_trip5 = client.post('/api/trips', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'vehicle_id': str(v_avail.id), 'driver_id': str(d_valid.id), 'source': 'A', 'destination': 'B', 'cargo_weight_kg': 100
    })
    trip5_id = res_trip5.json['data']['id']
    res_disp5 = client.post(f'/api/trips/{trip5_id}/dispatch', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res_disp5.status_code == 200
    assert res_disp5.json['data']['status'] == 'Dispatched'

def test_check_eligibility_endpoint(client, company_a_token, company_a_id):
    """Test GET /api/trips/check-eligibility endpoint."""
    v = Vehicle(company_id=company_a_id, reg_number='ELIG-CHK-1', name='Truck', type='Truck', capacity_kg=5000, acquisition_cost=50000.0, status='In Shop')
    d = Driver(company_id=company_a_id, name='Driver', license_number='LIC-CHK-1', license_category='Commercial', license_expiry=date.today() - timedelta(days=5), phone='1234567890', status='Available', is_active=True)
    db.session.add_all([v, d])
    db.session.commit()

    res = client.get(f'/api/trips/check-eligibility?vehicle_id={v.id}&driver_id={d.id}', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res.status_code == 200
    data = res.json['data']
    assert data['eligible'] is False
    assert len(data['reasons']) >= 2
    assert any("In Shop" in r for r in data['reasons'])
    assert any("expired" in r for r in data['reasons'])
