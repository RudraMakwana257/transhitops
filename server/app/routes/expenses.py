from flask import Blueprint, request, jsonify, g
from app import db
from app.models.expense import Expense
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.middleware import require_roles, require_company, require_feature
from sqlalchemy import desc
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
    category = request.args.get('category')
    vehicle_id = request.args.get('vehicle_id')
    trip_id = request.args.get('trip_id')
    
    query = Expense.query.filter_by(company_id=g.company_id)
    
    if category:
        query = query.filter_by(category=category)
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if trip_id:
        query = query.filter_by(trip_id=trip_id)
        
    query = query.order_by(desc(Expense.date))
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "success": True,
        "data": {
            "items": [exp.to_dict() for exp in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
@require_feature('expenses')
def get_expense(id):
    expense = Expense.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    return jsonify({"success": True, "data": expense.to_dict()})

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
@require_feature('expenses')
def create_expense():
    data = validate_request(CreateExpenseSchema)
    
    # Ensure vehicle and trip belong to company
    if 'vehicle_id' in data and data['vehicle_id']:
        Vehicle.query.filter_by(id=data['vehicle_id'], company_id=g.company_id).first_or_404()
    if 'trip_id' in data and data['trip_id']:
        Trip.query.filter_by(id=data['trip_id'], company_id=g.company_id).first_or_404()
    
    expense = Expense(
        company_id=g.company_id,
        category=data['category'],
        amount=data['amount'],
        date=data['date'],
        description=data.get('description'),
        vehicle_id=data.get('vehicle_id'),
        trip_id=data.get('trip_id'),
        receipt_url=data.get('receipt_url'),
        created_by=g.user.id
    )
    
    db.session.add(expense)
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "data": expense.to_dict(),
        "message": "Expense created successfully"
    }), 201

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
@require_feature('expenses')
def update_expense(id):
    expense = Expense.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = request.get_json() or {}
    
    if 'vehicle_id' in data and data['vehicle_id'] and data['vehicle_id'] != expense.vehicle_id:
        Vehicle.query.filter_by(id=data['vehicle_id'], company_id=g.company_id).first_or_404()
    if 'trip_id' in data and data['trip_id'] and data['trip_id'] != expense.trip_id:
        Trip.query.filter_by(id=data['trip_id'], company_id=g.company_id).first_or_404()
            
    for field in ['category', 'amount', 'date', 'description', 'vehicle_id', 'trip_id', 'receipt_url']:
        if field in data and data[field] is not None:
            setattr(expense, field, data[field])
            
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "data": expense.to_dict(),
        "message": "Expense updated successfully"
    })

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
@require_company
@require_feature('expenses')
def delete_expense(id):
    expense = Expense.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    db.session.delete(expense)
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "message": "Expense deleted successfully"
    })