from flask import Blueprint, request, jsonify
from app import db
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.maintenance_log import MaintenanceLog
from app.models.fuel_log import FuelLog
from app.models.expense import Expense
from app.middleware.rbac import require_roles
from sqlalchemy import func, desc
from datetime import date, timedelta

bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@bp.route('/fuel-efficiency', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def fuel_efficiency():
    results = db.session.query(
        Vehicle.id,
        Vehicle.name,
        Vehicle.reg_number,
        func.sum(FuelLog.liters).label('total_liters'),
        func.sum(FuelLog.total_cost).label('total_cost'),
        func.count(FuelLog.id).label('fuel_entries')
    ).join(FuelLog, Vehicle.id == FuelLog.vehicle_id).group_by(Vehicle.id).all()
    
    data = []
    for r in results:
        km = db.session.query(func.sum(Trip.actual_distance_km)).filter(
            Trip.vehicle_id == r.id,
            Trip.status == 'Completed'
        ).scalar() or 0
        kmpl = float(km) / float(r.total_liters) if r.total_liters and r.total_liters > 0 else 0
        
        data.append({
            "vehicle_id": str(r.id),
            "vehicle_name": r.name,
            "reg_number": r.reg_number,
            "avg_kmpl": round(kmpl, 2),
            "total_liters": float(r.total_liters) if r.total_liters else 0,
            "total_cost": float(r.total_cost) if r.total_cost else 0,
            "total_km": float(km)
        })
    
    return jsonify({"success": True, "data": data})

@bp.route('/fleet-utilization', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def fleet_utilization():
    total = Vehicle.query.filter_by(is_active=True).count()
    on_trip = Vehicle.query.filter_by(status='On Trip', is_active=True).count()
    
    by_vehicle = db.session.query(
        Vehicle.id,
        Vehicle.name,
        func.count(Trip.id).label('trip_count')
    ).outerjoin(Trip, Vehicle.id == Trip.vehicle_id).filter(Vehicle.is_active == True).group_by(Vehicle.id).all()
    
    data = []
    for r in by_vehicle:
        data.append({
            "vehicle_id": str(r.id),
            "vehicle_name": r.name,
            "trip_count": r.trip_count
        })
    
    return jsonify({
        "success": True,
        "data": {
            "utilization_pct": round(on_trip / total * 100, 1) if total > 0 else 0,
            "on_trip_vehicles": on_trip,
            "total_active_vehicles": total,
            "by_vehicle": data
        }
    })

@bp.route('/operational-cost', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
def operational_cost():
    results = db.session.query(
        Vehicle.id,
        Vehicle.name,
        func.sum(FuelLog.total_cost).label('fuel_cost'),
        func.sum(MaintenanceLog.cost).label('maintenance_cost')
    ).outerjoin(FuelLog, Vehicle.id == FuelLog.vehicle_id)\
     .outerjoin(MaintenanceLog, Vehicle.id == MaintenanceLog.vehicle_id)\
     .filter(Vehicle.is_active == True).group_by(Vehicle.id).all()
    
    data = []
    for r in results:
        fuel = float(r.fuel_cost) if r.fuel_cost else 0
        maint = float(r.maintenance_cost) if r.maintenance_cost else 0
        data.append({
            "vehicle_id": str(r.id),
            "vehicle_name": r.name,
            "fuel_cost": fuel,
            "maintenance_cost": maint,
            "total_cost": fuel + maint
        })
    
    return jsonify({"success": True, "data": data})

@bp.route('/vehicle-roi', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
def vehicle_roi():
    results = db.session.query(
        Vehicle.id,
        Vehicle.name,
        Vehicle.acquisition_cost,
        func.sum(Trip.revenue).label('revenue'),
        func.sum(FuelLog.total_cost).label('fuel_cost'),
        func.sum(MaintenanceLog.cost).label('maintenance_cost')
    ).outerjoin(Trip, Vehicle.id == Trip.vehicle_id)\
     .outerjoin(FuelLog, Vehicle.id == FuelLog.vehicle_id)\
     .outerjoin(MaintenanceLog, Vehicle.id == MaintenanceLog.vehicle_id)\
     .filter(Vehicle.is_active == True).group_by(Vehicle.id).all()
    
    data = []
    for r in results:
        revenue = float(r.revenue) if r.revenue else 0
        fuel = float(r.fuel_cost) if r.fuel_cost else 0
        maint = float(r.maintenance_cost) if r.maintenance_cost else 0
        acquisition = float(r.acquisition_cost)
        roi = (revenue - fuel - maint) / acquisition if acquisition > 0 else 0
        
        data.append({
            "vehicle_id": str(r.id),
            "vehicle_name": r.name,
            "acquisition_cost": acquisition,
            "revenue": revenue,
            "fuel_cost": fuel,
            "maintenance_cost": maint,
            "roi": round(roi, 4)
        })
    
    return jsonify({"success": True, "data": data})

@bp.route('/driver-performance', methods=['GET'])
@require_roles('fleet_manager', 'safety_officer')
def driver_performance():
    results = db.session.query(
        Driver.id,
        Driver.name,
        Driver.safety_score,
        func.count(Trip.id).label('trips_completed'),
        func.sum(Trip.actual_distance_km).label('total_distance'),
        func.avg(Trip.actual_distance_km / Trip.fuel_consumed_l).label('avg_fuel_efficiency')
    ).outerjoin(Trip, Driver.id == Trip.driver_id).filter(Driver.is_active == True).group_by(Driver.id).all()
    
    data = []
    for r in results:
        on_time = db.session.query(func.count(Trip.id)).filter(
            Trip.driver_id == r.id,
            Trip.status == 'Completed'
        ).scalar() or 0
        
        total_trips = r.trips_completed or 0
        on_time_pct = (on_time / total_trips * 100) if total_trips > 0 else 0
        
        data.append({
            "driver_id": str(r.id),
            "driver_name": r.name,
            "trips_completed": total_trips,
            "total_distance_km": float(r.total_distance) if r.total_distance else 0,
            "avg_fuel_efficiency": round(float(r.avg_fuel_efficiency), 2) if r.avg_fuel_efficiency else 0,
            "safety_score": float(r.safety_score),
            "on_time_pct": round(on_time_pct, 1)
        })
    
    return jsonify({"success": True, "data": data})