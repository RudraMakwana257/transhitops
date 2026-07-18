from flask import Blueprint, jsonify, g
from app import db
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.maintenance_log import MaintenanceLog
from app.middleware import require_roles, require_company, require_feature
from sqlalchemy import func
from datetime import datetime, timedelta

bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

from app.middleware.rate_limiter import limiter, GENERAL_LIMIT
@bp.before_request
@limiter.limit(GENERAL_LIMIT)
def general_limit():
    pass

@bp.route('/stats', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('dashboard')
def get_dashboard_stats():
    # Base query filters
    company_filter = {"company_id": g.company_id}
    
    # 1. Vehicle Stats
    total_vehicles = Vehicle.query.filter_by(**company_filter, is_active=True).count()
    active_vehicles = Vehicle.query.filter_by(**company_filter, is_active=True, status='Available').count() + \
                      Vehicle.query.filter_by(**company_filter, is_active=True, status='On Trip').count()
    maintenance_vehicles = Vehicle.query.filter_by(**company_filter, is_active=True, status='In Shop').count()
    
    # 2. Driver Stats
    total_drivers = Driver.query.filter_by(**company_filter, is_active=True).count()
    active_drivers = Driver.query.filter_by(**company_filter, is_active=True, status='Available').count() + \
                     Driver.query.filter_by(**company_filter, is_active=True, status='On Trip').count()
                     
    # License expiry alerts (within 30 days)
    thirty_days_from_now = datetime.utcnow().date() + timedelta(days=30)
    expiring_licenses = Driver.query.filter(
        Driver.company_id == g.company_id,
        Driver.is_active == True,
        Driver.license_expiry <= thirty_days_from_now,
        Driver.license_expiry >= datetime.utcnow().date()
    ).count()
    
    expired_licenses = Driver.query.filter(
        Driver.company_id == g.company_id,
        Driver.is_active == True,
        Driver.license_expiry < datetime.utcnow().date()
    ).count()
    
    # 3. Trip Stats (Today)
    today = datetime.utcnow().date()
    active_trips = Trip.query.filter(
        Trip.company_id == g.company_id,
        Trip.status.in_(['Dispatched', 'In Progress'])
    ).count()
    
    # 4. Maintenance Alerts
    pending_maintenance = MaintenanceLog.query.filter(
        MaintenanceLog.company_id == g.company_id,
        MaintenanceLog.status.in_(['Scheduled', 'In Progress'])
    ).count()
    
    return jsonify({
        "success": True,
        "data": {
            "vehicles": {
                "total": total_vehicles,
                "active": active_vehicles,
                "in_maintenance": maintenance_vehicles,
                "utilization_rate": round((active_vehicles / total_vehicles * 100), 1) if total_vehicles > 0 else 0
            },
            "drivers": {
                "total": total_drivers,
                "active": active_drivers,
                "expiring_licenses": expiring_licenses,
                "expired_licenses": expired_licenses
            },
            "trips": {
                "active_now": active_trips
            },
            "alerts": {
                "pending_maintenance": pending_maintenance,
                "total_alerts": expiring_licenses + expired_licenses + pending_maintenance
            }
        }
    })

@bp.route('/recent-activity', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('dashboard')
def get_recent_activity():
    # Get 5 most recent trips
    recent_trips = Trip.query.filter_by(company_id=g.company_id)\
        .order_by(Trip.updated_at.desc())\
        .limit(5).all()
        
    activities = []
    
    for trip in recent_trips:
        vehicle = Vehicle.query.get(trip.vehicle_id) if trip.vehicle_id else None
        driver = Driver.query.get(trip.driver_id) if trip.driver_id else None
        
        v_name = vehicle.name if vehicle else "Unknown Vehicle"
        d_name = driver.name if driver else "Unknown Driver"
        
        if trip.status == 'Completed':
            msg = f"{d_name} completed trip to {trip.destination}"
        elif trip.status == 'Dispatched':
            msg = f"{v_name} dispatched to {trip.destination}"
        elif trip.status == 'Cancelled':
            msg = f"Trip to {trip.destination} was cancelled"
        else:
            msg = f"Trip to {trip.destination} is {trip.status}"
            
        activities.append({
            "id": f"trip-{trip.id}",
            "type": "trip",
            "message": msg,
            "timestamp": trip.updated_at.isoformat(),
            "status": trip.status
        })
        
    # Could also add recent maintenance logs here and sort by timestamp
        
    return jsonify({
        "success": True,
        "data": activities
    })