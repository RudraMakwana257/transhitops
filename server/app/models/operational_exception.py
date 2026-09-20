import uuid
from datetime import datetime
from app import db

class OperationalException(db.Model):
    __tablename__ = 'operational_exceptions'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('companies.id'), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False)  # DRIVER_LICENSE_EXPIRED, DRIVER_LICENSE_EXPIRING, MAINTENANCE_OVERDUE, VEHICLE_AT_RISK, VEHICLE_HEALTH_DROP
    severity = db.Column(db.String(20), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    status = db.Column(db.String(20), nullable=False, default='ACTIVE')  # ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)  # driver, vehicle, maintenance, trip
    entity_id = db.Column(db.UUID(as_uuid=True), nullable=False)
    detected_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    due_at = db.Column(db.DateTime)
    resolved_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id'))
    resolution_note = db.Column(db.Text)
    meta_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    resolved_by_user = db.relationship('User', foreign_keys=[resolved_by])

    __table_args__ = (
        db.Index('idx_exception_tenant_status', 'company_id', 'status'),
        db.Index('idx_exception_tenant_type_entity', 'company_id', 'type', 'entity_type', 'entity_id', 'status'),
    )

    def to_dict(self, include_entity_details=False):
        data = {
            'id': str(self.id),
            'company_id': str(self.company_id),
            'type': self.type,
            'severity': self.severity,
            'status': self.status,
            'title': self.title,
            'description': self.description,
            'entity_type': self.entity_type,
            'entity_id': str(self.entity_id),
            'detected_at': self.detected_at.isoformat() if self.detected_at else None,
            'due_at': self.due_at.isoformat() if self.due_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolved_by': str(self.resolved_by) if self.resolved_by else None,
            'resolution_note': self.resolution_note,
            'meta_data': self.meta_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        return data
