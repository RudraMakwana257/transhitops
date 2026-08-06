from flask import Blueprint, request, jsonify, g
from app import db
from app.models.expense import Expense
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.middleware import require_roles, require_company, require_feature
from app.utils.response import success_response, error_response
from sqlalchemy import desc, func
import uuid

from app.schemas import (
    ExpenseSchema,
    CreateExpenseSchema,
    validate_request,
)

bp = Blueprint('expenses', __name__, url_prefix='/api/expenses')

from app.middleware.rate_limiter import limiter, GENERAL_LIMIT
@bp.before_request
@limiter.limit(GENERAL_LIMIT)
def general_limit():
    pass

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
@require_feature('expenses')
def list_expenses():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    expense_type = request.args.get('type') or request.args.get('category')
    vehicle_id = request.args.get('vehicle_id')
    trip_id = request.args.get('trip_id')
    
    query = Expense.query.filter_by(company_id=g.company_id)
    
    if expense_type:
        query = query.filter(Expense.type == expense_type)
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if trip_id:
        query = query.filter_by(trip_id=trip_id)
        
    query = query.order_by(desc(Expense.date))
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return success_response(data={
        "items": [exp.to_dict() for exp in pagination.items],
        "total": pagination.total,
        "page": page,
        "page_size": page_size,
        "total_pages": pagination.pages
    })

@bp.route('/summary', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
@require_feature('expenses')
def expenses_summary():
    total = db.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter(Expense.company_id == g.company_id).scalar()
    return success_response(data={"total_expenses": float(total)})

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
@require_feature('expenses')
def get_expense(id):
    expense = Expense.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    return success_response(data=expense.to_dict())

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('expenses')
def create_expense():
    data = validate_request(CreateExpenseSchema)
    
    # Ensure vehicle and trip belong to company
    if 'vehicle_id' in data and data['vehicle_id']:
        Vehicle.query.filter_by(id=data['vehicle_id'], company_id=g.company_id).first_or_404()
    if 'trip_id' in data and data['trip_id']:
        Trip.query.filter_by(id=data['trip_id'], company_id=g.company_id).first_or_404()
    
    expense_type = data.get('type') or data.get('category')
    expense = Expense(
        company_id=g.company_id,
        type=expense_type,
        amount=data['amount'],
        date=data['date'],
        description=data.get('description'),
        vehicle_id=data.get('vehicle_id'),
        trip_id=data.get('trip_id'),
        created_by=g.user.id
    )
    
    db.session.add(expense)
    db.session.commit()
    
    return success_response(
        data=expense.to_dict(),
        message="Expense created successfully",
        status_code=201
    )

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('expenses')
def update_expense(id):
    expense = Expense.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = request.get_json() or {}
    
    if 'vehicle_id' in data and data['vehicle_id'] and data['vehicle_id'] != str(expense.vehicle_id):
        Vehicle.query.filter_by(id=data['vehicle_id'], company_id=g.company_id).first_or_404()
    if 'trip_id' in data and data['trip_id'] and data['trip_id'] != str(expense.trip_id):
        Trip.query.filter_by(id=data['trip_id'], company_id=g.company_id).first_or_404()
            
    if 'type' in data or 'category' in data:
        expense.type = data.get('type') or data.get('category')
    for field in ['amount', 'date', 'description', 'vehicle_id', 'trip_id']:
        if field in data and data[field] is not None:
            setattr(expense, field, data[field])
            
    db.session.commit()
    
    return success_response(
        data=expense.to_dict(),
        message="Expense updated successfully"
    )

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
@require_company
@require_feature('expenses')
def delete_expense(id):
    expense = Expense.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    db.session.delete(expense)
    db.session.commit()
    
    return success_response(
        message="Expense deleted successfully"
    )