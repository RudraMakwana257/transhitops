from flask import Blueprint, request, jsonify
from app import db
from app.models.maintenance_log import MaintenanceLog
from app.models.vehicle import Vehicle
from app.middleware.rbac import require_roles
from sqlalchemy import or_, desc
from datetime import date

bp = Blueprint('maintenance', __name__, url_prefix='/api/maintenance')

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def list_maintenance():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    status = request.args.get('status')
    vehicle_id = request.args.get('vehicle_id')
    
    query = MaintenanceLog.query
    
    if status:
        query = query.filter_by(status=status)
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    
    query = query.order_by(desc(MaintenanceLog.scheduled_date))
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "success": True,
        "data": {
            "items": [m.to_dict() for m in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('', methods=['POST'])
@require_roles('fleet_manager')
def create_maintenance():
    data = request.get_json()
    
    vehicle = Vehicle.query.get(data['vehicle_id'])
    if not vehicle:
        return jsonify({"success": False, "message": "Vehicle not found"}), 404
    
    maintenance = MaintenanceLog(
        vehicle_id=vehicle.id,
        type=data['type'],
        description=data.get('description'),
        cost=data.get('cost', 0),
        technician=data.get('technician'),
        scheduled_date=data['scheduled_date'],
        odometer_at_service=data.get('odometer_at_service')
    )
    
    vehicle.status = 'In Shop'
    
    db.session.add(maintenance)
    db.session.commit()
    
    return jsonify({"success": True, "data": maintenance.to_dict(), "message": f"Maintenance created. Vehicle {vehicle.name} is now In Shop"}), 201

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def get_maintenance(id):
    maintenance = MaintenanceLog.query.get_or_404(id)
    return jsonify({"success": True, "data": maintenance.to_dict()})

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager')
def update_maintenance(id):
    maintenance = MaintenanceLog.query.get_or_404(id)
    data = request.get_json()
    
    for field in ['type', 'description', 'cost', 'technician', 'scheduled_date', 'odometer_at_service']:
        if field in data:
            setattr(maintenance, field, data[field])
    
    db.session.commit()
    return jsonify({"success": True, "data": maintenance.to_dict(), "message": "Maintenance updated"})

@bp.route('/<id>/complete', methods=['PUT'])
@require_roles('fleet_manager')
def complete_maintenance(id):
    maintenance = MaintenanceLog.query.get_or_404(id)
    data = request.get_json()
    
    maintenance.status = 'Completed'
    maintenance.completed_date = data.get('completed_date', date.today().isoformat())
    maintenance.cost = data.get('cost', maintenance.cost)
    maintenance.description = data.get('description', maintenance.description)
    
    vehicle = maintenance.vehicle
    if vehicle.status != 'Retired':
        vehicle.status = 'Available'
    
    from app.services.health_score_service import recalculate_health_score
    recalculate_health_score(vehicle.id)
    
    db.session.commit()
    
    return jsonify({"success": True, "data": maintenance.to_dict(), "message": f"Maintenance completed. Vehicle {vehicle.name} is now Available"})