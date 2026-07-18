from flask import Blueprint, jsonify, request, g
from app import db
from app.models.trip import Trip
from app.models.expense import Expense
from app.models.fuel_log import FuelLog
from app.middleware import require_roles, require_company, require_feature
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
    period = request.args.get('period', 'monthly') # monthly, weekly, daily
    
    # Simple placeholder logic for hackathon
    # In a real app, group by date and sum
    
    today = datetime.utcnow().date()
    labels = []
    revenue = []
    costs = []
    
    company_filter = {"company_id": g.company_id}
    
    # Generate last 6 months of data
    for i in range(5, -1, -1):
        month_date = today.replace(day=1) - timedelta(days=i*30)
        labels.append(month_date.strftime('%b %Y'))
        
        # Mock data based on real records if we wanted to
        # For now just return empty arrays that the frontend handles gracefully
        revenue.append(0)
        costs.append(0)
        
    # Get actual total expenses
    total_expenses = db.session.query(func.sum(Expense.amount))\
        .filter_by(**company_filter).scalar() or 0
        
    total_fuel_cost = db.session.query(func.sum(FuelLog.cost))\
        .filter_by(**company_filter).scalar() or 0
        
    costs[-1] = total_expenses + total_fuel_cost
    
    return jsonify({
        "success": True,
        "data": {
            "labels": labels,
            "datasets": [
                {"name": "Revenue", "data": revenue},
                {"name": "Costs", "data": costs}
            ]
        }
    })

@bp.route('/trips', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
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
    
    return jsonify({
        "success": True,
        "data": {
            "labels": ["Completed", "Cancelled", "Active/Draft"],
            "series": [completed, cancelled, other]
        }
    })

@bp.route('/costs', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
@require_feature('analytics')
def get_cost_breakdown():
    company_filter = {"company_id": g.company_id}
    
    # Get expenses by category
    expense_data = db.session.query(
        Expense.category, 
        func.sum(Expense.amount).label('total')
    ).filter_by(**company_filter).group_by(Expense.category).all()
    
    # Add fuel
    total_fuel = db.session.query(func.sum(FuelLog.cost))\
        .filter_by(**company_filter).scalar() or 0
        
    categories = {"Fuel": total_fuel}
    for item in expense_data:
        cat = item[0] or "Other"
        amt = float(item[1] or 0)
        if cat in categories:
            categories[cat] += amt
        else:
            categories[cat] = amt
            
    labels = list(categories.keys())
    series = list(categories.values())
    
    # If empty, provide placeholder for chart
    if not labels:
        labels = ["No Data"]
        series = [1]
        
    return jsonify({
        "success": True,
        "data": {
            "labels": labels,
            "series": series
        }
    })