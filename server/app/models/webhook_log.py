import uuid
from datetime import datetime
from app import db

class WebhookLog(db.Model):
    __tablename__ = 'webhook_logs'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = db.Column(db.String(100), unique=True, index=True)
    event_type = db.Column(db.String(100), nullable=False)
    provider = db.Column(db.String(50), default='mock')
    payload = db.Column(db.JSON, default=dict)
    status = db.Column(db.String(30), default='processed')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': str(self.id),
            'event_id': self.event_id,
            'event_type': self.event_type,
            'provider': self.provider,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
