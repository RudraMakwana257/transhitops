import uuid
from datetime import datetime
from app import db

class Customer(db.Model):
    __tablename__ = 'customers'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('companies.id'), index=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150))
    phone = db.Column(db.String(30))
    address = db.Column(db.Text)
    billing_details = db.Column(db.JSON, default=dict)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    shipments = db.relationship('Shipment', backref='customer', lazy='dynamic')

    def to_dict(self):
        return {
            'id': str(self.id),
            'company_id': str(self.company_id),
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'billing_details': self.billing_details or {},
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
