import uuid
from datetime import datetime
from app import db

class Expense(db.Model):
    __tablename__ = 'expenses'
    
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('companies.id'), index=True)
    vehicle_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('vehicles.id'))
    trip_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('trips.id'))
    type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.Date, nullable=False)
    created_by = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    vehicle = db.relationship('Vehicle', backref='expenses')
    trip = db.relationship('Trip', backref='expenses')
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'vehicle_id': str(self.vehicle_id) if self.vehicle_id else None,
            'vehicle': self.vehicle.to_dict() if self.vehicle else None,
            'trip_id': str(self.trip_id) if self.trip_id else None,
            'type': self.type,
            'amount': float(self.amount),
            'description': self.description,
            'date': self.date.isoformat() if self.date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
