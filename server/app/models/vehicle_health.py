import uuid
from datetime import datetime
from app import db

class VehicleHealth(db.Model):
    __tablename__ = 'vehicle_health'
    
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('vehicles.id'), unique=True, nullable=False)
    health_score = db.Column(db.Numeric(5, 2), default=100.00)
    fuel_efficiency_score = db.Column(db.Numeric(5, 2))
    maintenance_score = db.Column(db.Numeric(5, 2))
    utilization_score = db.Column(db.Numeric(5, 2))
    age_score = db.Column(db.Numeric(5, 2))
    cost_score = db.Column(db.Numeric(5, 2))
    last_calculated = db.Column(db.DateTime, default=datetime.utcnow)
    
    vehicle = db.relationship('Vehicle', backref=db.backref('health_record', uselist=False))
    
    @property
    def grade(self):
        if self.health_score is None:
            return 'Unknown'
        score = float(self.health_score)
        if score >= 90: return 'Excellent'
        if score >= 75: return 'Good'
        if score >= 60: return 'Fair'
        if score >= 40: return 'Poor'
        return 'Critical'
    
    @property
    def grade_color(self):
        grades = {
            'Excellent': '#22C55E',
            'Good': '#3B82F6',
            'Fair': '#F59E0B',
            'Poor': '#FB923C',
            'Critical': '#DC2626',
            'Unknown': '#6B7280'
        }
        return grades.get(self.grade, '#6B7280')
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'vehicle_id': str(self.vehicle_id),
            'health_score': float(self.health_score) if self.health_score else None,
            'fuel_efficiency_score': float(self.fuel_efficiency_score) if self.fuel_efficiency_score else None,
            'maintenance_score': float(self.maintenance_score) if self.maintenance_score else None,
            'utilization_score': float(self.utilization_score) if self.utilization_score else None,
            'age_score': float(self.age_score) if self.age_score else None,
            'cost_score': float(self.cost_score) if self.cost_score else None,
            'grade': self.grade,
            'grade_color': self.grade_color,
            'last_calculated': self.last_calculated.isoformat() if self.last_calculated else None
        }