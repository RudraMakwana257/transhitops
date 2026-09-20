import uuid
from datetime import datetime
from app import db

class Shipment(db.Model):
    __tablename__ = 'shipments'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('companies.id'), index=True, nullable=False)
    customer_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('customers.id'), index=True, nullable=False)
    tracking_number = db.Column(db.String(50), unique=True, nullable=False)
    origin = db.Column(db.String(200), nullable=False)
    destination = db.Column(db.String(200), nullable=False)
    weight_kg = db.Column(db.Numeric(10, 2), default=0)
    status = db.Column(db.String(30), default='Pending') # Pending, Assigned, In Transit, Delivered, Cancelled
    trip_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('trips.id'), index=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship('ShipmentItem', backref='shipment', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_items=False):
        data = {
            'id': str(self.id),
            'company_id': str(self.company_id),
            'customer_id': str(self.customer_id),
            'customer_name': self.customer.name if self.customer else None,
            'tracking_number': self.tracking_number,
            'origin': self.origin,
            'destination': self.destination,
            'weight_kg': float(self.weight_kg) if self.weight_kg is not None else 0,
            'status': self.status,
            'trip_id': str(self.trip_id) if self.trip_id else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_items:
            data['items'] = [item.to_dict() for item in self.items]
        return data
