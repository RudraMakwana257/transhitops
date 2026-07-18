import uuid
from datetime import datetime
from app import db


class Company(db.Model):
    __tablename__ = 'companies'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(150), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    domain = db.Column(db.String(150), unique=True)
    logo_url = db.Column(db.String(500))
    address = db.Column(db.Text)
    gst_number = db.Column(db.String(50))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(150))
    timezone = db.Column(db.String(50))
    language = db.Column(db.String(20))
    currency = db.Column(db.String(10))
    is_active = db.Column(db.Boolean, default=True)
    trial_ends_at = db.Column(db.DateTime)
    vehicle_limit = db.Column(db.Integer, default=0)
    driver_limit = db.Column(db.Integer, default=0)
    user_limit = db.Column(db.Integer, default=0)
    storage_used = db.Column(db.Numeric(14, 2), default=0)
    settings = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime)

    users = db.relationship('User', backref='company', lazy='dynamic')
    vehicles = db.relationship('Vehicle', backref='company', lazy='dynamic')
    drivers = db.relationship('Driver', backref='company', lazy='dynamic')
    trips = db.relationship('Trip', backref='company', lazy='dynamic')
    trip_events = db.relationship('TripEvent', backref='company', lazy='dynamic')
    maintenance_logs = db.relationship('MaintenanceLog', backref='company', lazy='dynamic')
    fuel_logs = db.relationship('FuelLog', backref='company', lazy='dynamic')
    expenses = db.relationship('Expense', backref='company', lazy='dynamic')
    vehicle_health_records = db.relationship('VehicleHealth', backref='company', lazy='dynamic')
    notifications = db.relationship('Notification', backref='company', lazy='dynamic')
    audit_logs = db.relationship('AuditLog', backref='company', lazy='dynamic')

    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'slug': self.slug,
            'domain': self.domain,
            'logo_url': self.logo_url,
            'address': self.address,
            'gst_number': self.gst_number,
            'phone': self.phone,
            'email': self.email,
            'timezone': self.timezone,
            'language': self.language,
            'currency': self.currency,
            'is_active': self.is_active,
            'trial_ends_at': self.trial_ends_at.isoformat() if self.trial_ends_at else None,
            'vehicle_limit': self.vehicle_limit,
            'driver_limit': self.driver_limit,
            'user_limit': self.user_limit,
            'storage_used': float(self.storage_used) if self.storage_used is not None else 0,
            'settings': self.settings,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
