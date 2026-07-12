import uuid
from datetime import datetime, date
from app import db

class Driver(db.Model):
    __tablename__ = 'drivers'
    
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), nullable=False)
    license_number = db.Column(db.String(50), unique=True, nullable=False)
    license_category = db.Column(db.String(10), nullable=False)
    license_expiry = db.Column(db.Date, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    safety_score = db.Column(db.Numeric(4, 2), default=100.00)
    status = db.Column(db.String(20), default='Available')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    trips = db.relationship('Trip', back_populates='driver', lazy='dynamic')
    fuel_logs = db.relationship('FuelLog', back_populates='driver', lazy='dynamic')
    
    @property
    def is_license_expired(self):
        return self.license_expiry < date.today()
    
    @property
    def days_until_expiry(self):
        delta = self.license_expiry - date.today()
        return delta.days
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'license_number': self.license_number,
            'license_category': self.license_category,
            'license_expiry': self.license_expiry.isoformat() if self.license_expiry else None,
            'phone': self.phone,
            'safety_score': float(self.safety_score),
            'status': self.status,
            'is_active': self.is_active,
            'is_license_expired': self.is_license_expired,
            'days_until_expiry': self.days_until_expiry,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }