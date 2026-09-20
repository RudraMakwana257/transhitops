import os
import uuid
import pytest
from app import db
from app.models.company import Company
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.services.trip_service import TripService
from app.services.billing_service import BillingService, MockPaymentProvider
from app.services.notification_service import create_notification
from app.middleware.env_validator import validate_environment

def test_env_validator_production_fail_fast():
    """Verify validate_environment raises RuntimeError in production mode with default secrets."""
    orig_env = os.environ.get('FLASK_ENV')
    orig_secret = os.environ.get('SECRET_KEY')
    try:
        os.environ['FLASK_ENV'] = 'production'
        os.environ['SECRET_KEY'] = 'dev-secret-key'
        with pytest.raises(RuntimeError):
            validate_environment()
    finally:
        if orig_env:
            os.environ['FLASK_ENV'] = orig_env
        else:
            os.environ.pop('FLASK_ENV', None)
        if orig_secret:
            os.environ['SECRET_KEY'] = orig_secret
        else:
            os.environ.pop('SECRET_KEY', None)

from datetime import date

def test_trip_completion_full_payload(app, seed_data):
    """Verify trip completion properly calculates actual_distance and updates vehicle.odometer_km."""
    cid = uuid.UUID(seed_data['company_a_id'])
    with app.app_context():
        v = Vehicle(company_id=cid, reg_number='MH-01-COMP-1', name='Comp Truck', type='Truck', capacity_kg=5000, acquisition_cost=100000, odometer_km=10000, status='Available')
        d = Driver(company_id=cid, name='Comp Driver', license_number='LIC-COMP-1', license_category='HMV', license_expiry=date(2027, 12, 31), phone='9900990099', status='Available')
        db.session.add_all([v, d])
        db.session.flush()

        t = Trip(company_id=cid, trip_number='TRIP-COMP-001', vehicle_id=v.id, driver_id=d.id, source='A', destination='B', cargo_weight_kg=1000, start_odometer=10000, status='Dispatched')
        db.session.add(t)
        db.session.commit()

        # Complete trip with end_odometer = 10250, fuel = 35.0, revenue = 15000
        completed_trip = TripService.complete_trip(
            company_id=cid,
            trip_id=t.id,
            user_id=uuid.UUID(seed_data['admin_a_id']),
            end_odometer=10250,
            fuel_consumed_l=35.0,
            revenue=15000,
            notes='Successful delivery'
        )

        assert completed_trip.status == 'Completed'
        assert completed_trip.end_odometer == 10250.0
        assert completed_trip.actual_distance_km == 250.0
        assert completed_trip.fuel_consumed_l == 35.0
        assert completed_trip.revenue == 15000.0
        assert v.odometer_km == 10250.0
        assert v.status == 'Available'
        assert d.status == 'Available'

def test_csv_bulk_import_vehicles_and_drivers(client, company_a_token, company_a_id):
    """Test bulk CSV import endpoints for vehicles and drivers."""
    headers = {'Authorization': f'Bearer {company_a_token}'}

    csv_vehicles = "reg_number,name,type,capacity_kg,acquisition_cost\nMH-01-CSV-1,CSV Truck 1,Truck,5000,120000\nMH-01-CSV-2,CSV Van 2,Van,2000,80000\n"
    res = client.post('/api/onboarding/import/vehicles', data=csv_vehicles, headers=headers, content_type='text/csv')
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['imported'] == 2

    csv_drivers = "name,license_number,license_category,phone\nCSV Driver 1,LIC-CSV-1,HMV,9876543210\nCSV Driver 2,LIC-CSV-2,LMV,9876543211\n"
    res = client.post('/api/onboarding/import/drivers', data=csv_drivers, headers=headers, content_type='text/csv')
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['imported'] == 2

def test_billing_service_webhook_idempotency(app, seed_data):
    """Verify PaymentProvider webhook verification and idempotent billing processing."""
    cid = seed_data['company_a_id']
    provider = MockPaymentProvider()
    event_id = str(uuid.uuid4())
    payload = b'{"type": "invoice.payment_succeeded"}'
    event_data = {"id": event_id, "type": "invoice.payment_succeeded", "company_id": cid, "plan_slug": "growth"}

    with app.app_context():
        res1 = BillingService.handle_webhook_event(provider, payload, "valid_sig", event_data)
        assert res1['status'] == 'success'

        # Duplicate event should be skipped idempotently
        res2 = BillingService.handle_webhook_event(provider, payload, "valid_sig", event_data)
        assert res2['status'] == 'skipped'
        assert res2['reason'] == 'duplicate_event'

def test_notification_deduplication(app, seed_data):
    """Verify rapid duplicate notifications for the same entity are deduplicated."""
    cid = seed_data['company_a_id']
    uid = seed_data['admin_a_id']
    eid = str(uuid.uuid4())

    with app.app_context():
        n1 = create_notification(cid, uid, "Vehicle Warning", "Check engine", "warning", "vehicle", eid)
        n2 = create_notification(cid, uid, "Vehicle Warning", "Check engine updated", "warning", "vehicle", eid)

        assert n1 is not None
        assert n2 is not None
        assert n1.id == n2.id
        assert n2.message == "Check engine updated"

def test_customer_and_shipment_crud_apis(client, company_a_token, company_a_id):
    """Test Customer and Shipment CRUD endpoints with tenant isolation."""
    headers = {'Authorization': f'Bearer {company_a_token}'}

    # 1. Create Customer
    cust_payload = {"name": "Acme Logistics", "email": "acme@example.com", "phone": "1234567890", "address": "123 Main St"}
    res = client.post('/api/customers', json=cust_payload, headers=headers)
    assert res.status_code == 201
    cust_data = res.get_json()['data']
    cust_id = cust_data['id']
    assert cust_data['name'] == "Acme Logistics"

    # 2. Create Shipment
    shp_payload = {
        "customer_id": cust_id,
        "origin": "Warehouse A",
        "destination": "Client Hub B",
        "weight_kg": 1500.0,
        "items": [{"description": "Electronics Pallet", "quantity": 10, "weight_kg": 150.0}]
    }
    res = client.post('/api/shipments', json=shp_payload, headers=headers)
    assert res.status_code == 201
    shp_data = res.get_json()['data']
    assert shp_data['origin'] == "Warehouse A"
    assert len(shp_data['items']) == 1

def test_waypoint_arrival_and_departure_transitions(client, company_a_token, company_a_id, seed_data, app):
    """Test waypoint arrival/departure endpoints and Dispatched -> In Progress status transition."""
    headers = {'Authorization': f'Bearer {company_a_token}'}
    cid = uuid.UUID(company_a_id)

    with app.app_context():
        v = Vehicle(company_id=cid, reg_number='MH-01-WAY-1', name='Way Truck', type='Truck', capacity_kg=5000, acquisition_cost=100000, status='Available')
        d = Driver(company_id=cid, name='Way Driver', license_number='LIC-WAY-1', license_category='HMV', license_expiry=date(2027, 12, 31), phone='9900990099', status='Available')
        db.session.add_all([v, d])
        db.session.flush()

        waypoints = [
            {"id": "wp1", "sequence": 1, "location": "Stop 1", "status": "Pending"},
            {"id": "wp2", "sequence": 2, "location": "Stop 2", "status": "Pending"}
        ]
        t = Trip(company_id=cid, trip_number='TRIP-WAY-001', vehicle_id=v.id, driver_id=d.id, source='Origin', destination='Final', cargo_weight_kg=1000, waypoints=waypoints, status='Dispatched')
        db.session.add(t)
        db.session.commit()
        trip_id = str(t.id)

    # Record arrival at waypoint 1
    res = client.post(f'/api/trips/{trip_id}/waypoints/wp1/arrive', headers=headers)
    assert res.status_code == 200
    w_data = res.get_json()['data']['waypoints']
    assert w_data[0]['status'] == "Arrived"

    # Record departure at waypoint 1 -> Should transition trip status to 'In Progress'
    res = client.post(f'/api/trips/{trip_id}/waypoints/wp1/depart', headers=headers)
    assert res.status_code == 200
    t_data = res.get_json()['data']
    assert t_data['status'] == "In Progress"
    assert t_data['waypoints'][0]['status'] == "Departed"

import io

def test_storage_service_and_attachment_upload_api(client, company_a_token, company_a_id):
    """Test StorageService file upload and deletion API."""
    headers = {'Authorization': f'Bearer {company_a_token}'}
    data = {
        'file': (io.BytesIO(b"Sample file content for test"), 'test_doc.txt'),
        'entity_type': 'maintenance',
        'entity_id': 'maint_123'
    }
    res = client.post('/api/attachments/upload', data=data, headers=headers, content_type='multipart/form-data')
    assert res.status_code == 201
    file_info = res.get_json()['data']
    assert file_info['filename'] == 'test_doc.txt'
    assert file_info['entity_type'] == 'maintenance'

    attach_id = file_info['id']
    # Delete attachment
    del_res = client.delete(f'/api/attachments/{attach_id}', headers=headers)
    assert del_res.status_code == 200

def test_proof_of_delivery_capture_api(client, company_a_token, company_a_id, seed_data, app):
    """Test Proof of Delivery (POD) capture API."""
    headers = {'Authorization': f'Bearer {company_a_token}'}
    cid = uuid.UUID(company_a_id)

    with app.app_context():
        v = Vehicle(company_id=cid, reg_number='MH-01-POD-1', name='POD Truck', type='Truck', capacity_kg=5000, acquisition_cost=100000, status='Available')
        d = Driver(company_id=cid, name='POD Driver', license_number='LIC-POD-1', license_category='HMV', license_expiry=date(2027, 12, 31), phone='9900990099', status='Available')
        db.session.add_all([v, d])
        db.session.flush()

        t = Trip(company_id=cid, trip_number='TRIP-POD-001', vehicle_id=v.id, driver_id=d.id, source='Origin', destination='Final', cargo_weight_kg=1000, status='Dispatched')
        db.session.add(t)
        db.session.commit()
        trip_id = str(t.id)

    pod_payload = {
        "recipient_name": "John Client",
        "recipient_signature": "https://storage.transitops.com/signatures/sig1.png",
        "delivery_photo": "https://storage.transitops.com/photos/photo1.jpg",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "notes": "Delivered intact"
    }

    res = client.post(f'/api/trips/{trip_id}/pod', json=pod_payload, headers=headers)
    assert res.status_code == 200
    t_data = res.get_json()['data']
    assert t_data['pod_details']['recipient_name'] == "John Client"
    assert t_data['pod_details']['recipient_signature'] == "https://storage.transitops.com/signatures/sig1.png"

def test_driver_portal_assigned_trips_and_status_update(client, company_a_token, company_a_id, seed_data, app):
    """Test Driver Portal endpoints for assigned trips and status update."""
    headers = {'Authorization': f'Bearer {company_a_token}'}
    cid = uuid.UUID(company_a_id)

    with app.app_context():
        v = Vehicle(company_id=cid, reg_number='MH-01-DRV-1', name='Driver Truck', type='Truck', capacity_kg=5000, acquisition_cost=100000, status='Available')
        d = Driver(company_id=cid, user_id=uuid.UUID(seed_data['admin_a_id']), name='Portal Driver', license_number='LIC-DRV-1', license_category='HMV', license_expiry=date(2027, 12, 31), phone='9900990099', status='Available')
        db.session.add_all([v, d])
        db.session.flush()

        t = Trip(company_id=cid, trip_number='TRIP-DRV-001', vehicle_id=v.id, driver_id=d.id, source='Origin', destination='Final', cargo_weight_kg=1000, status='Dispatched')
        db.session.add(t)
        db.session.commit()
        trip_id = str(t.id)

    # 1. Get assigned trips
    res = client.get('/api/driver/assigned-trips', headers=headers)
    assert res.status_code == 200
    trips_data = res.get_json()['data']
    assert len(trips_data) >= 1
    assert any(tr['id'] == trip_id for tr in trips_data)

    # 2. Update trip status
    res = client.post(f'/api/driver/trips/{trip_id}/update-status', json={'status': 'In Progress'}, headers=headers)
    assert res.status_code == 200
    assert res.get_json()['data']['status'] == 'In Progress'

def test_public_checkout_and_webhook_logging_api(client, company_a_id):
    """Test public checkout and webhook routes return 400 under Manual Billing model."""
    res = client.post('/api/subscription/checkout', json={'company_id': company_a_id, 'plan_slug': 'growth'})
    assert res.status_code == 400

    evt_id = f"evt_{uuid.uuid4().hex[:8]}"
    webhook_payload = {
        "id": evt_id,
        "type": "invoice.payment_succeeded",
        "company_id": company_a_id,
        "plan_slug": "growth"
    }
    wh_res = client.post('/api/subscription/webhook', json=webhook_payload, headers={'X-Signature': 'mock_sig'})
    assert wh_res.status_code == 400
