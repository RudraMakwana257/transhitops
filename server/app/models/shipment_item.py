import uuid
from app import db

class ShipmentItem(db.Model):
    __tablename__ = 'shipment_items'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('shipments.id'), index=True, nullable=False)
    description = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    weight_kg = db.Column(db.Numeric(10, 2), default=0)

    def to_dict(self):
        return {
            'id': str(self.id),
            'shipment_id': str(self.shipment_id),
            'description': self.description,
            'quantity': self.quantity,
            'weight_kg': float(self.weight_kg) if self.weight_kg is not None else 0
        }
