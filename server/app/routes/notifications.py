from flask import Blueprint, jsonify, request, g
from app import db
from app.models.notification import Notification
from app.middleware import require_roles, require_company

bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst', 'driver', 'super_admin')
def list_notifications():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    
    query = Notification.query.filter_by(
        user_id=g.user.id
    )
    if g.company_id:
        query = query.filter_by(company_id=g.company_id)
        
    if unread_only:
        query = query.filter_by(is_read=False)
        
    query = query.order_by(Notification.created_at.desc())
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "success": True,
        "data": {
            "items": [n.to_dict() for n in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/<id>/read', methods=['PATCH'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst', 'driver', 'super_admin')
def mark_read(id):
    from app.services.notification_service import mark_read as mark_read_service
    success = mark_read_service(id, g.user.id)
    if success:
        return jsonify({"success": True, "message": "Notification marked as read"})
    return jsonify({"success": False, "message": "Notification not found or error occurred"}), 404

@bp.route('/read-all', methods=['PATCH'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst', 'driver', 'super_admin')
def mark_all_read():
    from app.services.notification_service import mark_all_read as mark_all_read_service
    # If super_admin, company_id is None, which is fine
    count = mark_all_read_service(g.user.id, getattr(g, 'company_id', None))
    return jsonify({"success": True, "message": f"{count} notifications marked as read"})

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst', 'driver', 'super_admin')
def delete_notification(id):
    notification = Notification.query.filter_by(id=id, user_id=g.user.id).first()
    if getattr(g, 'company_id', None):
        if notification and notification.company_id != g.company_id:
            notification = None
            
    if not notification:
        return jsonify({"success": False, "message": "Notification not found"}), 404
        
    db.session.delete(notification)
    db.session.commit()
    return jsonify({"success": True, "message": "Notification deleted"})
