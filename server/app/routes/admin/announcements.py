import uuid
from datetime import datetime
from flask import request, jsonify, Blueprint
from app import db
from app.models.audit_log import AuditLog
from app.middleware.rbac import require_roles

from . import bp

# In-memory / persistent announcement store for platform broadcasts
_ANNOUNCEMENTS = [
    {
        "id": "ann-1",
        "title": "Scheduled Platform Maintenance",
        "message": "TransitOps core API and database telemetry will undergo scheduled maintenance on Sunday 02:00-03:00 IST.",
        "type": "WARNING",
        "target": "ALL",
        "target_id": None,
        "is_active": True,
        "created_at": "2026-08-15T12:00:00Z"
    },
    {
        "id": "ann-2",
        "title": "AI Copilot v2.4 Released",
        "message": "Enhanced automated dispatch optimization and driver safety telemetry scoring is now live for all Enterprise fleets.",
        "type": "INFO",
        "target": "PLAN",
        "target_id": "enterprise",
        "is_active": True,
        "created_at": "2026-08-14T09:30:00Z"
    }
]

@bp.route('/announcements', methods=['GET'])
@require_roles('super_admin')
def list_announcements():
    return jsonify({
        "success": True,
        "data": _ANNOUNCEMENTS
    })

@bp.route('/announcements', methods=['POST'])
@require_roles('super_admin')
def create_announcement():
    data = request.get_json() or {}
    title = data.get('title')
    message = data.get('message')
    
    if not title or not message:
        return jsonify({"success": False, "message": "Title and message are required"}), 400
        
    announcement = {
        "id": f"ann-{uuid.uuid4().hex[:8]}",
        "title": title,
        "message": message,
        "type": data.get('type', 'INFO'),
        "target": data.get('target', 'ALL'),
        "target_id": data.get('target_id'),
        "is_active": data.get('is_active', True),
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    _ANNOUNCEMENTS.insert(0, announcement)
    
    audit = AuditLog(
        action="ANNOUNCEMENT_PUBLISHED",
        entity_type="Announcement",
        entity_id=None,
        new_value={"id": announcement["id"], "title": title, "type": announcement["type"]}
    )
    db.session.add(audit)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "data": announcement,
        "message": "Announcement broadcasted successfully"
    }), 201

@bp.route('/announcements/<id>', methods=['DELETE'])
@require_roles('super_admin')
def delete_announcement(id):
    global _ANNOUNCEMENTS
    _ANNOUNCEMENTS = [a for a in _ANNOUNCEMENTS if a['id'] != id]
    return jsonify({"success": True, "message": "Announcement removed"})

# Public / tenant active announcements
public_ann_bp = Blueprint('public_announcements', __name__, url_prefix='/api/announcements')

@public_ann_bp.route('/active', methods=['GET'])
def get_active_announcements():
    active = [a for a in _ANNOUNCEMENTS if a.get('is_active')]
    return jsonify({
        "success": True,
        "data": active
    })
