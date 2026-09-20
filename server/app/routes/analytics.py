from flask import Blueprint, jsonify, request, g
from app import db
from app.models.trip import Trip
from app.models.expense import Expense
from app.models.fuel_log import FuelLog
from app.models.maintenance_log import MaintenanceLog
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.middleware import require_roles, require_company, require_feature
from app.utils.response import success_response, error_response
from sqlalchemy import func
from datetime import datetime, timedelta

bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

from app.middleware.rate_limiter import limiter, GENERAL_LIMIT
@bp.before_request
@limiter.limit(GENERAL_LIMIT)
def general_limit():
    pass

@bp.route('/revenue', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
@require_feature('analytics')
def get_revenue_analytics():
    period = request.args.get('period', 'monthly')
    today = datetime.utcnow().date()
    labels = []
    revenue = []
    costs = []
    
    company_filter = {"company_id": g.company_id}
    
    for i in range(5, -1, -1):
        month_date = today.replace(day=1) - timedelta(days=i*30)
        labels.append(month_date.strftime('%b %Y'))
        
        m_start = month_date.replace(day=1)
        if m_start.month == 12:
            m_end = m_start.replace(year=m_start.year+1, month=1, day=1) - timedelta(days=1)
        else:
            m_end = m_start.replace(month=m_start.month+1, day=1) - timedelta(days=1)
            
        rev = db.session.query(func.coalesce(func.sum(Trip.revenue), 0)).filter(
            Trip.company_id == g.company_id, Trip.status == 'Completed',
            Trip.created_at >= m_start, Trip.created_at <= m_end
        ).scalar() or 0.0
        
        f_cost = db.session.query(func.coalesce(func.sum(FuelLog.total_cost), 0)).filter(
            FuelLog.company_id == g.company_id, FuelLog.date >= m_start, FuelLog.date <= m_end, FuelLog.deleted_at == None
        ).scalar() or 0.0
        
        m_cost = db.session.query(func.coalesce(func.sum(MaintenanceLog.cost), 0)).filter(
            MaintenanceLog.company_id == g.company_id, MaintenanceLog.scheduled_date >= m_start, MaintenanceLog.scheduled_date <= m_end
        ).scalar() or 0.0
        
        e_cost = db.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.company_id == g.company_id, Expense.date >= m_start, Expense.date <= m_end
        ).scalar() or 0.0
        
        revenue.append(float(rev))
        costs.append(float(f_cost) + float(m_cost) + float(e_cost))
    
    return success_response(data={
        "labels": labels,
        "datasets": [
            {"name": "Revenue", "data": revenue},
            {"name": "Costs", "data": costs}
        ]
    })

@bp.route('/trips', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('analytics')
def get_trip_analytics():
    company_filter = {"company_id": g.company_id}
    
    completed = Trip.query.filter_by(**company_filter, status='Completed').count()
    cancelled = Trip.query.filter_by(**company_filter, status='Cancelled').count()
    other = Trip.query.filter(
        Trip.company_id == g.company_id,
        Trip.status.notin_(['Completed', 'Cancelled'])
    ).count()
    
    return success_response(data={
        "labels": ["Completed", "Cancelled", "Active/Draft"],
        "series": [completed, cancelled, other]
    })

@bp.route('/costs', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
@require_feature('analytics')
def get_cost_breakdown():
    company_filter = {"company_id": g.company_id}
    
    expense_data = db.session.query(
        Expense.type, 
        func.sum(Expense.amount).label('total')
    ).filter_by(**company_filter).group_by(Expense.type).all()
    
    total_fuel = db.session.query(func.coalesce(func.sum(FuelLog.total_cost), 0))\
        .filter(FuelLog.company_id == g.company_id, FuelLog.deleted_at == None).scalar() or 0.0
        
    total_maint = db.session.query(func.coalesce(func.sum(MaintenanceLog.cost), 0))\
        .filter_by(**company_filter).scalar() or 0.0
        
    categories = {"Fuel": float(total_fuel), "Maintenance": float(total_maint)}
    for item in expense_data:
        cat = item[0] or "Other"
        amt = float(item[1] or 0)
        if cat in categories:
            categories[cat] += amt
        else:
            categories[cat] = amt
            
    labels = list(categories.keys())
    series = list(categories.values())
    
    if not labels or sum(series) == 0:
        labels = ["No Data"]
        series = [0]
        
    return success_response(data={
        "labels": labels,
        "series": series
    })

@bp.route('/fuel-efficiency', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('analytics')
def get_fuel_efficiency():
    vehicles = Vehicle.query.filter_by(company_id=g.company_id, is_active=True).all()
    
    trip_stats = dict(db.session.query(
        Trip.vehicle_id,
        func.coalesce(func.sum(Trip.actual_distance_km), 0)
    ).filter(
        Trip.company_id == g.company_id,
        Trip.status == 'Completed'
    ).group_by(Trip.vehicle_id).all())

    fuel_stats = dict(db.session.query(
        FuelLog.vehicle_id,
        func.coalesce(func.sum(FuelLog.liters), 0)
    ).filter(
        FuelLog.company_id == g.company_id,
        FuelLog.deleted_at == None
    ).group_by(FuelLog.vehicle_id).all())

    data = []
    for v in vehicles:
        dist = float(trip_stats.get(v.id, 0.0))
        liters = float(fuel_stats.get(v.id, 0.0))
        avg_kmpl = round(dist / liters, 2) if liters > 0 else 0.0
        data.append({
            "vehicle_id": str(v.id),
            "vehicle_name": v.name,
            "total_distance_km": dist,
            "total_fuel_liters": liters,
            "avg_kmpl": avg_kmpl
        })
    return success_response(data=data)

@bp.route('/fleet-utilization', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('analytics')
def get_fleet_utilization():
    total = Vehicle.query.filter_by(company_id=g.company_id, is_active=True).count()
    on_trip = Vehicle.query.filter_by(company_id=g.company_id, is_active=True, status='On Trip').count()
    in_shop = Vehicle.query.filter_by(company_id=g.company_id, is_active=True, status='In Shop').count()
    available = Vehicle.query.filter_by(company_id=g.company_id, is_active=True, status='Available').count()
    
    utilization_pct = round((on_trip / total * 100), 2) if total > 0 else 0.0
    return success_response(data={
        "total_active_vehicles": total,
        "on_trip_vehicles": on_trip,
        "in_shop_vehicles": in_shop,
        "available_vehicles": available,
        "utilization_pct": utilization_pct
    })

@bp.route('/operational-cost', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
@require_feature('analytics')
def get_operational_cost():
    vehicles = Vehicle.query.filter_by(company_id=g.company_id, is_active=True).all()
    
    fuel_stats = dict(db.session.query(
        FuelLog.vehicle_id,
        func.coalesce(func.sum(FuelLog.total_cost), 0)
    ).filter(
        FuelLog.company_id == g.company_id,
        FuelLog.deleted_at == None
    ).group_by(FuelLog.vehicle_id).all())

    maint_stats = dict(db.session.query(
        MaintenanceLog.vehicle_id,
        func.coalesce(func.sum(MaintenanceLog.cost), 0)
    ).filter(
        MaintenanceLog.company_id == g.company_id
    ).group_by(MaintenanceLog.vehicle_id).all())

    exp_stats = dict(db.session.query(
        Expense.vehicle_id,
        func.coalesce(func.sum(Expense.amount), 0)
    ).filter(
        Expense.company_id == g.company_id,
        Expense.vehicle_id != None
    ).group_by(Expense.vehicle_id).all())

    data = []
    for v in vehicles:
        fuel = float(fuel_stats.get(v.id, 0.0))
        maint = float(maint_stats.get(v.id, 0.0))
        exp = float(exp_stats.get(v.id, 0.0))
        total = fuel + maint + exp
        data.append({
            "vehicle_id": str(v.id),
            "vehicle_name": v.name,
            "fuel_cost": fuel,
            "maintenance_cost": maint,
            "expense_cost": exp,
            "total_cost": round(total, 2)
        })
    return success_response(data=data)

@bp.route('/vehicle-roi', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
@require_feature('analytics')
def get_vehicle_roi():
    vehicles = Vehicle.query.filter_by(company_id=g.company_id, is_active=True).all()
    
    rev_stats = dict(db.session.query(
        Trip.vehicle_id,
        func.coalesce(func.sum(Trip.revenue), 0)
    ).filter(
        Trip.company_id == g.company_id,
        Trip.status == 'Completed'
    ).group_by(Trip.vehicle_id).all())

    fuel_stats = dict(db.session.query(
        FuelLog.vehicle_id,
        func.coalesce(func.sum(FuelLog.total_cost), 0)
    ).filter(
        FuelLog.company_id == g.company_id,
        FuelLog.deleted_at == None
    ).group_by(FuelLog.vehicle_id).all())

    maint_stats = dict(db.session.query(
        MaintenanceLog.vehicle_id,
        func.coalesce(func.sum(MaintenanceLog.cost), 0)
    ).filter(
        MaintenanceLog.company_id == g.company_id
    ).group_by(MaintenanceLog.vehicle_id).all())

    exp_stats = dict(db.session.query(
        Expense.vehicle_id,
        func.coalesce(func.sum(Expense.amount), 0)
    ).filter(
        Expense.company_id == g.company_id,
        Expense.vehicle_id != None
    ).group_by(Expense.vehicle_id).all())

    data = []
    for v in vehicles:
        acq = float(v.acquisition_cost) if v.acquisition_cost else 0.0
        rev = float(rev_stats.get(v.id, 0.0))
        fuel = float(fuel_stats.get(v.id, 0.0))
        maint = float(maint_stats.get(v.id, 0.0))
        exp = float(exp_stats.get(v.id, 0.0))
        costs = fuel + maint + exp
        net_profit = rev - costs
        roi = round(net_profit / acq, 4) if acq > 0 else 0.0
        data.append({
            "vehicle_id": str(v.id),
            "vehicle_name": v.name,
            "acquisition_cost": acq,
            "revenue": rev,
            "fuel_cost": fuel,
            "maintenance_cost": maint,
            "total_cost": round(costs, 2),
            "net_profit": round(net_profit, 2),
            "roi": roi
        })
    return success_response(data=data)

@bp.route('/driver-performance', methods=['GET'])
@require_roles('fleet_manager', 'safety_officer', 'dispatcher', 'financial_analyst')
@require_company
@require_feature('analytics')
def get_driver_performance():
    drivers = Driver.query.filter_by(company_id=g.company_id, is_active=True).all()
    
    completed_stats = dict(db.session.query(
        Trip.driver_id,
        func.count(Trip.id)
    ).filter(
        Trip.company_id == g.company_id,
        Trip.status == 'Completed'
    ).group_by(Trip.driver_id).all())

    total_trip_stats = dict(db.session.query(
        Trip.driver_id,
        func.count(Trip.id)
    ).filter(
        Trip.company_id == g.company_id,
        Trip.status.in_(['Completed', 'Cancelled'])
    ).group_by(Trip.driver_id).all())

    dist_stats = dict(db.session.query(
        Trip.driver_id,
        func.coalesce(func.sum(Trip.actual_distance_km), 0)
    ).filter(
        Trip.company_id == g.company_id,
        Trip.status == 'Completed'
    ).group_by(Trip.driver_id).all())

    fuel_stats = dict(db.session.query(
        FuelLog.driver_id,
        func.coalesce(func.sum(FuelLog.liters), 0)
    ).filter(
        FuelLog.company_id == g.company_id,
        FuelLog.deleted_at == None,
        FuelLog.driver_id != None
    ).group_by(FuelLog.driver_id).all())

    data = []
    for d in drivers:
        completed_count = completed_stats.get(d.id, 0)
        total_trips = total_trip_stats.get(d.id, 0)
        total_dist = float(dist_stats.get(d.id, 0.0))
        total_fuel = float(fuel_stats.get(d.id, 0.0))
        avg_kmpl = round(total_dist / total_fuel, 2) if total_fuel > 0 else 0.0
        on_time_pct = round((completed_count / total_trips * 100), 1) if total_trips > 0 else 100.0
        data.append({
            "driver_id": str(d.id),
            "driver_name": d.name,
            "trips_completed": completed_count,
            "total_distance_km": total_dist,
            "avg_fuel_efficiency": avg_kmpl,
            "safety_score": float(d.safety_score) if d.safety_score else 100.0,
            "on_time_pct": on_time_pct
        })
    return success_response(data=data)