import uuid
from datetime import datetime
from app import db


class ManualPayment(db.Model):
    __tablename__ = 'manual_payments'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    plan_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('subscription_plans.id'), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(10), default='INR', nullable=False)
    # CASH, UPI, BANK_TRANSFER, PHONE_CALL, FACE_TO_FACE, OTHER
    payment_method = db.Column(db.String(30), nullable=False)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    period_start = db.Column(db.DateTime, nullable=False)
    period_end = db.Column(db.DateTime, nullable=False)
    billing_period_months = db.Column(db.Integer, default=1, nullable=False)
    # CONFIRMED, REVERSED, VOID
    status = db.Column(db.String(20), default='CONFIRMED', nullable=False, index=True)
    reference_number = db.Column(db.String(100), unique=True, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    recorded_by_user_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    reversal_reason = db.Column(db.Text, nullable=True)
    reversed_at = db.Column(db.DateTime, nullable=True)
    reversed_by_user_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = db.relationship('Company', backref=db.backref('manual_payments', lazy='dynamic'))
    plan = db.relationship('SubscriptionPlan')
    recorded_by = db.relationship('User', foreign_keys=[recorded_by_user_id])
    reversed_by = db.relationship('User', foreign_keys=[reversed_by_user_id])

    def to_dict(self):
        return {
            'id': str(self.id),
            'company_id': str(self.company_id),
            'company_name': self.company.name if self.company else None,
            'plan_id': str(self.plan_id),
            'plan_name': self.plan.name if self.plan else None,
            'plan_slug': self.plan.slug if self.plan else None,
            'amount': float(self.amount),
            'currency': self.currency,
            'payment_method': self.payment_method,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'billing_period_months': self.billing_period_months,
            'status': self.status,
            'reference_number': self.reference_number,
            'notes': self.notes,
            'recorded_by_user_id': str(self.recorded_by_user_id),
            'recorded_by_name': self.recorded_by.name if self.recorded_by else None,
            'reversal_reason': self.reversal_reason,
            'reversed_at': self.reversed_at.isoformat() if self.reversed_at else None,
            'reversed_by_user_id': str(self.reversed_by_user_id) if self.reversed_by_user_id else None,
            'reversed_by_name': self.reversed_by.name if self.reversed_by else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
