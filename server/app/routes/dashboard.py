from flask import Blueprint, jsonify, g
from app import db
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.maintenance_log import MaintenanceLog
from app.models.fuel_log import FuelLog
from app.models.expense import Expense
from app.middleware import require_roles, require_company, require_feature
from app.utils.response import success_response, error_response
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
                     
    today = datetime.utcnow().date()
    thirty_days_from_now = today + timedelta(days=30)
    expiring_licenses = Driver.query.filter(
        Driver.company_id == g.company_id,
        Driver.is_active == True,
        Driver.license_expiry <= thirty_days_from_now,
        Driver.license_expiry >= today
    ).count()
    
    expired_licenses = Driver.query.filter(
        Driver.company_id == g.company_id,
        Driver.is_active == True,
        Driver.license_expiry < today
    ).count()
    
    # 3. Trip Stats
    active_trips = Trip.query.filter(
        Trip.company_id == g.company_id,
        Trip.status.in_(['Dispatched', 'In Progress'])
    ).count()
    
    # 4. Maintenance Alerts
    pending_maintenance = MaintenanceLog.query.filter(
        MaintenanceLog.company_id == g.company_id,
        MaintenanceLog.status.in_(['Scheduled', 'In Progress', 'Open'])
    ).count()
    
    return success_response(data={
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
    })

@bp.route('/recent-activity', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('dashboard')
def get_recent_activity():
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
        
    return success_response(data=activities)

@bp.route('/kpis', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('dashboard')
def get_kpis():
    company_filter = {"company_id": g.company_id}
    total_vehicles = Vehicle.query.filter_by(**company_filter, is_active=True).count()
    active_vehicles = Vehicle.query.filter_by(**company_filter, is_active=True, status='Available').count()
    maintenance_vehicles = Vehicle.query.filter_by(**company_filter, is_active=True, status='In Shop').count()
    total_drivers = Driver.query.filter_by(**company_filter, is_active=True).count()
    active_trips = Trip.query.filter(Trip.company_id == g.company_id, Trip.status.in_(['Dispatched', 'In Progress'])).count()
    pending_trips = Trip.query.filter_by(company_id=g.company_id, status='Draft').count()
    
    avg_health = db.session.query(func.avg(Vehicle.health_score)).filter_by(**company_filter, is_active=True).scalar() if hasattr(Vehicle, 'health_score') else 95
    
    return success_response(data={
        "active_vehicles": total_vehicles,
        "available_vehicles": active_vehicles,
        "vehicles_in_shop": maintenance_vehicles,
        "fleet_health_score": round(float(avg_health), 1) if avg_health else 95,
        "active_trips": active_trips,
        "pending_trips": pending_trips,
        "drivers_available": total_drivers,
        "fleet_utilization_pct": round((active_vehicles / total_vehicles * 100), 1) if total_vehicles > 0 else 0
    })

@bp.route('/alerts', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('dashboard')
def get_alerts():
    today = datetime.utcnow().date()
    thirty_days = today + timedelta(days=30)
    
    expiring = Driver.query.filter(
        Driver.company_id == g.company_id,
        Driver.is_active == True,
        Driver.license_expiry >= today,
        Driver.license_expiry <= thirty_days
    ).all()
    
    expired = Driver.query.filter(
        Driver.company_id == g.company_id,
        Driver.is_active == True,
        Driver.license_expiry < today
    ).all()
    
    maint_due = MaintenanceLog.query.filter(
        MaintenanceLog.company_id == g.company_id,
        MaintenanceLog.status.in_(['Scheduled', 'In Progress', 'Open'])
    ).all()
    
    return success_response(data={
        "license_expiring": [
            {
                "id": str(d.id),
                "name": d.name,
                "license_number": d.license_number,
                "expiry_date": d.license_expiry.isoformat(),
                "days_left": (d.license_expiry - today).days
            } for d in expiring
        ],
        "license_expired": [
            {
                "id": str(d.id),
                "name": d.name,
                "license_number": d.license_number,
                "expiry_date": d.license_expiry.isoformat(),
                "days_overdue": (today - d.license_expiry).days
            } for d in expired
        ],
        "maintenance_due": [
            {
                "id": str(m.id),
                "vehicle_id": str(m.vehicle_id),
                "vehicle_name": m.vehicle.name if m.vehicle else "Unknown",
                "type": m.type,
                "scheduled_date": m.scheduled_date.isoformat() if m.scheduled_date else None,
                "status": m.status
            } for m in maint_due
        ]
    })

@bp.route('/fleet-status', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('dashboard')
def get_fleet_status():
    statuses = db.session.query(Vehicle.status, func.count(Vehicle.id))\
        .filter_by(company_id=g.company_id, is_active=True)\
        .group_by(Vehicle.status).all()
    
    color_map = {
        'Available': '#22C55E',
        'On Trip': '#3B82F6',
        'In Shop': '#F59E0B',
        'Reserved': '#8B5CF6',
        'Retired': '#94A3B8'
    }
    
    data = []
    for status, count in statuses:
        data.append({
            "status": status,
            "count": count,
            "color": color_map.get(status, '#6B7280')
        })
        
    return success_response(data=data)

@bp.route('/recent-trips', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('dashboard')
def dashboard_recent_trips():
    trips = Trip.query.filter_by(company_id=g.company_id).order_by(Trip.updated_at.desc()).limit(5).all()
    return success_response(data=[t.to_dict() for t in trips])

@bp.route('/fuel-trend', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
@require_company
@require_feature('dashboard')
def get_fuel_trend():
    today = datetime.utcnow().date()
    thirty_days_ago = today - timedelta(days=30)
    
    fuel_by_date = db.session.query(
        FuelLog.date,
        func.coalesce(func.sum(FuelLog.total_cost), 0).label('total_cost')
    ).filter(
        FuelLog.company_id == g.company_id,
        FuelLog.date >= thirty_days_ago,
        FuelLog.date <= today,
        FuelLog.deleted_at == None
    ).group_by(FuelLog.date).all()
    
    fuel_dict = {f.date.strftime('%Y-%m-%d'): float(f.total_cost) for f in fuel_by_date}
    
    data = [
        {
            "date": (today - timedelta(days=i)).strftime('%Y-%m-%d'),
            "total_cost": fuel_dict.get((today - timedelta(days=i)).strftime('%Y-%m-%d'), 0.0)
        }
        for i in range(30, -1, -1)
    ]
    return success_response(data=data)

@bp.route('/financial-kpis', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
@require_feature('dashboard')
def get_financial_kpis():
    first_day = datetime.utcnow().date().replace(day=1)
    
    fuel_cost = db.session.query(func.coalesce(func.sum(FuelLog.total_cost), 0)).filter(
        FuelLog.company_id == g.company_id, FuelLog.date >= first_day, FuelLog.deleted_at == None
    ).scalar() or 0.0

    maint_cost = db.session.query(func.coalesce(func.sum(MaintenanceLog.cost), 0)).filter(
        MaintenanceLog.company_id == g.company_id, MaintenanceLog.scheduled_date >= first_day
    ).scalar() or 0.0

    expense_cost = db.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.company_id == g.company_id, Expense.date >= first_day
    ).scalar() or 0.0

    total_op_cost = float(fuel_cost) + float(maint_cost) + float(expense_cost)

    top_vehicles = []
    vehicles = Vehicle.query.filter_by(company_id=g.company_id, is_active=True).all()
    for v in vehicles:
        v_fuel = db.session.query(func.coalesce(func.sum(FuelLog.total_cost), 0)).filter(FuelLog.vehicle_id == v.id, FuelLog.deleted_at == None).scalar() or 0.0
        v_maint = db.session.query(func.coalesce(func.sum(MaintenanceLog.cost), 0)).filter(MaintenanceLog.vehicle_id == v.id).scalar() or 0.0
        v_exp = db.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter(Expense.vehicle_id == v.id).scalar() or 0.0
        v_total = float(v_fuel) + float(v_maint) + float(v_exp)
        if v_total > 0:
            top_vehicles.append({
                "vehicle_id": str(v.id),
                "vehicle_name": v.name,
                "total_cost": round(v_total, 2)
            })
    top_vehicles.sort(key=lambda x: x["total_cost"], reverse=True)

    return success_response(data={
        "operational_cost": round(total_op_cost, 2),
        "fuel_cost_month": round(float(fuel_cost), 2),
        "maintenance_cost_month": round(float(maint_cost), 2),
        "cost_by_type": [
            {"type": "Fuel", "amount": round(float(fuel_cost), 2)},
            {"type": "Maintenance", "amount": round(float(maint_cost), 2)},
            {"type": "Expenses", "amount": round(float(expense_cost), 2)}
        ],
        "top_vehicles": top_vehicles[:5]
    })

@bp.route('/safety-kpis', methods=['GET'])
@require_roles('fleet_manager', 'safety_officer')
@require_company
@require_feature('dashboard')
def get_safety_kpis():
    suspended_count = Driver.query.filter_by(company_id=g.company_id, is_active=True, status='Suspended').count()
    avg_score = db.session.query(func.coalesce(func.avg(Driver.safety_score), 100.0)).filter(
        Driver.company_id == g.company_id, Driver.is_active == True
    ).scalar() or 100.0

    drivers = Driver.query.filter_by(company_id=g.company_id, is_active=True).all()
    dist = {"excellent": 0, "good": 0, "fair": 0, "poor": 0, "critical": 0}
    for d in drivers:
        s = float(d.safety_score) if d.safety_score is not None else 100.0
        if s >= 90: dist["excellent"] += 1
        elif s >= 80: dist["good"] += 1
        elif s >= 70: dist["fair"] += 1
        elif s >= 60: dist["poor"] += 1
        else: dist["critical"] += 1

    return success_response(data={
        "suspended_count": suspended_count,
        "avg_safety_score": round(float(avg_score), 1),
        "distribution": dist
    })