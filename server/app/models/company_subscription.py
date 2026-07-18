import uuid
from datetime import datetime
from app import db


class CompanySubscription(db.Model):
    __tablename__ = 'company_subscriptions'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    plan_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('subscription_plans.id'), nullable=False)
    # active | trialing | canceled | past_due
    status = db.Column(db.String(20), default='trialing', nullable=False)
    current_period_start = db.Column(db.DateTime)
    current_period_end = db.Column(db.DateTime)
    trial_ends_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': str(self.id),
            'company_id': str(self.company_id),
            'plan_id': str(self.plan_id),
            'plan': self.plan.to_dict() if self.plan else None,
            'status': self.status,
            'current_period_start': self.current_period_start.isoformat() if self.current_period_start else None,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'trial_ends_at': self.trial_ends_at.isoformat() if self.trial_ends_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
