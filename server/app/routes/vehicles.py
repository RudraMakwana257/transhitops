from flask import Blueprint, request, jsonify, g
from app import db
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.maintenance_log import MaintenanceLog
from app.models.fuel_log import FuelLog
from app.middleware import require_roles, require_company, require_feature
from app.utils.response import success_response, error_response
from sqlalchemy import or_, desc
import uuid

from app.schemas import (
    VehicleSchema,
    CreateVehicleSchema,
    UpdateVehicleSchema,
    validate_request,
)

bp = Blueprint('vehicles', __name__, url_prefix='/api/vehicles')

from app.middleware.rate_limiter import limiter, GENERAL_LIMIT
@bp.before_request
@limiter.limit(GENERAL_LIMIT)
def general_limit():
    pass

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('vehicles')
def list_vehicles():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status')
    vehicle_type = request.args.get('type')
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
    if vehicle_type:
        query = query.filter_by(type=vehicle_type)
    if region:
        query = query.filter_by(region=region)
    
    if hasattr(Vehicle, sort_by):
        if sort_order == 'desc':
            query = query.order_by(desc(getattr(Vehicle, sort_by)))
        else:
            query = query.order_by(getattr(Vehicle, sort_by))
    else:
        query = query.order_by(Vehicle.name)
    
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return success_response(data={
        "items": [v.to_dict() for v in pagination.items],
        "total": pagination.total,
        "page": page,
        "page_size": page_size,
        "total_pages": pagination.pages
    })

@bp.route('/available', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('vehicles')
def available_vehicles():
    vehicles = Vehicle.query.filter_by(company_id=g.company_id, is_active=True, status='Available').all()
    return success_response(data=[v.to_dict() for v in vehicles])

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('vehicles')
def get_vehicle(id):
    vehicle = Vehicle.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    return success_response(data=vehicle.to_dict())

@bp.route('', methods=['POST'])
@require_roles('fleet_manager')
@require_company
@require_feature('vehicles')
def create_vehicle():
    data = validate_request(CreateVehicleSchema)
    
    if Vehicle.query.filter_by(company_id=g.company_id, reg_number=data['reg_number']).first():
        return error_response(message="Registration number already exists", status_code=400)
        
    vehicle = Vehicle(
        company_id=g.company_id,
        reg_number=data['reg_number'],
        name=data['name'],
        type=data['type'],
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
    
    return success_response(
        data=vehicle.to_dict(),
        message="Vehicle created successfully",
        status_code=201
    )

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager')
@require_company
@require_feature('vehicles')
def update_vehicle(id):
    vehicle = Vehicle.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = validate_request(UpdateVehicleSchema)
    
    if 'reg_number' in data and data['reg_number'] != vehicle.reg_number:
        if Vehicle.query.filter_by(company_id=g.company_id, reg_number=data['reg_number']).first():
            return error_response(message="Registration number already exists", status_code=400)
            
    for field in ['reg_number', 'name', 'type', 'capacity_kg', 
                  'acquisition_cost', 'odometer_km', 'purchase_date', 'status', 'region', 'is_active']:
        if field in data and data[field] is not None:
            setattr(vehicle, field, data[field])
            
    db.session.commit()
    
    return success_response(
        data=vehicle.to_dict(),
        message="Vehicle updated successfully"
    )

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
@require_company
@require_feature('vehicles')
def delete_vehicle(id):
    vehicle = Vehicle.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    vehicle.is_active = False
    db.session.commit()
    
    return success_response(
        message="Vehicle deactivated successfully"
    )

@bp.route('/<id>/trips', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('vehicles')
def get_vehicle_trips(id):
    vehicle = Vehicle.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)
    
    query = Trip.query.filter_by(vehicle_id=vehicle.id, company_id=g.company_id).order_by(desc(Trip.created_at))
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return success_response(data={
        "items": [t.to_dict() for t in pagination.items],
        "total": pagination.total,
        "page": page,
        "page_size": page_size,
        "total_pages": pagination.pages
    })

@bp.route('/<id>/maintenance', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('vehicles')
def get_vehicle_maintenance(id):
    vehicle = Vehicle.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)
    
    query = MaintenanceLog.query.filter_by(vehicle_id=vehicle.id, company_id=g.company_id).order_by(desc(MaintenanceLog.scheduled_date))
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return success_response(data={
        "items": [m.to_dict() for m in pagination.items],
        "total": pagination.total,
        "page": page,
        "page_size": page_size,
        "total_pages": pagination.pages
    })

@bp.route('/<id>/fuel', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('vehicles')
def get_vehicle_fuel(id):
    vehicle = Vehicle.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)
    
    query = FuelLog.query.filter_by(vehicle_id=vehicle.id, company_id=g.company_id, deleted_at=None).order_by(desc(FuelLog.date))
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return success_response(data={
        "items": [f.to_dict() for f in pagination.items],
        "total": pagination.total,
        "page": page,
        "page_size": page_size,
        "total_pages": pagination.pages
    })
