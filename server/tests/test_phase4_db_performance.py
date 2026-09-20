import pytest
import uuid
from app.models.customer import Customer
from app.models.shipment import Shipment
from app.models.shipment_item import ShipmentItem
from app.models.file_metadata import FileMetadata
from app.models.webhook_log import WebhookLog

def test_missing_models_db_operations(app, company_a_id):
    """Verify Customer, Shipment, ShipmentItem, FileMetadata, and WebhookLog models insert and query cleanly."""
    cid = uuid.UUID(company_a_id)
    with app.app_context():
        from app import db
        customer = Customer(company_id=cid, name="Acme Logistics", email="acme@test.com", phone="1234567890")
        db.session.add(customer)
        db.session.flush()

        shipment = Shipment(company_id=cid, customer_id=customer.id, tracking_number="SHP-TEST-99", origin="Loc A", destination="Loc B", weight_kg=250.0)
        db.session.add(shipment)
        db.session.flush()

        item = ShipmentItem(shipment_id=shipment.id, description="Pallet Box", quantity=2, weight_kg=125.0)
        file_meta = FileMetadata(company_id=cid, filename="test.pdf", file_key="attachments/test.pdf", mime_type="application/pdf", file_size=1024)
        wb_log = WebhookLog(event_id="evt_test_123", event_type="payment.succeeded", provider="stripe", status="processed")
        
        db.session.add_all([item, file_meta, wb_log])
        db.session.commit()

        # Query assertions
        assert Customer.query.filter_by(id=customer.id).first() is not None
        assert Shipment.query.filter_by(id=shipment.id).first() is not None
        assert ShipmentItem.query.filter_by(id=item.id).first() is not None
        assert FileMetadata.query.filter_by(id=file_meta.id).first() is not None
        assert WebhookLog.query.filter_by(event_id="evt_test_123").first() is not None

def test_customers_pagination(client, company_a_token):
    """Test pagination parameters on /api/customers."""
    headers = {'Authorization': f'Bearer {company_a_token}'}
    res = client.get('/api/customers?page=1&page_size=2', headers=headers)
    assert res.status_code == 200
    data = res.json['data']
    assert 'items' in data
    assert 'total' in data
    assert 'page' in data
    assert data['page'] == 1
    assert data['page_size'] == 2

def test_shipments_pagination(client, company_a_token):
    """Test pagination parameters on /api/shipments."""
    headers = {'Authorization': f'Bearer {company_a_token}'}
    res = client.get('/api/shipments?page=1&page_size=2', headers=headers)
    assert res.status_code == 200
    data = res.json['data']
    assert 'items' in data
    assert 'total' in data
    assert 'page' in data

def test_financial_kpis_endpoint(client, company_a_token):
    """Test financial KPIs endpoint operates efficiently."""
    headers = {'Authorization': f'Bearer {company_a_token}'}
    res = client.get('/api/dashboard/financial-kpis', headers=headers)
    assert res.status_code == 200
    data = res.json['data']
    assert 'operational_cost' in data
    assert 'top_vehicles' in data
