from flask import Blueprint, request, g, send_file, current_app
import os
from app import db
from app.models.file_metadata import FileMetadata
from app.services.storage_service import StorageService
from app.middleware import require_roles, require_company
from app.utils.response import success_response, error_response

bp = Blueprint('attachments', __name__, url_prefix='/api/attachments')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf', 'doc', 'docx', 'csv', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@bp.route('/upload', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer')
@require_company
def upload_attachment():
    if 'file' not in request.files:
        return error_response(message="File is required in request", status_code=400)

    file = request.files['file']
    if not file or not file.filename:
        return error_response(message="No file selected", status_code=400)

    if not allowed_file(file.filename):
        return error_response(message="File type not allowed", status_code=400)

    entity_type = request.form.get('entity_type', 'general')
    entity_id = request.form.get('entity_id')

    if entity_id:
        import uuid
        eid = None
        try:
            eid = uuid.UUID(str(entity_id))
        except (ValueError, TypeError):
            eid = None
            
        if eid:
            # Verify entity exists and belongs to this tenant
            entity_valid = True
            if entity_type == 'vehicle':
                from app.models.vehicle import Vehicle
                entity_valid = Vehicle.query.filter_by(id=eid, company_id=g.company_id).first() is not None
            elif entity_type == 'driver':
                from app.models.driver import Driver
                entity_valid = Driver.query.filter_by(id=eid, company_id=g.company_id).first() is not None
            elif entity_type == 'trip':
                from app.models.trip import Trip
                entity_valid = Trip.query.filter_by(id=eid, company_id=g.company_id).first() is not None
            elif entity_type == 'maintenance':
                from app.models.maintenance_log import MaintenanceLog
                entity_valid = MaintenanceLog.query.filter_by(id=eid, company_id=g.company_id).first() is not None
            elif entity_type == 'fuel':
                from app.models.fuel_log import FuelLog
                entity_valid = FuelLog.query.filter_by(id=eid, company_id=g.company_id).first() is not None
            elif entity_type == 'expense':
                from app.models.expense import Expense
                entity_valid = Expense.query.filter_by(id=eid, company_id=g.company_id).first() is not None
                
            if not entity_valid:
                return error_response(message=f"Referenced {entity_type} entity not found for this organization", status_code=404)

    try:
        res = StorageService.upload_file(file, file.filename, folder='attachments')
    except ValueError as ve:
        return error_response(message=str(ve), status_code=400)
    
    meta = FileMetadata(
        company_id=g.company_id,
        filename=res['filename'],
        file_key=res['file_key'],
        mime_type=res['mime_type'],
        file_size=res['file_size'],
        entity_type=entity_type,
        entity_id=entity_id
    )
    db.session.add(meta)
    db.session.commit()

    return success_response(data=meta.to_dict(), message="File uploaded successfully", status_code=201)

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
def get_attachment(id):
    meta = FileMetadata.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    
    if request.args.get('download') == 'true':
        full_path = StorageService.get_file_path(meta.file_key)
        if not full_path or not os.path.exists(full_path):
            return error_response(message="File not found on storage server", status_code=404)
        from werkzeug.utils import secure_filename
        safe_name = secure_filename(meta.filename) or 'download'
        return send_file(full_path, mimetype=meta.mime_type, as_attachment=True, download_name=safe_name)

    return success_response(data=meta.to_dict())

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
@require_company
def delete_attachment(id):
    meta = FileMetadata.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    StorageService.delete_file(meta.file_key)
    db.session.delete(meta)
    db.session.commit()
    return success_response(message="Attachment deleted successfully")
