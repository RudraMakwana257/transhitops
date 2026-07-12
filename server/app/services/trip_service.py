from app import db
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.trip_event import TripEvent
from app.models.fuel_log import FuelLog
from app.models.audit_log import AuditLog
from datetime import date, datetime
from sqlalchemy.exc import IntegrityError

class ValidationError(Exception):
    def __init__(self, code, message):
        self.code = code
        self.message = message

def generate_trip_number():
    today = date.today().strftime('%Y%m%d')
    count = Trip.query.filter(Trip.trip_number.like(f'TRIP-{today}-%')).count()
    return f'TRIP-{today}-{count+1:04d}'

def dispatch_trip(trip_id, user_id):
    trip = Trip.query.get(trip_id)
    if not trip:
        raise ValidationError('TRIP_NOT_FOUND', 'Trip not found')
    
    if trip.status != 'Draft':
        raise ValidationError('TRIP_INVALID_STATUS', f'Cannot dispatch trip from {trip.status} status')
    
    vehicle = trip.vehicle
    driver = trip.driver
    
    if vehicle.status != 'Available':
        raise ValidationError('VEHICLE_NOT_AVAILABLE', f'Vehicle is currently {vehicle.status}')
    
    if driver.status != 'Available':
        raise ValidationError('DRIVER_NOT_AVAILABLE', f'Driver is currently {driver.status}')
    
    if driver.license_expiry < date.today():
        raise ValidationError('DRIVER_LICENSE_EXPIRED', f"Driver's license expired on {driver.license_expiry}")
    
    if float(trip.cargo_weight_kg) > float(vehicle.capacity_kg):
        raise ValidationError('VEHICLE_OVER_CAPACITY', f'Cargo weight {trip.cargo_weight_kg}kg exceeds vehicle capacity {vehicle.capacity_kg}kg')
    
    vehicle.status = 'On Trip'
    driver.status = 'On Trip'
    trip.status = 'Dispatched'
    trip.dispatched_at = datetime.utcnow()
    trip.start_odometer = vehicle.odometer_km
    
    event = TripEvent(trip_id=trip.id, event_type='dispatched', description=f'Trip dispatched: {trip.source} to {trip.destination}', created_by=user_id)
    db.session.add(event)
    
    audit = AuditLog(user_id=user_id, action='dispatch_trip', entity_type='trip', entity_id=trip.id, new_value={'status': 'Dispatched'})
    db.session.add(audit)
    
    db.session.commit()
    return trip

def complete_trip(trip_id, end_odometer, fuel_consumed, revenue, user_id, notes=None):
    trip = Trip.query.get(trip_id)
    if not trip:
        raise ValidationError('TRIP_NOT_FOUND', 'Trip not found')
    
    if trip.status != 'Dispatched':
        raise ValidationError('TRIP_INVALID_STATUS', f'Cannot complete trip from {trip.status} status')
    
    if float(end_odometer) <= float(trip.start_odometer):
        raise ValidationError('TRIP_ODOMETER_INVALID', 'End odometer must be greater than start odometer')
    
    vehicle = trip.vehicle
    driver = trip.driver
    
    trip.status = 'Completed'
    trip.end_odometer = end_odometer
    trip.actual_distance_km = float(end_odometer) - float(trip.start_odometer)
    trip.fuel_consumed_l = fuel_consumed
    trip.revenue = revenue
    trip.notes = notes
    trip.completed_at = datetime.utcnow()
    
    vehicle.status = 'Available'
    vehicle.odometer_km = end_odometer
    driver.status = 'Available'
    
    if fuel_consumed:
        fuel_log = FuelLog(
            vehicle_id=vehicle.id,
            driver_id=driver.id,
            trip_id=trip.id,
            date=date.today(),
            liters=fuel_consumed,
            price_per_liter=0,
            odometer_reading=end_odometer,
            fuel_station='Trip completion'
        )
        db.session.add(fuel_log)
    
    event = TripEvent(trip_id=trip.id, event_type='completed', description='Trip completed', created_by=user_id)
    db.session.add(event)
    
    audit = AuditLog(user_id=user_id, action='complete_trip', entity_type='trip', entity_id=trip.id, new_value={'status': 'Completed', 'end_odometer': end_odometer})
    db.session.add(audit)
    
    recalculate_health_score(vehicle.id)
    
    db.session.commit()
    return trip

def cancel_trip(trip_id, user_id, reason=None):
    trip = Trip.query.get(trip_id)
    if not trip:
        raise ValidationError('TRIP_NOT_FOUND', 'Trip not found')
    
    if trip.status not in ['Draft', 'Dispatched']:
        raise ValidationError('TRIP_INVALID_STATUS', f'Cannot cancel trip from {trip.status} status')
    
    if trip.status == 'Dispatched':
        trip.vehicle.status = 'Available'
        trip.driver.status = 'Available'
    
    trip.status = 'Cancelled'
    trip.cancelled_at = datetime.utcnow()
    if reason:
        trip.notes = reason
    
    event = TripEvent(trip_id=trip.id, event_type='cancelled', description=reason or 'Trip cancelled', created_by=user_id)
    db.session.add(event)
    
    audit = AuditLog(user_id=user_id, action='cancel_trip', entity_type='trip', entity_id=trip.id, new_value={'status': 'Cancelled'})
    db.session.add(audit)
    
    db.session.commit()
    return trip

def recalculate_health_score(vehicle_id):
    from app.models.vehicle_health import VehicleHealth
    from app.models.maintenance_log import MaintenanceLog
    from app.models.fuel_log import FuelLog
    from app.models.trip import Trip
    from sqlalchemy import func
    
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return
    
    fleet_avg_kmpl = db.session.query(
        func.avg(FuelLog.total_cost / (FuelLog.liters * 100))
    ).scalar() or 3.0
    
    vehicle_fuel = db.session.query(
        func.sum(Trip.actual_distance_km),
        func.sum(FuelLog.liters)
    ).join(FuelLog, Trip.id == FuelLog.trip_id).filter(
        Trip.vehicle_id == vehicle_id,
        Trip.status == 'Completed'
    ).first()
    
    vehicle_kmpl = 3.0
    if vehicle_fuel and vehicle_fuel[0] and vehicle_fuel[1] and vehicle_fuel[1] > 0:
        vehicle_kmpl = float(vehicle_fuel[0]) / float(vehicle_fuel[1])
    
    fuel_score = min(100, (vehicle_kmpl / fleet_avg_kmpl * 100)) if fleet_avg_kmpl > 0 else 100
    
    maint_jobs = MaintenanceLog.query.filter(
        MaintenanceLog.vehicle_id == vehicle_id,
        MaintenanceLog.created_at >= datetime.utcnow() - timedelta(days=365)
    ).count()
    
    maint_score = {0: 100, 1: 80, 2: 80, 3: 60, 4: 60, 5: 40, 6: 40}.get(min(maint_jobs, 7), 20)
    
    trips_30 = Trip.query.filter(
        Trip.vehicle_id == vehicle_id,
        Trip.status == 'Completed',
        Trip.completed_at >= datetime.utcnow() - timedelta(days=30)
    ).count()
    util_score = min(100, trips_30 * 3.33)
    
    age_years = (date.today() - vehicle.purchase_date).days / 365 if vehicle.purchase_date else 0
    age_score = max(0, 100 - (age_years * 10))
    
    vehicle_monthly = db.session.query(func.sum(FuelLog.total_cost)).join(Trip, FuelLog.trip_id == Trip.id).filter(
        Trip.vehicle_id == vehicle_id,
        Trip.completed_at >= datetime.utcnow() - timedelta(days=30)
    ).scalar() or 0
    
    fleet_avg_monthly = db.session.query(func.sum(FuelLog.total_cost)).join(Trip, FuelLog.trip_id == Trip.id).filter(
        Trip.completed_at >= datetime.utcnow() - timedelta(days=30)
    ).scalar() or 1
    fleet_avg_monthly = fleet_avg_monthly / Vehicle.query.filter_by(is_active=True).count()
    
    cost_score = max(0, 100 - ((vehicle_monthly / fleet_avg_monthly - 1) * 100)) if fleet_avg_monthly > 0 else 100
    
    final_score = (
        fuel_score * 0.30 +
        maint_score * 0.25 +
        util_score * 0.20 +
        age_score * 0.15 +
        cost_score * 0.10
    )
    
    health = VehicleHealth.query.filter_by(vehicle_id=vehicle_id).first()
    if not health:
        health = VehicleHealth(vehicle_id=vehicle_id)
    
    health.health_score = round(final_score, 1)
    health.fuel_efficiency_score = round(fuel_score, 1)
    health.maintenance_score = round(maint_score, 1)
    health.utilization_score = round(util_score, 1)
    health.age_score = round(age_score, 1)
    health.cost_score = round(cost_score, 1)
    health.last_calculated = datetime.utcnow()
    
    db.session.add(health)
    db.session.commit()