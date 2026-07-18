import uuid
from datetime import datetime
from app import db


class LoginAttempt(db.Model):
    __tablename__ = 'login_attempts'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = db.Column(db.String(150), nullable=False, index=True)
    ip_address = db.Column(db.String(45))
    success = db.Column(db.Boolean, default=False, nullable=False)
    attempted_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.Index('idx_login_attempts_email_time', 'email', 'attempted_at'),
        db.Index('idx_login_attempts_ip_time', 'ip_address', 'attempted_at'),
    )

    def to_dict(self):
        return {
            'id': str(self.id),
            'email': self.email,
            'ip_address': self.ip_address,
            'success': self.success,
            'attempted_at': self.attempted_at.isoformat() if self.attempted_at else None,
        }
