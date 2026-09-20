import uuid
from datetime import datetime
from flask import request, jsonify
from app import db
from app.models.company import Company
from app.models.expense import Expense
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.middleware.rbac import require_roles

from . import bp

@bp.route('/expenses', methods=['GET'])
@require_roles('super_admin')
def list_all_expenses():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '').strip()
    company_id = request.args.get('company_id')
    e_type = request.args.get('type')

    query = Expense.query

    if search:
        query = query.filter(Expense.description.ilike(f'%{search}%'))

    if company_id:
        try:
            cid = uuid.UUID(company_id)
            query = query.filter(Expense.company_id == cid)
        except ValueError:
            pass

    if e_type:
        query = query.filter(Expense.type == e_type)

    pagination = query.order_by(Expense.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    expenses_data = []
    for e in pagination.items:
        e_dict = e.to_dict()
        e_dict['company_id'] = str(e.company_id) if e.company_id else None
        if e.company_id:
            c = Company.query.get(e.company_id)
            e_dict['company_name'] = c.name if c else 'Unknown'
        else:
            e_dict['company_name'] = 'Platform'

        if e.vehicle:
            e_dict['vehicle_name'] = f"{e.vehicle.name} ({e.vehicle.reg_number})"
        if e.trip:
            e_dict['trip_number'] = e.trip.trip_number

        expenses_data.append(e_dict)

    return jsonify({
        "success": True,
        "data": {
            "items": expenses_data,
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/expenses', methods=['POST'])
@require_roles('super_admin')
def create_expense():
    payload = request.get_json() or {}
    company_id = payload.get('company_id')
    vehicle_id = payload.get('vehicle_id')
    trip_id = payload.get('trip_id')
    e_type = payload.get('type', 'Toll')
    amount = payload.get('amount', 0)
    description = payload.get('description', '')
    e_date = payload.get('date', datetime.utcnow().strftime('%Y-%m-%d'))

    if not company_id or not e_type or amount is None:
        return jsonify({"success": False, "message": "company_id, type, and amount are required"}), 400

    try:
        cid = uuid.UUID(company_id)
        vid = uuid.UUID(vehicle_id) if vehicle_id else None
        tid = uuid.UUID(trip_id) if trip_id else None
    except ValueError:
        return jsonify({"success": False, "message": "Invalid UUID format"}), 400

    expense = Expense(
        company_id=cid,
        vehicle_id=vid,
        trip_id=tid,
        type=e_type,
        amount=amount,
        description=description,
        date=e_date
    )
    db.session.add(expense)
    db.session.commit()

    e_dict = expense.to_dict()
    e_dict['company_id'] = str(expense.company_id)
    return jsonify({
        "success": True,
        "data": e_dict,
        "message": "Expense record created successfully"
    }), 201

@bp.route('/expenses/<uuid:expense_id>', methods=['GET'])
@require_roles('super_admin')
def get_expense(expense_id):
    expense = Expense.query.get_or_404(expense_id)
    e_dict = expense.to_dict()
    e_dict['company_id'] = str(expense.company_id) if expense.company_id else None
    if expense.company_id:
        c = Company.query.get(expense.company_id)
        e_dict['company_name'] = c.name if c else 'Unknown'
    return jsonify({"success": True, "data": e_dict})

@bp.route('/expenses/<uuid:expense_id>', methods=['PUT'])
@require_roles('super_admin')
def update_expense(expense_id):
    expense = Expense.query.get_or_404(expense_id)
    payload = request.get_json() or {}

    for field in ['type', 'amount', 'description', 'date']:
        if field in payload and payload[field] is not None:
            setattr(expense, field, payload[field])

    db.session.commit()
    e_dict = expense.to_dict()
    e_dict['company_id'] = str(expense.company_id) if expense.company_id else None
    return jsonify({"success": True, "data": e_dict, "message": "Expense updated successfully"})

@bp.route('/expenses/<uuid:expense_id>', methods=['DELETE'])
@require_roles('super_admin')
def delete_expense(expense_id):
    expense = Expense.query.get_or_404(expense_id)
    db.session.delete(expense)
    db.session.commit()
    return jsonify({"success": True, "message": "Expense deleted successfully"})
