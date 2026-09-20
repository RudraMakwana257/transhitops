import uuid
from flask import request, jsonify, g
from app import db
from app.models.user import User
from app.models.company import Company
from app.models.audit_log import AuditLog
from app.middleware.rbac import require_roles
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt

from . import bp

@bp.route('/impersonate', methods=['POST'])
@require_roles('super_admin')
def impersonate_user():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    company_id = data.get('company_id')
    
    target_user = None
    if user_id:
        target_user = User.query.get(user_id)
    elif company_id:
        # Find the primary manager / user of this company
        target_user = User.query.filter_by(company_id=company_id, is_active=True).first()
        if not target_user:
            target_user = User.query.filter_by(company_id=company_id).first()
            
    if not target_user:
        return jsonify({"success": False, "message": "Target user or company user not found"}), 404
        
    company = Company.query.get(target_user.company_id) if target_user.company_id else None
    
    super_admin_id = getattr(g, 'user_id', None) or 'super_admin'
    
    # Generate an impersonation access token with special claims
    access_token = create_access_token(
        identity=str(target_user.id),
        additional_claims={
            'role': target_user.role,
            'name': target_user.name,
            'company_id': str(target_user.company_id) if target_user.company_id else None,
            'is_impersonating': True,
            'impersonator_id': str(super_admin_id)
        }
    )
    
    # Audit log
    current_uid = None
    if getattr(g, 'user_id', None):
        try:
            current_uid = uuid.UUID(str(g.user_id))
        except (ValueError, TypeError):
            current_uid = None

    audit = AuditLog(
        user_id=current_uid,
        company_id=target_user.company_id,
        action="IMPERSONATION_STARTED",
        entity_type="User",
        entity_id=target_user.id,
        ip_address=request.remote_addr,
        new_value={
            "target_user_email": target_user.email,
            "target_user_name": target_user.name,
            "company_name": company.name if company else "N/A"
        }
    )
    db.session.add(audit)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": f"Successfully impersonating {target_user.name}",
        "data": {
            "access_token": access_token,
            "user": target_user.to_dict(),
            "company": company.to_dict() if company else None,
            "is_impersonating": True
        }
    })

@bp.route('/stop-impersonation', methods=['POST'])
@jwt_required()
def stop_impersonation():
    claims = get_jwt()
    if not claims.get('is_impersonating'):
        return jsonify({"success": False, "message": "Not in an impersonation session"}), 400
        
    impersonator_id = claims.get('impersonator_id')
    current_user_id = get_jwt_identity()

    imp_uid = None
    if impersonator_id and impersonator_id != 'super_admin':
        try:
            imp_uid = uuid.UUID(str(impersonator_id))
        except (ValueError, TypeError):
            imp_uid = None

    cur_uid = None
    if current_user_id:
        try:
            cur_uid = uuid.UUID(str(current_user_id))
        except (ValueError, TypeError):
            cur_uid = None
    
    audit = AuditLog(
        user_id=imp_uid,
        action="IMPERSONATION_ENDED",
        entity_type="User",
        entity_id=cur_uid,
        ip_address=request.remote_addr,
        new_value={"restored_to": str(impersonator_id)}
    )
    db.session.add(audit)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Impersonation session ended successfully"
    })
