import pytest
import uuid
from datetime import datetime, timedelta
from app.models.company_subscription import CompanySubscription
from app.models.manual_payment import ManualPayment
from app.models.subscription_plan import SubscriptionPlan
from app.services.manual_billing_service import ManualBillingService, add_months

def test_add_months_calendar_logic():
    """Verify calendar-aware month arithmetic and month-end boundary handling."""
    # Standard addition
    d1 = datetime(2026, 1, 15)
    assert add_months(d1, 1) == datetime(2026, 2, 15)
    assert add_months(d1, 12) == datetime(2027, 1, 15)

    # Month-end boundary: Jan 31 + 1m -> Feb 28
    d2 = datetime(2026, 1, 31)
    assert add_months(d2, 1) == datetime(2026, 2, 28)

    # Jan 31 + 2m -> Mar 31
    assert add_months(d2, 2) == datetime(2026, 3, 31)

def test_manual_billing_record_payment(app, company_a_id, super_admin_user_id):
    """Test recording confirmed manual payments across supported payment methods."""
    cid = uuid.UUID(company_a_id)

    with app.app_context():
        # Get active plan
        plan = SubscriptionPlan.query.filter_by(slug='pro').first() or SubscriptionPlan.query.first()

        for method in ['CASH', 'UPI', 'BANK_TRANSFER', 'PHONE_CALL', 'FACE_TO_FACE', 'OTHER']:
            payment = ManualBillingService.record_payment(
                company_id=cid,
                plan_identifier=plan.slug,
                amount=12000.00,
                payment_method=method,
                recorded_by_user_id=super_admin_user_id,
                billing_period_months=12,
                reference_number=f"REF-{method}-123",
                notes=f"Paid via {method}"
            )
            assert payment.status == 'CONFIRMED'
            assert payment.payment_method == method
            assert float(payment.amount) == 12000.00
            assert payment.billing_period_months == 12

            sub = CompanySubscription.query.filter_by(company_id=cid).first()
            assert sub.status == 'active'
            assert sub.plan_id == plan.id

def test_subscription_extension_rules(app, company_a_id, super_admin_user_id):
    """Verify subscription extension rules when active vs expired."""
    cid = uuid.UUID(company_a_id)

    with app.app_context():
        plan = SubscriptionPlan.query.first()
        sub = CompanySubscription.query.filter_by(company_id=cid).first()

        # Set subscription to expired
        past = datetime.utcnow() - timedelta(days=10)
        sub.status = 'expired'
        sub.current_period_end = past

        # Expired renewal starts from payment date
        now = datetime.utcnow()
        pay1 = ManualBillingService.record_payment(
            company_id=cid,
            plan_identifier=plan.slug,
            amount=1000.00,
            payment_method='UPI',
            recorded_by_user_id=super_admin_user_id,
            billing_period_months=1,
            payment_date=now
        )
        assert sub.status == 'active'
        assert abs((sub.current_period_end - add_months(now, 1)).total_seconds()) < 5

        # Record another payment while ACTIVE -> extends from current_period_end
        old_end = sub.current_period_end
        pay2 = ManualBillingService.record_payment(
            company_id=cid,
            plan_identifier=plan.slug,
            amount=1000.00,
            payment_method='CASH',
            recorded_by_user_id=super_admin_user_id,
            billing_period_months=3
        )
        assert sub.status == 'active'
        assert abs((sub.current_period_end - add_months(old_end, 3)).total_seconds()) < 5

def test_payment_reversal(app, company_a_id, super_admin_user_id):
    """Test payment reversal logic and subscription recalculation."""
    cid = uuid.UUID(company_a_id)

    with app.app_context():
        plan = SubscriptionPlan.query.first()
        payment = ManualBillingService.record_payment(
            company_id=cid,
            plan_identifier=plan.slug,
            amount=500.00,
            payment_method='CASH',
            recorded_by_user_id=super_admin_user_id,
            billing_period_months=1
        )

        reversed_pay = ManualBillingService.reverse_payment(
            payment_id=payment.id,
            reversed_by_user_id=super_admin_user_id,
            reason="Bounced check"
        )
        assert reversed_pay.status == 'REVERSED'
        assert reversed_pay.reversal_reason == "Bounced check"

def test_admin_payment_api_security(client, super_admin_token, company_a_token, company_a_id, super_admin_user_id):
    """Verify RBAC on Super Admin manual payment endpoints."""
    headers_admin = {'Authorization': f'Bearer {super_admin_token}'}
    headers_fleet = {'Authorization': f'Bearer {company_a_token}'}

    # Fleet manager attempt to create payment -> 403 Forbidden
    res_fleet = client.post('/api/admin/payments', json={
        'company_id': company_a_id,
        'plan_slug': 'growth',
        'amount': 1000,
        'payment_method': 'CASH'
    }, headers=headers_fleet)
    assert res_fleet.status_code == 403

    # Super Admin create payment -> 201 Created
    res_admin = client.post('/api/admin/payments', json={
        'company_id': company_a_id,
        'plan_slug': 'growth',
        'amount': 1000,
        'payment_method': 'CASH',
        'billing_period_months': 1
    }, headers=headers_admin)
    assert res_admin.status_code == 201
    pay_id = res_admin.json['data']['id']

    # Super Admin list payments -> 200 OK
    res_list = client.get('/api/admin/payments', headers=headers_admin)
    assert res_list.status_code == 200

    # Super Admin reverse payment -> 200 OK
    res_rev = client.post(f'/api/admin/payments/{pay_id}/reverse', json={'reason': 'Mistake'}, headers=headers_admin)
    assert res_rev.status_code == 200

def test_p0_4_change_plan_bypass_prevention(client, company_a_token):
    """Verify fleet_manager cannot upgrade plan for free via /api/subscription/change-plan."""
    headers = {'Authorization': f'Bearer {company_a_token}'}
    res = client.post('/api/subscription/change-plan', json={'plan_slug': 'enterprise'}, headers=headers)
    assert res.status_code == 403

def test_disabled_online_gateway_routes(client):
    """Verify checkout and webhook routes return 400 Bad Request."""
    res1 = client.post('/api/subscription/checkout', json={'plan_slug': 'pro'})
    assert res1.status_code == 400

    res2 = client.post('/api/subscription/webhook', json={'type': 'invoice.payment_succeeded'})
    assert res2.status_code == 400

def test_expiration_worker(app, company_a_id):
    """Test background subscription expiration worker."""
    cid = uuid.UUID(company_a_id)

    try:
        with app.app_context():
            sub = CompanySubscription.query.filter_by(company_id=cid).first()
            sub.status = 'active'
            sub.current_period_end = datetime.utcnow() - timedelta(days=2)

            expired_count = ManualBillingService.expire_outdated_subscriptions()
            assert expired_count >= 1
            assert sub.status == 'expired'
    finally:
        with app.app_context():
            from app import db
            sub = CompanySubscription.query.filter_by(company_id=cid).first()
            if sub:
                sub.status = 'active'
                sub.current_period_end = datetime.utcnow() + timedelta(days=30)
                db.session.commit()

