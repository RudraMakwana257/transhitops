from flask import Blueprint, request, jsonify, g
from app import db
from app.models.maintenance_log import MaintenanceLog
from app.models.vehicle import Vehicle
from app.middleware import require_roles, require_company, require_feature
from sqlalchemy import desc
from datetime import datetime
from app.services.notification_service import create_notification
import uuid

from app.schemas import (
    MaintenanceSchema,
    CreateMaintenanceSchema,
    validate_request,
)

bp = Blueprint('maintenance', __name__, url_prefix='/api/maintenance')

from app.middleware.rate_limiter import limiter, GENERAL_LIMIT
@bp.before_request
@limiter.limit(GENERAL_LIMIT)
def general_limit():
    pass

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('maintenance')
def list_logs():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    vehicle_id = request.args.get('vehicle_id')
    status = request.args.get('status')
    service_type = request.args.get('service_type')
    
    query = MaintenanceLog.query.filter_by(company_id=g.company_id)
    
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if status:
        query = query.filter_by(status=status)
    if service_type:
        query = query.filter_by(service_type=service_type)
        
    query = query.order_by(desc(MaintenanceLog.scheduled_date))
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
@require_roles('fleet_manager', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('maintenance')
def get_log(id):
    log = MaintenanceLog.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    return jsonify({"success": True, "data": log.to_dict()})

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'safety_officer')
@require_company
@require_feature('maintenance')
def create_log():
    data = validate_request(CreateMaintenanceSchema)
    
    # Ensure vehicle belongs to company
    vehicle = Vehicle.query.filter_by(id=data['vehicle_id'], company_id=g.company_id).first_or_404()
    
    log = MaintenanceLog(
        company_id=g.company_id,
        vehicle_id=vehicle.id,
        type=data['type'],
        description=data.get('description'),
        scheduled_date=data.get('scheduled_date'),
        technician=data.get('technician'),
        cost=data.get('cost'),
        status=data.get('status', 'Open'),
        odometer_at_service=data.get('odometer_at_service'),
        created_by=g.user.id
    )
    
    # If immediately in progress, update vehicle status
    if log.status == 'In Progress':
        vehicle.status = 'In Shop'
        
    db.session.add(log)
    db.session.commit()
    
    create_notification(
        company_id=g.company_id,
        user_id=g.user.id,
        title="Maintenance Logged",
        message=f"{vehicle.name} scheduled for {log.type} maintenance",
        notification_type='info',
        entity_type='maintenance',
        entity_id=str(log.id)
    )
    
    return jsonify({
        "success": True, 
        "data": log.to_dict(),
        "message": "Maintenance log created successfully"
    }), 201

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager', 'safety_officer')
@require_company
@require_feature('maintenance')
def update_log(id):
    log = MaintenanceLog.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = request.get_json() or {}
    
    old_status = log.status
    
    for field in ['type', 'description', 'scheduled_date', 'completed_date', 
                  'technician', 'cost', 'status', 'odometer_at_service']:
        if field in data and data[field] is not None:
            setattr(log, field, data[field])
            
    # Handle vehicle status sync based on maintenance status changes
    if 'status' in data and data['status'] != old_status:
        vehicle = Vehicle.query.filter_by(id=log.vehicle_id, company_id=g.company_id).first()
        if vehicle:
            if data['status'] == 'In Progress':
                vehicle.status = 'In Shop'
            elif data['status'] == 'Completed' and old_status == 'In Progress':
                # Only set to available if it's currently in shop
                if vehicle.status == 'In Shop':
                    vehicle.status = 'Available'
                # If completed_date wasn't explicitly provided, set it now
                if not log.completed_date:
                    log.completed_date = datetime.utcnow().date()
                    
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "data": log.to_dict(),
        "message": "Maintenance log updated successfully"
    })

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
@require_company
@require_feature('maintenance')
def delete_log(id):
    log = MaintenanceLog.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    
    if log.status == 'Completed':
        return jsonify({"success": False, "message": "Cannot delete completed maintenance records"}), 400
        
    db.session.delete(log)
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "message": "Maintenance log deleted successfully"
    })