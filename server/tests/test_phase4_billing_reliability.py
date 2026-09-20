import pytest
import uuid
import hmac
import hashlib
import time
from app.models.company_subscription import CompanySubscription
from app.models.webhook_log import WebhookLog
from app.services.billing_service import BillingService, StripePaymentProvider, RazorpayPaymentProvider, MockPaymentProvider

def test_payment_provider_selection(monkeypatch):
    """Test environment variable PAYMENT_PROVIDER selects appropriate adapter."""
    monkeypatch.setenv('PAYMENT_PROVIDER', 'stripe')
    provider = BillingService.get_payment_provider()
    assert isinstance(provider, StripePaymentProvider)

    monkeypatch.setenv('PAYMENT_PROVIDER', 'razorpay')
    provider = BillingService.get_payment_provider()
    assert isinstance(provider, RazorpayPaymentProvider)

    monkeypatch.setenv('PAYMENT_PROVIDER', 'mock')
    provider = BillingService.get_payment_provider()
    assert isinstance(provider, MockPaymentProvider)

def test_stripe_signature_verification():
    """Test Stripe HMAC signature verification."""
    provider = StripePaymentProvider(secret_key="sk_test", webhook_secret="whsec_test")
    payload = b'{"id": "evt_stripe_1", "type": "invoice.payment_succeeded"}'
    ts = str(int(time.time()))
    signed_payload = f"{ts}.".encode('utf-8') + payload
    v1_sig = hmac.new(b"whsec_test", signed_payload, hashlib.sha256).hexdigest()
    header = f"t={ts},v1={v1_sig}"

    assert provider.verify_webhook_signature(payload, header) is True
    assert provider.verify_webhook_signature(payload, f"t={ts},v1=invalid") is False

def test_razorpay_signature_verification():
    """Test Razorpay HMAC signature verification."""
    provider = RazorpayPaymentProvider(key_id="rzp_key", key_secret="rzp_sec", webhook_secret="whsec_rzp")
    payload = b'{"event": "subscription.charged"}'
    expected_sig = hmac.new(b"whsec_rzp", payload, hashlib.sha256).hexdigest()

    assert provider.verify_webhook_signature(payload, expected_sig) is True
    assert provider.verify_webhook_signature(payload, "invalid_signature") is False

def test_db_backed_webhook_idempotency(app, company_a_id):
    """Verify duplicate webhook events are detected via WebhookLog DB table."""
    cid = uuid.UUID(company_a_id)
    provider = MockPaymentProvider()
    evt_id = f"evt_dup_{uuid.uuid4().hex[:8]}"
    payload = {"id": evt_id, "type": "invoice.payment_succeeded", "company_id": str(cid)}
    raw_bytes = b'{}'

    with app.app_context():
        # First processing
        res1 = BillingService.handle_webhook_event(provider, raw_bytes, "valid", payload)
        assert res1['status'] == 'success'

        # Duplicate processing
        res2 = BillingService.handle_webhook_event(provider, raw_bytes, "valid", payload)
        assert res2['status'] == 'skipped'
        assert res2['reason'] == 'duplicate_event'

        # Verify DB log entry exists
        log = WebhookLog.query.filter_by(event_id=evt_id).first()
        assert log is not None

def test_subscription_status_access_control(client, app, company_a_token, company_a_id):
    """Verify past_due subscription blocks POST requests with 402 Payment Required."""
    headers = {'Authorization': f'Bearer {company_a_token}'}
    cid = uuid.UUID(company_a_id)

    try:
        with app.app_context():
            from app import db
            sub = CompanySubscription.query.filter_by(company_id=cid).first()
            sub.status = 'past_due'
            db.session.commit()

        # State-changing request should be blocked with 402
        res = client.post('/api/vehicles', json={"name": "Test Truck", "type": "Truck", "reg_number": "REG-PD-1", "capacity_kg": 5000}, headers=headers)
        assert res.status_code == 402
        assert res.json['error']['code'] == 'SUBSCRIPTION_INACTIVE'

        # GET request (read-only) should still succeed
        res_get = client.get('/api/vehicles', headers=headers)
        assert res_get.status_code == 200
    finally:
        with app.app_context():
            from app import db
            sub = CompanySubscription.query.filter_by(company_id=cid).first()
            sub.status = 'active'
            db.session.commit()
