import uuid
from datetime import datetime
from app import db

class TripEvent(db.Model):
    __tablename__ = 'trip_events'
    
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('trips.id'), nullable=False)
    event_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    created_by = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    trip = db.relationship('Trip', backref=db.backref('events', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'trip_id': str(self.trip_id),
            'event_type': self.event_type,
            'description': self.description,
            'created_by': str(self.created_by) if self.created_by else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }