import uuid
from datetime import datetime
from app import db

class Trip(db.Model):
    __tablename__ = 'trips'
    
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('companies.id'), index=True)
    trip_number = db.Column(db.String(20), unique=True, nullable=False)
    vehicle_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('vehicles.id'), nullable=False)
    driver_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('drivers.id'), nullable=False)
    source = db.Column(db.String(200), nullable=False)
    destination = db.Column(db.String(200), nullable=False)
    cargo_weight_kg = db.Column(db.Numeric(10, 2), nullable=False)
    planned_distance_km = db.Column(db.Numeric(10, 2))
    actual_distance_km = db.Column(db.Numeric(10, 2))
    status = db.Column(db.String(20), default='Draft')
    start_odometer = db.Column(db.Numeric(10, 2))
    end_odometer = db.Column(db.Numeric(10, 2))
    fuel_consumed_l = db.Column(db.Numeric(10, 2))
    revenue = db.Column(db.Numeric(12, 2), default=0)
    notes = db.Column(db.Text)
    dispatched_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    cancelled_at = db.Column(db.DateTime)
    created_by = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicle = db.relationship('Vehicle', back_populates='trips')
    driver = db.relationship('Driver', back_populates='trips')
    fuel_logs = db.relationship('FuelLog', back_populates='trip', lazy='dynamic')
    
    def to_dict(self, include_relations=False):
        data = {
            'id': str(self.id),
            'trip_number': self.trip_number,
            'vehicle_id': str(self.vehicle_id),
            'driver_id': str(self.driver_id),
            'source': self.source,
            'destination': self.destination,
            'cargo_weight_kg': float(self.cargo_weight_kg),
            'planned_distance_km': float(self.planned_distance_km) if self.planned_distance_km else None,
            'actual_distance_km': float(self.actual_distance_km) if self.actual_distance_km else None,
            'status': self.status,
            'start_odometer': float(self.start_odometer) if self.start_odometer else None,
            'end_odometer': float(self.end_odometer) if self.end_odometer else None,
            'fuel_consumed_l': float(self.fuel_consumed_l) if self.fuel_consumed_l else None,
            'revenue': float(self.revenue) if self.revenue else 0,
            'notes': self.notes,
            'dispatched_at': self.dispatched_at.isoformat() if self.dispatched_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_relations:
            data['vehicle'] = self.vehicle.to_dict() if self.vehicle else None
            data['driver'] = self.driver.to_dict() if self.driver else None
        return data
