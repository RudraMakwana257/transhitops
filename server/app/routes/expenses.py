from flask import Blueprint, request, jsonify
from app import db
from app.models.expense import Expense
from app.models.vehicle import Vehicle
from app.middleware.rbac import require_roles
from sqlalchemy import desc, func
from datetime import date

bp = Blueprint('expenses', __name__, url_prefix='/api/expenses')

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
def list_expenses():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    type_filter = request.args.get('type')
    vehicle_id = request.args.get('vehicle_id')
    from_date = request.args.get('from_date')
    to_date = request.args.get('to_date')
    
    query = Expense.query
    
    if type_filter:
        query = query.filter_by(type=type_filter)
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if from_date:
        query = query.filter(Expense.date >= from_date)
    if to_date:
        query = query.filter(Expense.date <= to_date)
    
    query = query.order_by(desc(Expense.date))
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "success": True,
        "data": {
            "items": [e.to_dict() for e in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
def create_expense():
    data = request.get_json()
    
    if float(data['amount']) <= 0:
        return jsonify({"success": False, "message": "Amount must be greater than zero"}), 400
    
    expense = Expense(
        vehicle_id=data.get('vehicle_id'),
        trip_id=data.get('trip_id'),
        type=data['type'],
        amount=data['amount'],
        description=data.get('description'),
        date=data['date']
    )
    
    db.session.add(expense)
    db.session.commit()
    
    return jsonify({"success": True, "data": expense.to_dict(), "message": "Expense added"}), 201

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
def get_expense(id):
    expense = Expense.query.get_or_404(id)
    return jsonify({"success": True, "data": expense.to_dict()})

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager', 'dispatcher')
def update_expense(id):
    expense = Expense.query.get_or_404(id)
    data = request.get_json()
    
    for field in ['vehicle_id', 'trip_id', 'type', 'amount', 'description', 'date']:
        if field in data:
            setattr(expense, field, data[field])
    
    db.session.commit()
    return jsonify({"success": True, "data": expense.to_dict(), "message": "Expense updated"})

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
def delete_expense(id):
    expense = Expense.query.get_or_404(id)
    db.session.delete(expense)
    db.session.commit()
    return jsonify({"success": True, "message": "Expense deleted"})

@bp.route('/summary', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
def expense_summary():
    vehicle_id = request.args.get('vehicle_id')
    from_date = request.args.get('from_date')
    to_date = request.args.get('to_date')
    
    query = Expense.query
    
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if from_date:
        query = query.filter(Expense.date >= from_date)
    if to_date:
        query = query.filter(Expense.date <= to_date)
    
    total = query.with_entities(func.sum(Expense.amount)).scalar() or 0
    
    by_type = db.session.query(Expense.type, func.sum(Expense.amount)).filter(
        Expense.vehicle_id == vehicle_id if vehicle_id else True
    ).group_by(Expense.type).all()
    
    return jsonify({
        "success": True,
        "data": {
            "total": float(total),
            "by_type": [{"type": t, "amount": float(a)} for t, a in by_type]
        }
    })