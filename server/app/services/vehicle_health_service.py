from datetime import date, timedelta
from sqlalchemy import func
from app import db
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.fuel_log import FuelLog
from app.models.maintenance_log import MaintenanceLog
from app.models.vehicle_health import VehicleHealth
from datetime import datetime

def recalculate_health_score(company_id, vehicle_id):
    vehicle = Vehicle.query.filter_by(id=vehicle_id, company_id=company_id).first()
    if not vehicle:
        return
    
    fuel_score = calculate_fuel_efficiency_score(company_id, vehicle)
    maintenance_score = calculate_maintenance_score(company_id, vehicle)
    utilization_score = calculate_utilization_score(company_id, vehicle)
    age_score = calculate_age_score(vehicle)
    cost_score = calculate_cost_score(company_id, vehicle)
    
    final_score = (
        fuel_score * 0.30 +
        maintenance_score * 0.25 +
        utilization_score * 0.20 +
        age_score * 0.15 +
        cost_score * 0.10
    )
    
    health = VehicleHealth.query.filter_by(vehicle_id=vehicle_id, company_id=company_id).first()
    if not health:
        health = VehicleHealth(vehicle_id=vehicle_id, company_id=company_id)
        db.session.add(health)
    
    health.health_score = round(final_score, 1)
    health.fuel_efficiency_score = fuel_score
    health.maintenance_score = maintenance_score
    health.utilization_score = utilization_score
    health.age_score = age_score
    health.cost_score = cost_score
    health.last_calculated = datetime.utcnow()
    
    db.session.commit()

def calculate_fuel_efficiency_score(company_id, vehicle):
    thirty_days_ago = date.today() - timedelta(days=30)
    
    vehicle_fuel = db.session.query(func.sum(FuelLog.liters)).filter(
        FuelLog.company_id == company_id,
        FuelLog.vehicle_id == vehicle.id,
        FuelLog.date >= thirty_days_ago
    ).scalar() or 0
    
    vehicle_distance = db.session.query(func.sum(Trip.actual_distance_km)).filter(
        Trip.company_id == company_id,
        Trip.vehicle_id == vehicle.id,
        Trip.status == 'Completed',
        Trip.completed_at >= thirty_days_ago
    ).scalar() or 0
    
    vehicle_avg = float(vehicle_distance) / float(vehicle_fuel) if vehicle_fuel > 0 else 0
    
    fleet_fuel = db.session.query(func.sum(FuelLog.liters)).filter(
        FuelLog.company_id == company_id,
        FuelLog.date >= thirty_days_ago
    ).scalar() or 0
    
    fleet_distance = db.session.query(func.sum(Trip.actual_distance_km)).filter(
        Trip.company_id == company_id,
        Trip.status == 'Completed',
        Trip.completed_at >= thirty_days_ago
    ).scalar() or 0
    
    fleet_avg = float(fleet_distance) / float(fleet_fuel) if fleet_fuel > 0 else 1
    
    if fleet_avg == 0:
        return 100
    
    score = min(100, (vehicle_avg / fleet_avg) * 100)
    return round(score, 1)

def calculate_maintenance_score(company_id, vehicle):
    one_year_ago = date.today() - timedelta(days=365)
    
    maint_count = MaintenanceLog.query.filter(
        MaintenanceLog.company_id == company_id,
        MaintenanceLog.vehicle_id == vehicle.id,
        MaintenanceLog.scheduled_date >= one_year_ago
    ).count()
    
    if maint_count == 0:
        return 100
    elif maint_count <= 2:
        return 80
    elif maint_count <= 4:
        return 60
    elif maint_count <= 6:
        return 40
    else:
        return 20

def calculate_utilization_score(company_id, vehicle):
    thirty_days_ago = date.today() - timedelta(days=30)
    
    trips_on_trip = Trip.query.filter(
        Trip.company_id == company_id,
        Trip.vehicle_id == vehicle.id,
        Trip.status == 'Dispatched',
        Trip.dispatched_at >= thirty_days_ago
    ).count()
    
    completed_trips = Trip.query.filter(
        Trip.company_id == company_id,
        Trip.vehicle_id == vehicle.id,
        Trip.status == 'Completed',
        Trip.completed_at >= thirty_days_ago
    ).count()
    
    total_active_days = trips_on_trip + completed_trips
    utilization_pct = min(100, (total_active_days / 30) * 100)
    
    return round(utilization_pct, 1)

def calculate_age_score(vehicle):
    if not vehicle.purchase_date:
        return 100
    
    age_years = (date.today() - vehicle.purchase_date).days / 365
    score = max(0, 100 - (age_years * 10))
    return round(score, 1)

def calculate_cost_score(company_id, vehicle):
    thirty_days_ago = date.today() - timedelta(days=30)
    
    # Notice: FuelLog model has `cost`, not `total_cost`
    vehicle_fuel_cost = db.session.query(func.sum(FuelLog.cost)).filter(
        FuelLog.company_id == company_id,
        FuelLog.vehicle_id == vehicle.id,
        FuelLog.date >= thirty_days_ago
    ).scalar() or 0
    
    vehicle_maint_cost = db.session.query(func.sum(MaintenanceLog.cost)).filter(
        MaintenanceLog.company_id == company_id,
        MaintenanceLog.vehicle_id == vehicle.id,
        MaintenanceLog.scheduled_date >= thirty_days_ago
    ).scalar() or 0
    
    vehicle_monthly = float(vehicle_fuel_cost) + float(vehicle_maint_cost)
    
    fleet_fuel = db.session.query(func.sum(FuelLog.cost)).filter(
        FuelLog.company_id == company_id,
        FuelLog.date >= thirty_days_ago
    ).scalar() or 0
    
    fleet_maint = db.session.query(func.sum(MaintenanceLog.cost)).filter(
        MaintenanceLog.company_id == company_id,
        MaintenanceLog.scheduled_date >= thirty_days_ago
    ).scalar() or 0
    
    fleet_monthly = float(fleet_fuel) + float(fleet_maint)
    active_count = Vehicle.query.filter_by(company_id=company_id, is_active=True).count()
    fleet_avg = fleet_monthly / active_count if active_count > 0 else 1
    
    if fleet_avg == 0:
        return 100
    
    ratio = vehicle_monthly / fleet_avg
    score = max(0, 100 - ((ratio - 1) * 100))
    return round(score, 1)
