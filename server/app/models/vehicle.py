import uuid
from datetime import datetime
from app import db

class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reg_number = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    capacity_kg = db.Column(db.Numeric(10, 2), nullable=False)
    acquisition_cost = db.Column(db.Numeric(12, 2), nullable=False)
    odometer_km = db.Column(db.Numeric(10, 2), default=0)
    purchase_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='Available')
    region = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    trips = db.relationship('Trip', back_populates='vehicle', lazy='dynamic')
    maintenance_logs = db.relationship('MaintenanceLog', back_populates='vehicle', lazy='dynamic')
    fuel_logs = db.relationship('FuelLog', back_populates='vehicle', lazy='dynamic')
    
    @property
    def health(self):
        return self.health_record
    
    def to_dict(self, include_relations=False):
        data = {
            'id': str(self.id),
            'reg_number': self.reg_number,
            'name': self.name,
            'type': self.type,
            'capacity_kg': float(self.capacity_kg),
            'acquisition_cost': float(self.acquisition_cost),
            'odometer_km': float(self.odometer_km),
            'purchase_date': self.purchase_date.isoformat() if self.purchase_date else None,
            'status': self.status,
            'region': self.region,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if self.health:
            data['health_score'] = float(self.health.health_score) if self.health.health_score else None
            data['health_grade'] = self.health.grade
        return data