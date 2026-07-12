from flask import Blueprint, request, jsonify
from app import db
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.maintenance_log import MaintenanceLog
from app.models.fuel_log import FuelLog
from app.middleware.rbac import require_roles
from sqlalchemy import func, desc
from datetime import date, datetime, timedelta

bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@bp.route('/kpis', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def get_kpis():
    active_vehicles = Vehicle.query.filter_by(is_active=True).count()
    available_vehicles = Vehicle.query.filter_by(status='Available', is_active=True).count()
    vehicles_in_shop = Vehicle.query.filter_by(status='In Shop', is_active=True).count()
    active_trips = Trip.query.filter_by(status='Dispatched').count()
    pending_trips = Trip.query.filter_by(status='Draft').count()
    drivers_available = Driver.query.filter_by(status='Available', is_active=True).count()
    
    fleet_utilization = round((active_trips / active_vehicles * 100), 1) if active_vehicles > 0 else 0
    
    from app.models.vehicle_health import VehicleHealth
    avg_health = db.session.query(func.avg(VehicleHealth.health_score)).scalar()
    fleet_health = round(float(avg_health), 1) if avg_health else None
    
    return jsonify({
        "success": True,
        "data": {
            "active_vehicles": active_vehicles,
            "available_vehicles": available_vehicles,
            "vehicles_in_shop": vehicles_in_shop,
            "active_trips": active_trips,
            "pending_trips": pending_trips,
            "drivers_available": drivers_available,
            "fleet_utilization_pct": fleet_utilization,
            "fleet_health_score": fleet_health
        }
    })

@bp.route('/fleet-status', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def fleet_status():
    statuses = ['Available', 'On Trip', 'In Shop', 'Retired']
    data = []
    for status in statuses:
        count = Vehicle.query.filter_by(status=status, is_active=True).count()
        colors = {
            'Available': '#22C55E',
            'On Trip': '#3B82F6',
            'In Shop': '#F59E0B',
            'Retired': '#6B7280'
        }
        data.append({"status": status, "count": count, "color": colors.get(status, '#6B7280')})
    return jsonify({"success": True, "data": data})

@bp.route('/recent-trips', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def recent_trips():
    limit = request.args.get('limit', 5, type=int)
    trips = Trip.query.order_by(desc(Trip.created_at)).limit(limit).all()
    return jsonify({"success": True, "data": [t.to_dict(include_relations=True) for t in trips]})

@bp.route('/alerts', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def alerts():
    today = date.today()
    thirty_days = today + timedelta(days=30)
    
    license_expiring = Driver.query.filter(
        Driver.license_expiry <= thirty_days,
        Driver.license_expiry >= today,
        Driver.is_active == True
    ).all()
    
    license_expired = Driver.query.filter(
        Driver.license_expiry < today,
        Driver.is_active == True
    ).all()
    
    maintenance_due = MaintenanceLog.query.filter(
        MaintenanceLog.scheduled_date <= today + timedelta(days=7),
        MaintenanceLog.status.in_(['Open', 'In Progress'])
    ).all()
    
    return jsonify({
        "success": True,
        "data": {
            "license_expiring": [{
                "driver_id": str(d.id),
                "name": d.name,
                "license_number": d.license_number,
                "expiry_date": d.license_expiry.isoformat(),
                "days_remaining": (d.license_expiry - today).days,
                "status": "expiring"
            } for d in license_expiring],
            "license_expired": [{
                "driver_id": str(d.id),
                "name": d.name,
                "license_number": d.license_number,
                "expiry_date": d.license_expiry.isoformat(),
                "days_remaining": (d.license_expiry - today).days,
                "status": "expired"
            } for d in license_expired],
            "maintenance_due": [{
                "vehicle_id": str(m.vehicle_id),
                "vehicle_name": m.vehicle.name if m.vehicle else None,
                "reg_number": m.vehicle.reg_number if m.vehicle else None,
                "scheduled_date": m.scheduled_date.isoformat(),
                "type": m.type
            } for m in maintenance_due]
        }
    })

@bp.route('/fuel-trend', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
def fuel_trend():
    days = request.args.get('days', 30, type=int)
    start_date = date.today() - timedelta(days=days)
    
    results = db.session.query(
        FuelLog.date,
        func.sum(FuelLog.total_cost).label('total_cost')
    ).filter(
        FuelLog.date >= start_date
    ).group_by(FuelLog.date).order_by(FuelLog.date).all()
    
    data = [{"date": r.date.isoformat(), "total_cost": float(r.total_cost)} for r in results]
    return jsonify({"success": True, "data": data})