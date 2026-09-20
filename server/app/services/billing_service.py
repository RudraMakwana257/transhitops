import os
import hmac
import hashlib
import time
import uuid
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from app import db
from app.models.company_subscription import CompanySubscription
from app.models.audit_log import AuditLog
from app.models.webhook_log import WebhookLog
from app.services.quota_service import QuotaService

logger = logging.getLogger(__name__)

class PaymentProvider(ABC):
    @abstractmethod
    def verify_webhook_signature(self, payload: bytes, signature_header: str) -> bool:
        pass

    @abstractmethod
    def process_webhook_event(self, event_data: dict) -> dict:
        pass

    @abstractmethod
    def create_checkout_session(self, company_id: str, plan_slug: str) -> dict:
        pass

class MockPaymentProvider(PaymentProvider):
    name = "mock"

    def __init__(self, secret: str = "mock_webhook_secret"):
        self.secret = secret

    def verify_webhook_signature(self, payload: bytes, signature_header: str) -> bool:
        return bool(signature_header and signature_header != "invalid")

    def process_webhook_event(self, event_data: dict) -> dict:
        event_type = event_data.get('type', '')
        company_id = event_data.get('company_id')
        plan_slug = event_data.get('plan_slug')
        event_id = event_data.get('id', str(uuid.uuid4()))

        return {
            "event_id": event_id,
            "event_type": event_type,
            "company_id": company_id,
            "plan_slug": plan_slug
        }

    def create_checkout_session(self, company_id: str, plan_slug: str) -> dict:
        session_id = f"cs_{uuid.uuid4().hex[:12]}"
        return {
            "session_id": session_id,
            "checkout_url": f"https://checkout.transitops.com/pay/{session_id}?plan={plan_slug}&company={company_id}",
            "plan_slug": plan_slug,
            "provider": "mock"
        }

class StripePaymentProvider(PaymentProvider):
    name = "stripe"

    def __init__(self, secret_key: str = None, webhook_secret: str = None):
        self.secret_key = secret_key or os.environ.get('STRIPE_SECRET_KEY')
        self.webhook_secret = webhook_secret or os.environ.get('STRIPE_WEBHOOK_SECRET')
        if not self.secret_key or not self.webhook_secret:
            if os.environ.get('FLASK_ENV') == 'production':
                raise ValueError("Production requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET when PAYMENT_PROVIDER=stripe.")

    def verify_webhook_signature(self, payload: bytes, signature_header: str) -> bool:
        if not signature_header or not self.webhook_secret:
            return False
        pairs = {}
        for item in signature_header.split(','):
            if '=' in item:
                k, v = item.split('=', 1)
                pairs[k.strip()] = v.strip()
        timestamp = pairs.get('t')
        v1_sig = pairs.get('v1')
        if not timestamp or not v1_sig:
            return False
        try:
            if abs(time.time() - int(timestamp)) > 300:
                return False
        except ValueError:
            return False

        signed_payload = f"{timestamp}.".encode('utf-8') + payload
        expected_sig = hmac.new(self.webhook_secret.encode('utf-8'), signed_payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_sig, v1_sig)

    def process_webhook_event(self, event_data: dict) -> dict:
        event_type = event_data.get('type', '')
        obj = event_data.get('data', {}).get('object', {})
        company_id = obj.get('metadata', {}).get('company_id') or event_data.get('company_id')
        plan_slug = obj.get('metadata', {}).get('plan_slug') or event_data.get('plan_slug')
        event_id = event_data.get('id', str(uuid.uuid4()))

        return {
            "event_id": event_id,
            "event_type": event_type,
            "company_id": company_id,
            "plan_slug": plan_slug
        }

    def create_checkout_session(self, company_id: str, plan_slug: str) -> dict:
        session_id = f"cs_stripe_{uuid.uuid4().hex[:12]}"
        return {
            "session_id": session_id,
            "checkout_url": f"https://checkout.stripe.com/c/pay/{session_id}?plan={plan_slug}&client_reference_id={company_id}",
            "plan_slug": plan_slug,
            "provider": "stripe"
        }

class RazorpayPaymentProvider(PaymentProvider):
    name = "razorpay"

    def __init__(self, key_id: str = None, key_secret: str = None, webhook_secret: str = None):
        self.key_id = key_id or os.environ.get('RAZORPAY_KEY_ID')
        self.key_secret = key_secret or os.environ.get('RAZORPAY_KEY_SECRET')
        self.webhook_secret = webhook_secret or os.environ.get('RAZORPAY_WEBHOOK_SECRET')
        if not self.key_id or not self.key_secret or not self.webhook_secret:
            if os.environ.get('FLASK_ENV') == 'production':
                raise ValueError("Production requires RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET when PAYMENT_PROVIDER=razorpay.")

    def verify_webhook_signature(self, payload: bytes, signature_header: str) -> bool:
        if not signature_header or not self.webhook_secret:
            return False
        expected_sig = hmac.new(self.webhook_secret.encode('utf-8'), payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_sig, signature_header)

    def process_webhook_event(self, event_data: dict) -> dict:
        event_type = event_data.get('event', '')
        payload = event_data.get('payload', {})
        sub_obj = payload.get('subscription', {}).get('entity', {})
        notes = sub_obj.get('notes', {})
        company_id = notes.get('company_id') or event_data.get('company_id')
        plan_slug = notes.get('plan_slug') or event_data.get('plan_slug')
        event_id = event_data.get('account_id') or str(uuid.uuid4())

        return {
            "event_id": event_id,
            "event_type": event_type,
            "company_id": company_id,
            "plan_slug": plan_slug
        }

    def create_checkout_session(self, company_id: str, plan_slug: str) -> dict:
        session_id = f"sub_rzp_{uuid.uuid4().hex[:12]}"
        return {
            "session_id": session_id,
            "checkout_url": f"https://api.razorpay.com/v1/checkout/{session_id}?plan={plan_slug}&company={company_id}",
            "plan_slug": plan_slug,
            "provider": "razorpay"
        }

class BillingService:
    @staticmethod
    def get_payment_provider() -> PaymentProvider:
        provider_name = os.environ.get('PAYMENT_PROVIDER', 'mock').lower()
        if provider_name == 'stripe':
            return StripePaymentProvider()
        elif provider_name == 'razorpay':
            return RazorpayPaymentProvider()
        return MockPaymentProvider()

    @staticmethod
    def handle_webhook_event(provider: PaymentProvider, payload: bytes, signature: str, event_data: dict) -> dict:
        """
        Idempotent, DB-backed, transaction-safe billing webhook handler.
        """
        if not provider.verify_webhook_signature(payload, signature):
            raise ValueError("Invalid webhook signature")

        event_id = event_data.get('id')
        if event_id:
            existing_log = WebhookLog.query.filter_by(event_id=str(event_id)).first()
            if existing_log:
                logger.info("Webhook event %s already processed. Skipping (DB Idempotent).", event_id)
                return {"status": "skipped", "reason": "duplicate_event", "event_id": event_id}

        parsed = provider.process_webhook_event(event_data)
        event_type = parsed.get('event_type') or event_data.get('type')
        company_id = parsed.get('company_id') or event_data.get('company_id')
        plan_slug = parsed.get('plan_slug') or event_data.get('plan_slug')

        if not company_id:
            raise ValueError("Webhook payload missing company_id")

        cid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id

        if event_type in ['invoice.payment_succeeded', 'subscription.charged']:
            sub = CompanySubscription.query.filter_by(company_id=cid).first()
            if sub:
                sub.status = 'active'
                now = datetime.utcnow()
                sub.current_period_start = now
                sub.current_period_end = now + timedelta(days=30)
                sub.updated_at = now
            
            audit = AuditLog(company_id=cid, action='billing.payment_succeeded', entity_type='subscription', entity_id=sub.id if sub else cid)
            db.session.add(audit)
            db.session.commit()

            if plan_slug:
                QuotaService.change_plan(cid, plan_slug)

        elif event_type in ['invoice.payment_failed', 'subscription.halted']:
            sub = CompanySubscription.query.filter_by(company_id=cid).first()
            if sub:
                sub.status = 'past_due'
                sub.updated_at = datetime.utcnow()
            audit = AuditLog(company_id=cid, action='billing.payment_failed', entity_type='subscription', entity_id=sub.id if sub else cid)
            db.session.add(audit)
            db.session.commit()

        elif event_type in ['customer.subscription.deleted', 'subscription.cancelled']:
            sub = CompanySubscription.query.filter_by(company_id=cid).first()
            if sub:
                sub.status = 'canceled'
                sub.updated_at = datetime.utcnow()
            audit = AuditLog(company_id=cid, action='billing.subscription_canceled', entity_type='subscription', entity_id=sub.id if sub else cid)
            db.session.add(audit)
            db.session.commit()

        if event_id:
            log = WebhookLog(
                event_id=str(event_id),
                event_type=event_type or 'unknown',
                provider=getattr(provider, 'name', 'mock'),
                payload=event_data if isinstance(event_data, dict) else {},
                status='processed'
            )
            db.session.add(log)
            db.session.commit()

        return {"status": "success", "event_id": event_id, "event_type": event_type}

