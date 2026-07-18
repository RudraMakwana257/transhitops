from flask import Blueprint, request, jsonify, g
from app import db
from app.models.fuel_log import FuelLog
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.middleware import require_roles, require_company, require_feature
from sqlalchemy import desc
import uuid

from app.schemas import (
    FuelLogSchema,
    CreateFuelLogSchema,
    validate_request,
)

bp = Blueprint('fuel', __name__, url_prefix='/api/fuel')

from app.middleware.rate_limiter import limiter, GENERAL_LIMIT
@bp.before_request
@limiter.limit(GENERAL_LIMIT)
def general_limit():
    pass

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
@require_company
@require_feature('fuel')
def list_logs():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    vehicle_id = request.args.get('vehicle_id')
    driver_id = request.args.get('driver_id')
    
    query = FuelLog.query.filter_by(company_id=g.company_id)
    
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if driver_id:
        query = query.filter_by(driver_id=driver_id)
        
    query = query.order_by(desc(FuelLog.date))
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "success": True,
        "data": {
            "items": [log.to_dict() for log in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
@require_company
@require_feature('fuel')
def get_log(id):
    log = FuelLog.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    return jsonify({"success": True, "data": log.to_dict()})

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('fuel')
def create_log():
    data = validate_request(CreateFuelLogSchema)
    
    # Ensure vehicle and driver belong to company
    vehicle = Vehicle.query.filter_by(id=data['vehicle_id'], company_id=g.company_id).first_or_404()
    if 'driver_id' in data and data['driver_id']:
        driver = Driver.query.filter_by(id=data['driver_id'], company_id=g.company_id).first_or_404()
    
    log = FuelLog(
        company_id=g.company_id,
        vehicle_id=data['vehicle_id'],
        driver_id=data.get('driver_id'),
        date=data['date'],
        liters=data['liters'],
        cost=data['cost'],
        odometer_km=data.get('odometer_km'),
        vendor=data.get('vendor'),
        notes=data.get('notes'),
        created_by=g.user.id
    )
    
    # Update vehicle odometer if this is higher than current
    if log.odometer_km:
        if not vehicle.odometer_km or log.odometer_km > vehicle.odometer_km:
            vehicle.odometer_km = log.odometer_km
            
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "data": log.to_dict(),
        "message": "Fuel log created successfully"
    }), 201

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager')
@require_company
@require_feature('fuel')
def update_log(id):
    log = FuelLog.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = request.get_json() or {}
    
    if 'vehicle_id' in data and data['vehicle_id'] != log.vehicle_id:
        Vehicle.query.filter_by(id=data['vehicle_id'], company_id=g.company_id).first_or_404()
    if 'driver_id' in data and data['driver_id'] and data['driver_id'] != log.driver_id:
        Driver.query.filter_by(id=data['driver_id'], company_id=g.company_id).first_or_404()
            
    for field in ['vehicle_id', 'driver_id', 'date', 'liters', 'cost', 'odometer_km', 'vendor', 'notes']:
        if field in data and data[field] is not None:
            setattr(log, field, data[field])
            
    if 'odometer_km' in data and data['odometer_km']:
        vehicle = Vehicle.query.filter_by(id=log.vehicle_id, company_id=g.company_id).first()
        if vehicle and (not vehicle.odometer_km or data['odometer_km'] > vehicle.odometer_km):
            vehicle.odometer_km = data['odometer_km']
            
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "data": log.to_dict(),
        "message": "Fuel log updated successfully"
    })

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
@require_company
@require_feature('fuel')
def delete_log(id):
    log = FuelLog.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    db.session.delete(log)
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "message": "Fuel log deleted successfully"
    })