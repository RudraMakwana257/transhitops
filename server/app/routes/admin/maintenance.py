import uuid
from datetime import datetime
from flask import request, jsonify
from app import db
from app.models.company import Company
from app.models.maintenance_log import MaintenanceLog
from app.models.vehicle import Vehicle
from app.middleware.rbac import require_roles

from . import bp

@bp.route('/maintenance', methods=['GET'])
@require_roles('super_admin')
def list_all_maintenance():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '').strip()
    company_id = request.args.get('company_id')
    status = request.args.get('status')
    m_type = request.args.get('type')

    query = MaintenanceLog.query

    if search:
        query = query.filter(MaintenanceLog.description.ilike(f'%{search}%'))

    if company_id:
        try:
            cid = uuid.UUID(company_id)
            query = query.filter(MaintenanceLog.company_id == cid)
        except ValueError:
            pass

    if status:
        query = query.filter(MaintenanceLog.status == status)

    if m_type:
        query = query.filter(MaintenanceLog.type == m_type)

    pagination = query.order_by(MaintenanceLog.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    logs_data = []
    for m in pagination.items:
        m_dict = m.to_dict()
        m_dict['company_id'] = str(m.company_id) if m.company_id else None
        if m.company_id:
            c = Company.query.get(m.company_id)
            m_dict['company_name'] = c.name if c else 'Unknown'
        else:
            m_dict['company_name'] = 'Platform'

        if m.vehicle:
            m_dict['vehicle_name'] = f"{m.vehicle.name} ({m.vehicle.reg_number})"

        logs_data.append(m_dict)

    return jsonify({
        "success": True,
        "data": {
            "items": logs_data,
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/maintenance', methods=['POST'])
@require_roles('super_admin')
def create_maintenance():
    payload = request.get_json() or {}
    company_id = payload.get('company_id')
    vehicle_id = payload.get('vehicle_id')
    m_type = payload.get('type', 'Scheduled Inspection')
    description = payload.get('description', '')
    status = payload.get('status', 'Open')
    cost = payload.get('cost', 0)
    technician = payload.get('technician', '')
    scheduled_date = payload.get('scheduled_date')
    completed_date = payload.get('completed_date')
    odometer_at_service = payload.get('odometer_at_service')

    if not company_id or not vehicle_id or not m_type:
        return jsonify({"success": False, "message": "company_id, vehicle_id, and type are required"}), 400

    try:
        cid = uuid.UUID(company_id)
        vid = uuid.UUID(vehicle_id)
    except ValueError:
        return jsonify({"success": False, "message": "Invalid UUID format in company or vehicle ID"}), 400

    m_log = MaintenanceLog(
        company_id=cid,
        vehicle_id=vid,
        type=m_type,
        description=description,
        status=status,
        cost=cost,
        technician=technician,
        scheduled_date=scheduled_date,
        completed_date=completed_date,
        odometer_at_service=odometer_at_service
    )
    db.session.add(m_log)
    db.session.commit()

    m_dict = m_log.to_dict()
    m_dict['company_id'] = str(m_log.company_id)
    return jsonify({
        "success": True,
        "data": m_dict,
        "message": "Maintenance log created successfully"
    }), 201

@bp.route('/maintenance/<uuid:log_id>', methods=['GET'])
@require_roles('super_admin')
def get_maintenance(log_id):
    m_log = MaintenanceLog.query.get_or_404(log_id)
    m_dict = m_log.to_dict()
    m_dict['company_id'] = str(m_log.company_id) if m_log.company_id else None
    if m_log.company_id:
        c = Company.query.get(m_log.company_id)
        m_dict['company_name'] = c.name if c else 'Unknown'
    if m_log.vehicle:
        m_dict['vehicle_name'] = f"{m_log.vehicle.name} ({m_log.vehicle.reg_number})"
    return jsonify({"success": True, "data": m_dict})

@bp.route('/maintenance/<uuid:log_id>', methods=['PUT'])
@require_roles('super_admin')
def update_maintenance(log_id):
    m_log = MaintenanceLog.query.get_or_404(log_id)
    payload = request.get_json() or {}

    for field in ['type', 'description', 'status', 'cost', 'technician', 
                  'scheduled_date', 'completed_date', 'odometer_at_service']:
        if field in payload and payload[field] is not None:
            setattr(m_log, field, payload[field])

    db.session.commit()
    m_dict = m_log.to_dict()
    m_dict['company_id'] = str(m_log.company_id) if m_log.company_id else None
    return jsonify({"success": True, "data": m_dict, "message": "Maintenance log updated successfully"})

@bp.route('/maintenance/<uuid:log_id>', methods=['DELETE'])
@require_roles('super_admin')
def delete_maintenance(log_id):
    m_log = MaintenanceLog.query.get_or_404(log_id)
    db.session.delete(m_log)
    db.session.commit()
    return jsonify({"success": True, "message": "Maintenance log deleted successfully"})
