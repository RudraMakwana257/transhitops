from flask import Blueprint, request, jsonify, g
from app import db
from app.models.fuel_log import FuelLog
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.middleware import require_roles, require_company, require_feature
from app.utils.response import success_response, error_response
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
    
    query = FuelLog.query.filter_by(company_id=g.company_id, deleted_at=None)
    
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if driver_id:
        query = query.filter_by(driver_id=driver_id)
        
    query = query.order_by(desc(FuelLog.date))
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return success_response(data={
        "items": [log.to_dict() for log in pagination.items],
        "total": pagination.total,
        "page": page,
        "page_size": page_size,
        "total_pages": pagination.pages
    })

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
@require_company
@require_feature('fuel')
def get_log(id):
    log = FuelLog.query.filter_by(id=id, company_id=g.company_id, deleted_at=None).first_or_404()
    return success_response(data=log.to_dict())

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
    
    liters = float(data['liters'])
    price_per_liter = float(data['price_per_liter'])
    total_cost = data.get('total_cost') or data.get('cost') or (liters * price_per_liter)
    odometer_reading = data.get('odometer_reading') or data.get('odometer_km')
    fuel_station = data.get('fuel_station') or data.get('vendor')
    
    log = FuelLog(
        company_id=g.company_id,
        vehicle_id=data['vehicle_id'],
        driver_id=data.get('driver_id'),
        trip_id=data.get('trip_id'),
        date=data['date'],
        liters=liters,
        price_per_liter=price_per_liter,
        total_cost=total_cost,
        odometer_reading=odometer_reading,
        fuel_station=fuel_station,
        created_by=g.user.id
    )
    
    # Update vehicle odometer if this is higher than current
    if odometer_reading:
        if not vehicle.odometer_km or float(odometer_reading) > float(vehicle.odometer_km):
            vehicle.odometer_km = odometer_reading
            
    db.session.add(log)
    db.session.commit()
    
    return success_response(
        data=log.to_dict(),
        message="Fuel log created successfully",
        status_code=201
    )

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager')
@require_company
@require_feature('fuel')
def update_log(id):
    log = FuelLog.query.filter_by(id=id, company_id=g.company_id, deleted_at=None).first_or_404()
    data = request.get_json() or {}
    
    if 'vehicle_id' in data and data['vehicle_id'] != str(log.vehicle_id):
        Vehicle.query.filter_by(id=data['vehicle_id'], company_id=g.company_id).first_or_404()
    if 'driver_id' in data and data['driver_id'] and data['driver_id'] != str(log.driver_id):
        Driver.query.filter_by(id=data['driver_id'], company_id=g.company_id).first_or_404()
            
    if 'cost' in data or 'total_cost' in data:
        log.total_cost = data.get('total_cost') or data.get('cost')
    if 'odometer_km' in data or 'odometer_reading' in data:
        log.odometer_reading = data.get('odometer_reading') or data.get('odometer_km')
    if 'vendor' in data or 'fuel_station' in data:
        log.fuel_station = data.get('fuel_station') or data.get('vendor')
        
    for field in ['vehicle_id', 'driver_id', 'trip_id', 'date', 'liters', 'price_per_liter']:
        if field in data and data[field] is not None:
            setattr(log, field, data[field])
            
    if log.odometer_reading:
        vehicle = Vehicle.query.filter_by(id=log.vehicle_id, company_id=g.company_id).first()
        if vehicle and (not vehicle.odometer_km or float(log.odometer_reading) > float(vehicle.odometer_km)):
            vehicle.odometer_km = log.odometer_reading
            
    db.session.commit()
    
    return success_response(
        data=log.to_dict(),
        message="Fuel log updated successfully"
    )

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
@require_company
@require_feature('fuel')
def delete_log(id):
    log = FuelLog.query.filter_by(id=id, company_id=g.company_id, deleted_at=None).first_or_404()
    db.session.delete(log)
    db.session.commit()
    
    return success_response(
        message="Fuel log deleted successfully"
    )