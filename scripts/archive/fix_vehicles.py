import sys

content = """from flask import Blueprint, request, jsonify, g
from app import db
from app.models.vehicle import Vehicle
from app.middleware import require_roles, require_company, require_feature
from sqlalchemy import or_, desc
import uuid

from app.schemas import (
    VehicleSchema,
    CreateVehicleSchema,
    UpdateVehicleSchema,
    validate_request,
)

bp = Blueprint('vehicles', __name__, url_prefix='/api/vehicles')

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('vehicles')
def list_vehicles():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status')
    type = request.args.get('type')
    region = request.args.get('region')
    sort_by = request.args.get('sort_by', 'name')
    sort_order = request.args.get('sort_order', 'asc')
    
    query = Vehicle.query.filter_by(company_id=g.company_id, is_active=True)
    
    if search:
        query = query.filter(or_(
            Vehicle.reg_number.ilike(f'%{search}%'),
            Vehicle.name.ilike(f'%{search}%')
        ))
    if status:
        query = query.filter_by(status=status)
    if type:
        query = query.filter_by(type=type)
    if region:
        query = query.filter_by(region=region)
    
    if sort_order == 'desc':
        query = query.order_by(desc(getattr(Vehicle, sort_by)))
    else:
        query = query.order_by(getattr(Vehicle, sort_by))
    
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "success": True,
        "data": {
            "items": [v.to_dict() for v in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('vehicles')
def get_vehicle(id):
    vehicle = Vehicle.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    return jsonify({"success": True, "data": vehicle.to_dict()})

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('vehicles')
def create_vehicle():
    data = validate_request(CreateVehicleSchema)
    
    if Vehicle.query.filter_by(company_id=g.company_id, reg_number=data['reg_number']).first():
        return jsonify({"success": False, "message": "Registration number already exists"}), 400
        
    vehicle = Vehicle(
        company_id=g.company_id,
        reg_number=data['reg_number'],
        name=data['name'],
        type=data['type'],
        make=data.get('make'),
        model=data.get('model'),
        year=data.get('year'),
        capacity_kg=data.get('capacity_kg'),
        acquisition_cost=data.get('acquisition_cost'),
        odometer_km=data.get('odometer_km', 0),
        purchase_date=data.get('purchase_date'),
        status=data.get('status', 'Available'),
        region=data.get('region'),
        is_active=True
    )
    
    db.session.add(vehicle)
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "data": vehicle.to_dict(),
        "message": "Vehicle created successfully"
    }), 201

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('vehicles')
def update_vehicle(id):
    vehicle = Vehicle.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = validate_request(UpdateVehicleSchema)
    
    if 'reg_number' in data and data['reg_number'] != vehicle.reg_number:
        if Vehicle.query.filter_by(company_id=g.company_id, reg_number=data['reg_number']).first():
            return jsonify({"success": False, "message": "Registration number already exists"}), 400
            
    for field in ['reg_number', 'name', 'type', 'make', 'model', 'year', 'capacity_kg', 
                  'acquisition_cost', 'odometer_km', 'purchase_date', 'status', 'region', 'is_active']:
        if field in data:
            setattr(vehicle, field, data[field])
            
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "data": vehicle.to_dict(),
        "message": "Vehicle updated successfully"
    })

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
@require_company
@require_feature('vehicles')
def delete_vehicle(id):
    vehicle = Vehicle.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    vehicle.is_active = False
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "message": "Vehicle deactivated successfully"
    })
"""
with open("/home/zayron/Main/Hackathon/transitops/server/app/routes/vehicles.py", "w") as f:
    f.write(content)

