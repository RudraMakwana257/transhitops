import uuid
from datetime import datetime
from app import db


class SubscriptionPlan(db.Model):
    __tablename__ = 'subscription_plans'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    price_monthly = db.Column(db.Numeric(10, 2), default=0)
    price_yearly = db.Column(db.Numeric(10, 2), default=0)
    # features: {"ai_chat": true, "analytics": true, "gps": false, ...}
    features = db.Column(db.JSON, default=dict)
    # limits: {"vehicle_limit": 10, "driver_limit": 20, "user_limit": 5, "storage_gb": 10, "ai_calls_per_month": 500}
    limits = db.Column(db.JSON, default=dict)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subscriptions = db.relationship('CompanySubscription', backref='plan', lazy='dynamic')

    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'slug': self.slug,
            'price_monthly': float(self.price_monthly) if self.price_monthly else 0,
            'price_yearly': float(self.price_yearly) if self.price_yearly else 0,
            'features': self.features or {},
            'limits': self.limits or {},
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
