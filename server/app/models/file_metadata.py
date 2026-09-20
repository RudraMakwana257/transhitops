import uuid
from datetime import datetime
from app import db

class FileMetadata(db.Model):
    __tablename__ = 'file_metadata'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('companies.id'), index=True, nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_key = db.Column(db.String(500), nullable=False)
    mime_type = db.Column(db.String(100))
    file_size = db.Column(db.Integer, default=0)
    entity_type = db.Column(db.String(50), index=True) # trip, vehicle, driver, pod, maintenance
    entity_id = db.Column(db.String(100), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': str(self.id),
            'company_id': str(self.company_id),
            'filename': self.filename,
            'file_key': self.file_key,
            'mime_type': self.mime_type,
            'file_size': self.file_size,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
