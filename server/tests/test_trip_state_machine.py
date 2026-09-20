import pytest
from app import db
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from datetime import date, timedelta

def test_trip_state_machine_valid_transitions(client, company_a_token, company_a_id):
    """Test valid trip lifecycle transitions: Draft -> Dispatched -> Completed."""
    # 1. Create Available Vehicle & Driver
    v = Vehicle(company_id=company_a_id, reg_number='VALID-01', name='Truck 1', type='Truck', capacity_kg=5000, acquisition_cost=50000.0, status='Available')
    d = Driver(company_id=company_a_id, name='Valid Driver', license_number='LIC-VAL-1', license_category='Commercial', license_expiry=date.today() + timedelta(days=365), phone='1234567890', status='Available', is_active=True)
    db.session.add_all([v, d])
    db.session.commit()

    # 2. Create Draft Trip
    res = client.post('/api/trips', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'vehicle_id': str(v.id),
        'driver_id': str(d.id),
        'source': 'Warehouse A',
        'destination': 'Store B',
        'cargo_weight_kg': 1000
    })
    assert res.status_code == 201
    trip_id = res.json['data']['id']
    assert res.json['data']['status'] == 'Draft'

    # 3. Dispatch Trip (Draft -> Dispatched)
    res_disp = client.post(f'/api/trips/{trip_id}/dispatch', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res_disp.status_code == 200
    assert res_disp.json['data']['status'] == 'Dispatched'

    # Verify vehicle and driver set to On Trip
    db.session.refresh(v)
    db.session.refresh(d)
    assert v.status == 'On Trip'
    assert d.status == 'On Trip'

    # 4. Complete Trip (Dispatched -> Completed)
    res_comp = client.post(f'/api/trips/{trip_id}/complete', headers={'Authorization': f'Bearer {company_a_token}'}, json={'actual_distance_km': 50.0})
    assert res_comp.status_code == 200
    assert res_comp.json['data']['status'] == 'Completed'

    # Verify vehicle and driver restored to Available
    db.session.refresh(v)
    db.session.refresh(d)
    assert v.status == 'Available'
    assert d.status == 'Available'

def test_trip_state_machine_invalid_transitions_rejected(client, company_a_token, company_a_id):
    """Test that invalid status transitions are rejected server-side."""
    v = Vehicle(company_id=company_a_id, reg_number='INVALID-01', name='Truck 2', type='Truck', capacity_kg=5000, acquisition_cost=50000.0, status='Available')
    d = Driver(company_id=company_a_id, name='Driver 2', license_number='LIC-VAL-2', license_category='Commercial', license_expiry=date.today() + timedelta(days=365), phone='1234567890', status='Available', is_active=True)
    db.session.add_all([v, d])
    db.session.commit()

    res = client.post('/api/trips', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'vehicle_id': str(v.id),
        'driver_id': str(d.id),
        'source': 'A',
        'destination': 'B',
        'cargo_weight_kg': 500
    })
    trip_id = res.json['data']['id']

    # Attempt Draft -> Completed directly via complete endpoint
    res_direct_comp = client.post(f'/api/trips/{trip_id}/complete', headers={'Authorization': f'Bearer {company_a_token}'}, json={})
    assert res_direct_comp.status_code == 400
    assert "Cannot complete trip in Draft status" in res_direct_comp.json['message']

    # Attempt Direct status change via PUT /api/trips/<id>
    res_put_status = client.put(f'/api/trips/{trip_id}', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'status': 'Completed'
    })
    assert res_put_status.status_code == 400
    assert "Direct status updates are not allowed" in res_put_status.json['message']

    # Dispatch validly
    client.post(f'/api/trips/{trip_id}/dispatch', headers={'Authorization': f'Bearer {company_a_token}'}, json={})

    # Attempt Dispatched -> Draft via PUT /api/trips/<id>
    res_put_draft = client.put(f'/api/trips/{trip_id}', headers={'Authorization': f'Bearer {company_a_token}'}, json={
        'status': 'Draft'
    })
    assert res_put_draft.status_code == 400

    # Complete trip
    client.post(f'/api/trips/{trip_id}/complete', headers={'Authorization': f'Bearer {company_a_token}'}, json={})

    # Attempt Completed -> Draft or Completed -> Dispatched via cancel/dispatch endpoints
    res_re_dispatch = client.post(f'/api/trips/{trip_id}/dispatch', headers={'Authorization': f'Bearer {company_a_token}'}, json={})
    assert res_re_dispatch.status_code == 400

    res_cancel_completed = client.post(f'/api/trips/{trip_id}/cancel', headers={'Authorization': f'Bearer {company_a_token}'}, json={})
    assert res_cancel_completed.status_code == 400
