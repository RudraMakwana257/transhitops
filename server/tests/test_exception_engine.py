import pytest
from datetime import date, datetime, timedelta
from app import db
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.maintenance_log import MaintenanceLog
from app.models.vehicle_health import VehicleHealth
from app.models.operational_exception import OperationalException
from app.services.exception_service import ExceptionService

def test_driver_license_detection_rules(app, company_a_id):
    """Test driver license expired and expiring detection rules and severity tiers."""
    with app.app_context():
        import uuid
        cid = uuid.UUID(company_a_id) if isinstance(company_a_id, str) else company_a_id
        today = date.today()

        # Driver 1: Expired (CRITICAL)
        d_exp = Driver(company_id=cid, name='Expired Driver', license_number='EXC-LIC-1', license_category='Commercial', license_expiry=today - timedelta(days=10), phone='1234567890')
        # Driver 2: Expiring in 5 days (HIGH)
        d_high = Driver(company_id=cid, name='High Expiring Driver', license_number='EXC-LIC-2', license_category='Commercial', license_expiry=today + timedelta(days=5), phone='1234567890')
        # Driver 3: Expiring in 20 days (MEDIUM)
        d_med = Driver(company_id=cid, name='Med Expiring Driver', license_number='EXC-LIC-3', license_category='Commercial', license_expiry=today + timedelta(days=20), phone='1234567890')
        # Driver 4: Valid (>30 days)
        d_ok = Driver(company_id=cid, name='OK Driver', license_number='EXC-LIC-4', license_category='Commercial', license_expiry=today + timedelta(days=100), phone='1234567890')

        db.session.add_all([d_exp, d_high, d_med, d_ok])
        db.session.commit()

        # Run detection
        ExceptionService.run_exception_detection(cid)
        created_for_new = OperationalException.query.filter(
            OperationalException.company_id == cid,
            OperationalException.entity_id.in_([d_exp.id, d_high.id, d_med.id, d_ok.id])
        ).count()
        assert created_for_new == 3

        # Verify Driver 1 Exception
        exc1 = OperationalException.query.filter_by(company_id=cid, entity_id=d_exp.id, status='ACTIVE').first()
        assert exc1 is not None
        assert exc1.type == 'DRIVER_LICENSE_EXPIRED'
        assert exc1.severity == 'CRITICAL'

        # Verify Driver 2 Exception
        exc2 = OperationalException.query.filter_by(company_id=cid, entity_id=d_high.id, status='ACTIVE').first()
        assert exc2 is not None
        assert exc2.type == 'DRIVER_LICENSE_EXPIRING'
        assert exc2.severity == 'HIGH'

        # Verify Driver 3 Exception
        exc3 = OperationalException.query.filter_by(company_id=cid, entity_id=d_med.id, status='ACTIVE').first()
        assert exc3 is not None
        assert exc3.type == 'DRIVER_LICENSE_EXPIRING'
        assert exc3.severity == 'MEDIUM'

        # Verify Driver 4 has no active exception
        exc4 = OperationalException.query.filter_by(company_id=cid, entity_id=d_ok.id).first()
        assert exc4 is None

def test_exception_deduplication(app, company_a_id):
    """Test that repeated detection runs do NOT create duplicate exceptions."""
    with app.app_context():
        import uuid
        cid = uuid.UUID(company_a_id) if isinstance(company_a_id, str) else company_a_id
        today = date.today()

        d = Driver(company_id=cid, name='Dup Driver', license_number='DUP-LIC-1', license_category='Commercial', license_expiry=today - timedelta(days=2), phone='1234567890')
        db.session.add(d)
        db.session.commit()

        # Run 1
        res1 = ExceptionService.run_exception_detection(cid)
        assert res1['created'] == 1

        total_active_before = OperationalException.query.filter_by(company_id=cid, entity_id=d.id, status='ACTIVE').count()
        assert total_active_before == 1

        # Run 2
        res2 = ExceptionService.run_exception_detection(cid)
        assert res2['created'] == 0

        total_active_after = OperationalException.query.filter_by(company_id=cid, entity_id=d.id, status='ACTIVE').count()
        assert total_active_after == 1

def test_exception_auto_resolution(app, company_a_id):
    """Test that resolving underlying condition auto-resolves active exception on next detection run."""
    with app.app_context():
        import uuid
        cid = uuid.UUID(company_a_id) if isinstance(company_a_id, str) else company_a_id
        today = date.today()

        d = Driver(company_id=cid, name='Renew Driver', license_number='REN-LIC-1', license_category='Commercial', license_expiry=today - timedelta(days=2), phone='1234567890')
        db.session.add(d)
        db.session.commit()

        # Run 1 creates exception
        ExceptionService.run_exception_detection(cid)
        exc = OperationalException.query.filter_by(company_id=cid, entity_id=d.id, status='ACTIVE').first()
        assert exc is not None

        # Renew license
        d.license_expiry = today + timedelta(days=365)
        db.session.commit()

        # Run 2 auto-resolves
        res2 = ExceptionService.run_exception_detection(cid)
        assert res2['resolved'] == 1

        db.session.refresh(exc)
        assert exc.status == 'RESOLVED'
        assert exc.resolved_at is not None
        assert 'auto-resolved' in exc.resolution_note.lower()

def test_maintenance_overdue_detection_and_resolution(app, company_a_id):
    """Test maintenance overdue exception creation and resolution when maintenance is completed."""
    with app.app_context():
        import uuid
        cid = uuid.UUID(company_a_id) if isinstance(company_a_id, str) else company_a_id
        today = date.today()

        v = Vehicle(company_id=cid, reg_number='MAINT-EXC-01', name='Maint Truck', type='Truck', capacity_kg=5000, acquisition_cost=50000.0)
        db.session.add(v)
        db.session.commit()

        log = MaintenanceLog(company_id=cid, vehicle_id=v.id, type='Oil Change', status='Scheduled', scheduled_date=today - timedelta(days=5))
        db.session.add(log)
        db.session.commit()

        # Run detection
        res = ExceptionService.run_exception_detection(cid)
        assert res['created'] == 1

        exc = OperationalException.query.filter_by(company_id=cid, entity_id=log.id, type='MAINTENANCE_OVERDUE', status='ACTIVE').first()
        assert exc is not None
        assert exc.severity == 'MEDIUM'

        # Complete maintenance
        log.status = 'Completed'
        log.completed_date = today
        db.session.commit()

        # Re-run detection
        res2 = ExceptionService.run_exception_detection(cid)
        assert res2['resolved'] == 1

        db.session.refresh(exc)
        assert exc.status == 'RESOLVED'

def test_vehicle_at_risk_detection(app, company_a_id):
    """Test vehicle at risk exception triggered when health_score < 60."""
    with app.app_context():
        import uuid
        cid = uuid.UUID(company_a_id) if isinstance(company_a_id, str) else company_a_id

        v = Vehicle(company_id=cid, reg_number='RISK-EXC-01', name='Risk Truck', type='Truck', capacity_kg=5000, acquisition_cost=50000.0)
        db.session.add(v)
        db.session.commit()

        vh = VehicleHealth(company_id=cid, vehicle_id=v.id, health_score=45.0)
        db.session.add(vh)
        db.session.commit()

        # Run detection
        res = ExceptionService.run_exception_detection(cid)
        assert res['created'] == 1

        exc = OperationalException.query.filter_by(company_id=cid, entity_id=v.id, type='VEHICLE_AT_RISK', status='ACTIVE').first()
        assert exc is not None
        assert exc.severity == 'HIGH'

def test_exception_api_endpoints_and_tenant_isolation(client, company_a_token, company_b_token, company_a_id, company_b_id):
    """Test exception API endpoints: detect, list, summary, detail, acknowledge, resolve, and tenant isolation."""
    # 1. Trigger detection for Company A via API
    res_detect = client.post('/api/exceptions/detect', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res_detect.status_code == 200
    assert 'created' in res_detect.json['data']

    # Create an explicit exception in Company A
    with client.application.app_context():
        import uuid
        cid_a = uuid.UUID(company_a_id) if isinstance(company_a_id, str) else company_a_id
        cid_b = uuid.UUID(company_b_id) if isinstance(company_b_id, str) else company_b_id

        exc_a = OperationalException(
            company_id=cid_a,
            type='DRIVER_LICENSE_EXPIRED',
            severity='CRITICAL',
            status='ACTIVE',
            title='Company A Expired License',
            description='Test description',
            entity_type='driver',
            entity_id=uuid.uuid4(),
            detected_at=datetime.utcnow()
        )
        exc_b = OperationalException(
            company_id=cid_b,
            type='DRIVER_LICENSE_EXPIRED',
            severity='CRITICAL',
            status='ACTIVE',
            title='Company B Expired License',
            description='Test description',
            entity_type='driver',
            entity_id=uuid.uuid4(),
            detected_at=datetime.utcnow()
        )
        db.session.add_all([exc_a, exc_b])
        db.session.commit()
        exc_a_id = str(exc_a.id)
        exc_b_id = str(exc_b.id)

    # 2. Company A list exceptions (must NOT see Company B)
    res_list = client.get('/api/exceptions?status=ACTIVE', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res_list.status_code == 200
    items = res_list.json['data']['items']
    assert any(i['id'] == exc_a_id for i in items)
    assert not any(i['id'] == exc_b_id for i in items)

    # 3. Company A get summary stats
    res_sum = client.get('/api/exceptions/summary', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res_sum.status_code == 200
    assert res_sum.json['data']['CRITICAL'] >= 1

    # 4. Company A get detail of own exception
    res_det = client.get(f'/api/exceptions/{exc_a_id}', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res_det.status_code == 200
    assert res_det.json['data']['title'] == 'Company A Expired License'

    # 5. Tenant Isolation: Company B attempts to view/resolve Company A exception -> 404
    res_b_det = client.get(f'/api/exceptions/{exc_a_id}', headers={'Authorization': f'Bearer {company_b_token}'})
    assert res_b_det.status_code == 404

    res_b_ack = client.post(f'/api/exceptions/{exc_a_id}/acknowledge', headers={'Authorization': f'Bearer {company_b_token}'})
    assert res_b_ack.status_code == 400 or res_b_ack.status_code == 404

    # 6. Company A acknowledge own exception
    res_ack = client.post(f'/api/exceptions/{exc_a_id}/acknowledge', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res_ack.status_code == 200
    assert res_ack.json['data']['status'] == 'ACKNOWLEDGED'

    # 7. Invalid Transition: Cannot acknowledge an already ACKNOWLEDGED exception
    res_ack_dup = client.post(f'/api/exceptions/{exc_a_id}/acknowledge', headers={'Authorization': f'Bearer {company_a_token}'})
    assert res_ack_dup.status_code == 400

    # 8. Company A resolve own exception
    res_res = client.post(f'/api/exceptions/{exc_a_id}/resolve', headers={'Authorization': f'Bearer {company_a_token}'}, json={'resolution_note': 'Fixed license'})
    assert res_res.status_code == 200
    assert res_res.json['data']['status'] == 'RESOLVED'
