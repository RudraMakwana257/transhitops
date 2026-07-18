import uuid
from datetime import datetime
from app import db

class MaintenanceLog(db.Model):
    __tablename__ = 'maintenance_logs'
    
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('companies.id'), index=True)
    vehicle_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('vehicles.id'), nullable=False)
    type = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='Open')
    cost = db.Column(db.Numeric(12, 2), default=0)
    technician = db.Column(db.String(100))
    scheduled_date = db.Column(db.Date)
    completed_date = db.Column(db.Date)
    odometer_at_service = db.Column(db.Numeric(10, 2))
    created_by = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicle = db.relationship('Vehicle', back_populates='maintenance_logs')
    
    def to_dict(self, include_relations=False):
        data = {
            'id': str(self.id),
            'vehicle_id': str(self.vehicle_id),
            'type': self.type,
            'description': self.description,
            'status': self.status,
            'cost': float(self.cost) if self.cost else 0,
            'technician': self.technician,
            'scheduled_date': self.scheduled_date.isoformat() if self.scheduled_date else None,
            'completed_date': self.completed_date.isoformat() if self.completed_date else None,
            'odometer_at_service': float(self.odometer_at_service) if self.odometer_at_service else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_relations:
            data['vehicle'] = self.vehicle.to_dict() if self.vehicle else None
        return data
