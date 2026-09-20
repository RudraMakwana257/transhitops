import calendar
import uuid
import logging
from datetime import datetime
from sqlalchemy import func
from app import db
from app.models.company import Company
from app.models.subscription_plan import SubscriptionPlan
from app.models.company_subscription import CompanySubscription
from app.models.manual_payment import ManualPayment
from app.models.audit_log import AuditLog
from app.services.quota_service import QuotaService

logger = logging.getLogger(__name__)

SUPPORTED_PAYMENT_METHODS = {
    'CASH',
    'UPI',
    'BANK_TRANSFER',
    'PHONE_CALL',
    'FACE_TO_FACE',
    'OTHER'
}

def add_months(dt: datetime, months: int) -> datetime:
    """
    Calendar-aware month addition.
    Handles month-end boundaries deterministically (e.g. Jan 31 + 1m = Feb 28/29).
    """
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)

class ManualBillingService:

    @staticmethod
    def record_payment(
        company_id,
        plan_identifier,
        amount,
        payment_method,
        recorded_by_user_id,
        billing_period_months=1,
        payment_date=None,
        period_start=None,
        period_end=None,
        currency='INR',
        reference_number=None,
        notes=None
    ) -> ManualPayment:
        """
        Record and confirm an offline/manual payment, atomically extending or creating
        a company's active subscription ledger state.
        """
        method_upper = str(payment_method).upper() if payment_method else 'OTHER'
        if method_upper not in SUPPORTED_PAYMENT_METHODS:
            raise ValueError(f"Invalid payment method '{payment_method}'. Must be one of {sorted(list(SUPPORTED_PAYMENT_METHODS))}")

        if amount is None or float(amount) < 0:
            raise ValueError("Payment amount must be a non-negative number.")

        cid = uuid.UUID(str(company_id))
        comp = Company.query.get(cid)
        if not comp:
            raise ValueError(f"Company {company_id} not found.")

        # Find subscription plan by UUID or slug
        plan = None
        try:
            plan_uuid = uuid.UUID(str(plan_identifier))
            plan = SubscriptionPlan.query.get(plan_uuid)
        except (ValueError, TypeError):
            plan = SubscriptionPlan.query.filter_by(slug=str(plan_identifier)).first()

        if not plan:
            raise ValueError(f"Subscription plan '{plan_identifier}' not found.")

        now = datetime.utcnow()
        pay_date = payment_date if isinstance(payment_date, datetime) else (datetime.fromisoformat(payment_date) if isinstance(payment_date, str) else now)

        sub = CompanySubscription.query.filter_by(company_id=cid).first()

        # Deterministic Subscription Extension Rules
        if period_start and period_end:
            # Custom dates provided
            p_start = period_start if isinstance(period_start, datetime) else datetime.fromisoformat(period_start)
            p_end = period_end if isinstance(period_end, datetime) else datetime.fromisoformat(period_end)
            calc_months = 0
        else:
            calc_months = int(billing_period_months) if billing_period_months else 1
            if sub and sub.status == 'active' and sub.current_period_end and sub.current_period_end > now:
                # Existing active subscription is extended from its current period end
                p_start = sub.current_period_end
            else:
                p_start = pay_date

            p_end = add_months(p_start, calc_months)

        if p_end <= p_start:
            raise ValueError("Period end must be strictly after period start.")

        # Check transaction reference uniqueness for confirmed payments
        if reference_number and str(reference_number).strip():
            ref_clean = str(reference_number).strip().upper()
            existing_pay = ManualPayment.query.filter(
                func.upper(ManualPayment.reference_number) == ref_clean,
                ManualPayment.status == 'CONFIRMED'
            ).first()
            if existing_pay:
                raise ValueError(f"Payment with transaction reference '{ref_clean}' has already been recorded.")

        payment = ManualPayment(
            company_id=cid,
            plan_id=plan.id,
            amount=amount,
            currency=currency or 'INR',
            payment_method=method_upper,
            payment_date=pay_date,
            period_start=p_start,
            period_end=p_end,
            billing_period_months=calc_months,
            status='CONFIRMED',
            reference_number=str(reference_number).strip() if reference_number else None,
            notes=notes,
            recorded_by_user_id=uuid.UUID(str(recorded_by_user_id))
        )
        db.session.add(payment)

        # Update or create CompanySubscription
        if not sub:
            sub = CompanySubscription(
                company_id=cid,
                plan_id=plan.id,
                status='active',
                current_period_start=p_start,
                current_period_end=p_end
            )
            db.session.add(sub)
        else:
            sub.plan_id = plan.id
            sub.status = 'active'
            if sub.current_period_start is None or sub.current_period_start > p_start:
                sub.current_period_start = p_start
            sub.current_period_end = p_end
            sub.updated_at = now

        # Update Quota & Feature entitlements
        QuotaService.change_plan(cid, plan.slug)

        # Record Audit Trail
        audit = AuditLog(
            company_id=cid,
            user_id=uuid.UUID(str(recorded_by_user_id)),
            action='billing.manual_payment_recorded',
            entity_type='manual_payment',
            entity_id=payment.id,
            new_value={
                'amount': float(amount),
                'currency': currency,
                'payment_method': method_upper,
                'plan': plan.slug,
                'period_start': p_start.isoformat(),
                'period_end': p_end.isoformat(),
                'reference_number': reference_number
            }
        )
        db.session.add(audit)

        db.session.commit()
        logger.info("Recorded confirmed manual payment %s for company %s (Plan: %s, Amount: %s %s)",
                    payment.id, comp.name, plan.slug, amount, currency)

        return payment

    @staticmethod
    def reverse_payment(payment_id, reversed_by_user_id, reason=None) -> ManualPayment:
        """
        Reverse a confirmed manual payment for audit compliance and update tenant subscription state.
        """
        pid = uuid.UUID(str(payment_id))
        payment = ManualPayment.query.get(pid)
        if not payment:
            raise ValueError(f"Manual payment {payment_id} not found.")

        if payment.status != 'CONFIRMED':
            raise ValueError(f"Payment {payment_id} cannot be reversed because status is '{payment.status}'.")

        now = datetime.utcnow()
        payment.status = 'REVERSED'
        payment.reversal_reason = reason or "Reversed by administrator"
        payment.reversed_at = now
        payment.reversed_by_user_id = uuid.UUID(str(reversed_by_user_id))

        cid = payment.company_id
        sub = CompanySubscription.query.filter_by(company_id=cid).first()

        # Recalculate remaining confirmed active payments
        remaining_payments = ManualPayment.query.filter_by(
            company_id=cid, status='CONFIRMED'
        ).order_by(ManualPayment.period_end.desc()).all()

        if remaining_payments:
            latest_payment = remaining_payments[0]
            if sub:
                sub.plan_id = latest_payment.plan_id
                sub.current_period_end = latest_payment.period_end
                if latest_payment.period_end > now:
                    sub.status = 'active'
                else:
                    sub.status = 'expired'
                sub.updated_at = now
                plan = SubscriptionPlan.query.get(latest_payment.plan_id)
                if plan:
                    QuotaService.change_plan(cid, plan.slug)
        else:
            # No confirmed payments remain
            if sub:
                sub.status = 'expired'
                sub.updated_at = now

        audit = AuditLog(
            company_id=cid,
            user_id=uuid.UUID(str(reversed_by_user_id)),
            action='billing.manual_payment_reversed',
            entity_type='manual_payment',
            entity_id=payment.id,
            new_value={
                'reversal_reason': payment.reversal_reason,
                'reversed_at': now.isoformat(),
                'new_subscription_status': sub.status if sub else 'expired'
            }
        )
        db.session.add(audit)
        db.session.commit()

        logger.info("Reversed manual payment %s for company %s. Reason: %s", payment.id, cid, reason)
        return payment

    @staticmethod
    def get_payment_history(company_id=None, status=None, payment_method=None, page=1, per_page=50):
        """Query payment history with tenant scoping and status filtering."""
        query = ManualPayment.query

        if company_id:
            query = query.filter_by(company_id=uuid.UUID(str(company_id)))
        if status:
            query = query.filter_by(status=status)
        if payment_method:
            query = query.filter_by(payment_method=payment_method.upper())

        query = query.order_by(ManualPayment.created_at.desc())
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        return {
            'items': [p.to_dict() for p in paginated.items],
            'total': paginated.total,
            'page': paginated.page,
            'pages': paginated.pages,
            'per_page': paginated.per_page
        }

    @staticmethod
    def expire_outdated_subscriptions():
        """Worker task to transition active subscriptions past current_period_end to 'expired'."""
        now = datetime.utcnow()
        expired_subs = CompanySubscription.query.filter(
            CompanySubscription.status == 'active',
            CompanySubscription.current_period_end < now
        ).all()

        count = 0
        for sub in expired_subs:
            sub.status = 'expired'
            sub.updated_at = now
            audit = AuditLog(
                company_id=sub.company_id,
                action='billing.subscription_expired',
                entity_type='subscription',
                entity_id=sub.id,
                new_value={'expired_at': now.isoformat()}
            )
            db.session.add(audit)
            count += 1

        if count > 0:
            db.session.commit()
            logger.info("Subscription Expiration Worker: Expired %d overdue subscriptions", count)
        return count
