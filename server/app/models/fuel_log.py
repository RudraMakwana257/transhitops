import uuid
from datetime import datetime
from app import db

class FuelLog(db.Model):
    __tablename__ = 'fuel_logs'
    
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('companies.id'), index=True)
    vehicle_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('vehicles.id'), nullable=False)
    driver_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('drivers.id'))
    trip_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('trips.id'))
    date = db.Column(db.Date, nullable=False)
    liters = db.Column(db.Numeric(8, 2), nullable=False)
    price_per_liter = db.Column(db.Numeric(8, 2), nullable=False)
    total_cost = db.Column(db.Numeric(12, 2))
    odometer_reading = db.Column(db.Numeric(10, 2))
    fuel_station = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    deleted_at = db.Column(db.DateTime, nullable=True)
    
    vehicle = db.relationship('Vehicle', back_populates='fuel_logs')
    driver = db.relationship('Driver', back_populates='fuel_logs')
    trip = db.relationship('Trip', back_populates='fuel_logs')
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'vehicle_id': str(self.vehicle_id),
            'vehicle': self.vehicle.to_dict() if self.vehicle else None,
            'driver_id': str(self.driver_id) if self.driver_id else None,
            'driver': self.driver.to_dict() if self.driver else None,
            'trip_id': str(self.trip_id) if self.trip_id else None,
            'date': self.date.isoformat() if self.date else None,
            'liters': float(self.liters),
            'price_per_liter': float(self.price_per_liter),
            'total_cost': float(self.total_cost) if self.total_cost else None,
            'odometer_reading': float(self.odometer_reading) if self.odometer_reading else None,
            'fuel_station': self.fuel_station,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
