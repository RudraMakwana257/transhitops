from flask import Blueprint, request, jsonify
from app import db
from app.models.fuel_log import FuelLog
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.middleware.rbac import require_roles
from sqlalchemy import or_, desc

bp = Blueprint('fuel', __name__, url_prefix='/api/fuel')

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
def list_fuel():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    vehicle_id = request.args.get('vehicle_id')
    driver_id = request.args.get('driver_id')
    from_date = request.args.get('from_date')
    to_date = request.args.get('to_date')
    
    query = FuelLog.query
    
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if driver_id:
        query = query.filter_by(driver_id=driver_id)
    if from_date:
        query = query.filter(FuelLog.date >= from_date)
    if to_date:
        query = query.filter(FuelLog.date <= to_date)
    
    query = query.order_by(desc(FuelLog.date))
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "success": True,
        "data": {
            "items": [f.to_dict() for f in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
def create_fuel():
    data = request.get_json()
    
    vehicle = Vehicle.query.get(data['vehicle_id'])
    if not vehicle:
        return jsonify({"success": False, "message": "Vehicle not found"}), 404
    
    if float(data['liters']) <= 0 or float(data['price_per_liter']) <= 0:
        return jsonify({"success": False, "message": "Liters and price must be greater than zero"}), 400
    
    liters = float(data['liters'])
    price = float(data['price_per_liter'])
    fuel = FuelLog(
        vehicle_id=vehicle.id,
        driver_id=data.get('driver_id'),
        trip_id=data.get('trip_id'),
        date=data['date'],
        liters=liters,
        price_per_liter=price,
        total_cost=liters * price,
        odometer_reading=data.get('odometer_reading'),
        fuel_station=data.get('fuel_station')
    )
    
    db.session.add(fuel)
    db.session.commit()
    
    return jsonify({"success": True, "data": fuel.to_dict(), "message": "Fuel log added"}), 201

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
def get_fuel(id):
    fuel = FuelLog.query.get_or_404(id)
    return jsonify({"success": True, "data": fuel.to_dict()})

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager', 'dispatcher')
def update_fuel(id):
    fuel = FuelLog.query.get_or_404(id)
    data = request.get_json()
    
    if 'liters' in data and float(data['liters']) <= 0:
        return jsonify({"success": False, "message": "Liters must be greater than zero"}), 400
    if 'price_per_liter' in data and float(data['price_per_liter']) <= 0:
        return jsonify({"success": False, "message": "Price must be greater than zero"}), 400
    
    for field in ['vehicle_id', 'driver_id', 'trip_id', 'date', 'liters', 'price_per_liter', 'odometer_reading', 'fuel_station']:
        if field in data:
            setattr(fuel, field, data[field])
    
    if 'liters' in data or 'price_per_liter' in data:
        fuel.total_cost = float(fuel.liters) * float(fuel.price_per_liter)
    
    db.session.commit()
    return jsonify({"success": True, "data": fuel.to_dict(), "message": "Fuel log updated"})

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
def delete_fuel(id):
    fuel = FuelLog.query.get_or_404(id)
    db.session.delete(fuel)
    db.session.commit()
    return jsonify({"success": True, "message": "Fuel log deleted"})