import uuid
from datetime import datetime
from app import db

# Valid feature keys
FEATURE_KEYS = [
    'ai_chat',
    'analytics',
    'maintenance',
    'fuel',
    'expenses',
    'gps',
    'payroll',
    'inventory',
    'accounting',
    'documents',
    'public_api',
    'white_label',
    'exceptions',
]


class CompanyFeature(db.Model):
    __tablename__ = 'company_features'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    feature_key = db.Column(db.String(100), nullable=False)
    is_enabled = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('company_id', 'feature_key', name='uq_company_feature'),
    )

    def to_dict(self):
        return {
            'id': str(self.id),
            'company_id': str(self.company_id),
            'feature_key': self.feature_key,
            'is_enabled': self.is_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
