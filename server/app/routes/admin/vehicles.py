import uuid
from datetime import datetime, date
from flask import request, jsonify
from sqlalchemy import or_
from app import db
from app.models.company import Company
from app.models.vehicle import Vehicle
from app.models.vehicle_health import VehicleHealth
from app.middleware.rbac import require_roles

from . import bp

@bp.route('/vehicles', methods=['GET'])
@require_roles('super_admin')
def list_all_vehicles():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '').strip()
    company_id = request.args.get('company_id')
    status = request.args.get('status')
    vehicle_type = request.args.get('type')
    region = request.args.get('region')

    query = Vehicle.query

    if search:
        query = query.filter(or_(
            Vehicle.reg_number.ilike(f'%{search}%'),
            Vehicle.name.ilike(f'%{search}%')
        ))

    if company_id:
        try:
            cid = uuid.UUID(company_id)
            query = query.filter(Vehicle.company_id == cid)
        except ValueError:
            pass

    if status:
        query = query.filter(Vehicle.status == status)

    if vehicle_type:
        query = query.filter(Vehicle.type == vehicle_type)

    if region:
        query = query.filter(Vehicle.region == region)

    pagination = query.order_by(Vehicle.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    vehicles_data = []
    for v in pagination.items:
        v_dict = v.to_dict()
        v_dict['company_id'] = str(v.company_id) if v.company_id else None
        if v.company_id:
            c = Company.query.get(v.company_id)
            v_dict['company_name'] = c.name if c else 'Unknown'
        else:
            v_dict['company_name'] = 'Platform'
        vehicles_data.append(v_dict)

    return jsonify({
        "success": True,
        "data": {
            "items": vehicles_data,
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/vehicles', methods=['POST'])
@require_roles('super_admin')
def create_vehicle():
    payload = request.get_json() or {}
    company_id = payload.get('company_id')
    reg_number = payload.get('reg_number', '').strip().upper()
    name = payload.get('name', '').strip()
    v_type = payload.get('type', 'Truck')
    capacity_kg = payload.get('capacity_kg', 1000)
    acquisition_cost = payload.get('acquisition_cost', 0)
    odometer_km = payload.get('odometer_km', 0)
    purchase_date_raw = payload.get('purchase_date')
    purchase_date = None
    if purchase_date_raw:
        if isinstance(purchase_date_raw, str):
            try:
                purchase_date = datetime.fromisoformat(purchase_date_raw).date()
            except ValueError:
                try:
                    purchase_date = datetime.strptime(purchase_date_raw, '%Y-%m-%d').date()
                except ValueError:
                    purchase_date = None
        else:
            purchase_date = purchase_date_raw
    status = payload.get('status', 'Available')
    region = payload.get('region', 'HQ')

    if not company_id:
        return jsonify({"success": False, "message": "company_id is required"}), 400
    if not reg_number or not name:
        return jsonify({"success": False, "message": "reg_number and name are required"}), 400

    try:
        cid = uuid.UUID(company_id)
        comp = Company.query.get(cid)
        if not comp:
            return jsonify({"success": False, "message": "Company not found"}), 404
    except ValueError:
        return jsonify({"success": False, "message": "Invalid company_id format"}), 400

    if Vehicle.query.filter(Vehicle.reg_number == reg_number).first():
        return jsonify({"success": False, "message": f"Vehicle with reg number '{reg_number}' already exists"}), 400

    vehicle = Vehicle(
        company_id=cid,
        reg_number=reg_number,
        name=name,
        type=v_type,
        capacity_kg=capacity_kg,
        acquisition_cost=acquisition_cost,
        odometer_km=odometer_km,
        purchase_date=purchase_date,
        status=status,
        region=region,
        is_active=True
    )
    db.session.add(vehicle)
    db.session.flush()

    health = VehicleHealth(
        company_id=cid,
        vehicle_id=vehicle.id,
        health_score=100.0
    )
    db.session.add(health)
    db.session.commit()

    v_dict = vehicle.to_dict()
    v_dict['company_id'] = str(vehicle.company_id)
    v_dict['company_name'] = comp.name

    return jsonify({
        "success": True,
        "data": v_dict,
        "message": "Vehicle created successfully"
    }), 201

@bp.route('/vehicles/<uuid:vehicle_id>', methods=['GET'])
@require_roles('super_admin')
def get_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    v_dict = vehicle.to_dict()
    v_dict['company_id'] = str(vehicle.company_id) if vehicle.company_id else None
    if vehicle.company_id:
        c = Company.query.get(vehicle.company_id)
        v_dict['company_name'] = c.name if c else 'Unknown'
    return jsonify({"success": True, "data": v_dict})

@bp.route('/vehicles/<uuid:vehicle_id>', methods=['PUT'])
@require_roles('super_admin')
def update_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    payload = request.get_json() or {}

    for field in ['name', 'type', 'capacity_kg', 'acquisition_cost', 'odometer_km', 
                  'purchase_date', 'status', 'region', 'is_active']:
        if field in payload and payload[field] is not None:
            setattr(vehicle, field, payload[field])

    if 'reg_number' in payload and payload['reg_number']:
        new_reg = payload['reg_number'].strip().upper()
        existing = Vehicle.query.filter(Vehicle.reg_number == new_reg, Vehicle.id != vehicle_id).first()
        if existing:
            return jsonify({"success": False, "message": "Reg number already registered"}), 409
        vehicle.reg_number = new_reg

    if 'company_id' in payload and payload['company_id']:
        try:
            cid = uuid.UUID(payload['company_id'])
            comp = Company.query.get(cid)
            if not comp:
                return jsonify({"success": False, "message": "Company not found"}), 404
            vehicle.company_id = cid
        except ValueError:
            return jsonify({"success": False, "message": "Invalid company_id format"}), 400

    db.session.commit()
    v_dict = vehicle.to_dict()
    v_dict['company_id'] = str(vehicle.company_id) if vehicle.company_id else None
    if vehicle.company_id:
        c = Company.query.get(vehicle.company_id)
        v_dict['company_name'] = c.name if c else 'Unknown'

    return jsonify({"success": True, "data": v_dict, "message": "Vehicle updated successfully"})

@bp.route('/vehicles/<uuid:vehicle_id>', methods=['DELETE'])
@require_roles('super_admin')
def delete_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({"success": True, "message": "Vehicle deleted successfully"})
