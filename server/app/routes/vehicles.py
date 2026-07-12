from flask import Blueprint, request, jsonify
from app import db
from app.models.vehicle import Vehicle
from app.middleware.rbac import require_roles
from sqlalchemy import or_, desc
import uuid

bp = Blueprint('vehicles', __name__, url_prefix='/api/vehicles')

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def list_vehicles():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status')
    type = request.args.get('type')
    region = request.args.get('region')
    sort_by = request.args.get('sort_by', 'name')
    sort_order = request.args.get('sort_order', 'asc')
    
    query = Vehicle.query.filter_by(is_active=True)
    
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

@bp.route('', methods=['POST'])
@require_roles('fleet_manager')
def create_vehicle():
    data = request.get_json()
    
    if Vehicle.query.filter_by(reg_number=data.get('reg_number')).first():
        return jsonify({"success": False, "message": "Registration number already exists"}), 400
    
    vehicle = Vehicle(
        reg_number=data['reg_number'],
        name=data['name'],
        type=data['type'],
        capacity_kg=data['capacity_kg'],
        acquisition_cost=data['acquisition_cost'],
        odometer_km=data.get('odometer_km', 0),
        purchase_date=data.get('purchase_date'),
        region=data.get('region'),
        status=data.get('status', 'Available')
    )
    
    db.session.add(vehicle)
    db.session.commit()
    
    return jsonify({"success": True, "data": vehicle.to_dict(), "message": "Vehicle created"}), 201

@bp.route('/available', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher')
def get_available():
    vehicles = Vehicle.query.filter_by(status='Available', is_active=True).all()
    return jsonify({"success": True, "data": [v.to_dict() for v in vehicles]})

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def get_vehicle(id):
    vehicle = Vehicle.query.get_or_404(id)
    return jsonify({"success": True, "data": vehicle.to_dict(include_relations=True)})

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager')
def update_vehicle(id):
    vehicle = Vehicle.query.get_or_404(id)
    data = request.get_json()
    
    for field in ['name', 'type', 'capacity_kg', 'acquisition_cost', 'odometer_km', 'purchase_date', 'region', 'status']:
        if field in data:
            setattr(vehicle, field, data[field])
    
    db.session.commit()
    return jsonify({"success": True, "data": vehicle.to_dict(), "message": "Vehicle updated"})

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
def delete_vehicle(id):
    vehicle = Vehicle.query.get_or_404(id)
    vehicle.status = 'Retired'
    vehicle.is_active = False
    db.session.commit()
    return jsonify({"success": True, "message": "Vehicle retired"})

@bp.route('/<id>/trips', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def vehicle_trips(id):
    vehicle = Vehicle.query.get_or_404(id)
    trips = vehicle.trips.order_by(desc('created_at')).all()
    return jsonify({"success": True, "data": [t.to_dict() for t in trips]})

@bp.route('/<id>/fuel', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
def vehicle_fuel(id):
    vehicle = Vehicle.query.get_or_404(id)
    logs = vehicle.fuel_logs.order_by(desc('date')).all()
    return jsonify({"success": True, "data": [l.to_dict() for l in logs]})

@bp.route('/<id>/maintenance', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def vehicle_maintenance(id):
    vehicle = Vehicle.query.get_or_404(id)
    logs = vehicle.maintenance_logs.order_by(desc('scheduled_date')).all()
    return jsonify({"success": True, "data": [l.to_dict() for l in logs]})

@bp.route('/<id>/health', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def vehicle_health(id):
    vehicle = Vehicle.query.get_or_404(id)
    if vehicle.health:
        return jsonify({"success": True, "data": vehicle.health.to_dict()})
    return jsonify({"success": True, "data": None})