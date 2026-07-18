import uuid
from datetime import datetime, timedelta
from app import db
import bcrypt


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('companies.id'), index=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    # Auth hardening columns
    last_login_at = db.Column(db.DateTime, nullable=True)
    failed_login_count = db.Column(db.Integer, default=0, nullable=False)
    locked_until = db.Column(db.DateTime, nullable=True)
    onboarding_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    @property
    def is_locked(self):
        """Returns True if account is currently locked due to failed attempts."""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False

    def record_failed_login(self, max_attempts=5, lockout_minutes=15):
        """Increment failed login count and lock account if threshold exceeded."""
        self.failed_login_count = (self.failed_login_count or 0) + 1
        if self.failed_login_count >= max_attempts:
            self.locked_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)

    def record_successful_login(self):
        """Reset failed count and update last login timestamp."""
        self.failed_login_count = 0
        self.locked_until = None
        self.last_login_at = datetime.utcnow()

    def to_dict(self):
        return {
            'id': str(self.id),
            'company_id': str(self.company_id) if self.company_id else None,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'is_locked': self.is_locked,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

