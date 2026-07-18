import uuid
import secrets
from datetime import datetime, timedelta
from app import db


class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('reset_tokens', lazy='dynamic'))

    @classmethod
    def generate(cls, user_id, expiry_hours=1):
        """Create a new password reset token for the given user."""
        token = secrets.token_urlsafe(48)
        reset_token = cls(
            user_id=user_id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=expiry_hours)
        )
        return reset_token

    @property
    def is_valid(self):
        return self.used_at is None and self.expires_at > datetime.utcnow()

    def mark_used(self):
        self.used_at = datetime.utcnow()

    def to_dict(self):
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'token': self.token,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'used_at': self.used_at.isoformat() if self.used_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_valid': self.is_valid,
        }
