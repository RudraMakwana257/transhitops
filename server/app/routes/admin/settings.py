from flask import request, jsonify
from app import db
from app.models.audit_log import AuditLog
from app.middleware.rbac import require_roles

from . import bp

_PLATFORM_SETTINGS = {
    "platform_name": "TransitOps Global Fleet Operations",
    "logo_url": "/logo.svg",
    "default_timezone": "Asia/Kolkata",
    "default_currency": "INR",
    "maintenance_mode": False,
    "maintenance_message": "Platform undergoing scheduled upgrade. Service will resume shortly.",
    "session_timeout_mins": 120,
    "min_password_length": 8,
    "mfa_enforced": False,  # NOT YET IMPLEMENTED — do not expose in UI
    "max_login_attempts": 5,
    "rate_limit_per_minute": 120,
    "exception_alert_webhook": "",
    "support_contact_email": "support@transitops.com"
}

@bp.route('/platform-settings', methods=['GET'])
@require_roles('super_admin')
def get_platform_settings():
    return jsonify({
        "success": True,
        "data": _PLATFORM_SETTINGS
    })

@bp.route('/platform-settings', methods=['PUT'])
@require_roles('super_admin')
def update_platform_settings():
    global _PLATFORM_SETTINGS
    data = request.get_json() or {}
    
    for k, v in data.items():
        if k in _PLATFORM_SETTINGS and k != "mfa_enforced":
            _PLATFORM_SETTINGS[k] = v
            
    audit = AuditLog(
        action="PLATFORM_SETTINGS_UPDATED",
        entity_type="PlatformConfig",
        entity_id=None,
        new_value=data
    )
    db.session.add(audit)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "data": _PLATFORM_SETTINGS,
        "message": "Platform configuration updated successfully"
    })
