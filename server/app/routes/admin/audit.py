import os
import uuid
from datetime import datetime
from flask import request, jsonify
from sqlalchemy import func, text
from app import db
from app.models.company import Company
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.maintenance_log import MaintenanceLog
from app.models.fuel_log import FuelLog
from app.models.expense import Expense
from app.models.audit_log import AuditLog
from app.models.login_attempt import LoginAttempt
from app.models.operational_exception import OperationalException
from app.models.subscription_plan import SubscriptionPlan
from app.models.company_subscription import CompanySubscription
from app.middleware.rbac import require_roles

from . import bp

@bp.route('/audit-logs', methods=['GET'])
@require_roles('super_admin')
def list_audit_logs():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 50, type=int)
    company_id = request.args.get('company_id')
    action = request.args.get('action')
    entity_type = request.args.get('entity_type')

    query = AuditLog.query

    if company_id:
        try:
            cid = uuid.UUID(company_id)
            query = query.filter(AuditLog.company_id == cid)
        except ValueError:
            pass

    if action:
        query = query.filter(AuditLog.action.ilike(f'%{action}%'))

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    pagination = query.order_by(AuditLog.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    logs_data = []
    for log in pagination.items:
        l_dict = log.to_dict()
        if log.company_id:
            c = Company.query.get(log.company_id)
            l_dict['company_name'] = c.name if c else 'Unknown'
        else:
            l_dict['company_name'] = 'Platform'
        if log.user_id:
            u = User.query.get(log.user_id)
            l_dict['user_email'] = u.email if u else None
            l_dict['user_name'] = u.name if u else None
        logs_data.append(l_dict)

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

@bp.route('/login-attempts', methods=['GET'])
@require_roles('super_admin')
def list_login_attempts():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 50, type=int)
    email = request.args.get('email')

    query = LoginAttempt.query

    if email:
        query = query.filter(LoginAttempt.email.ilike(f'%{email}%'))

    pagination = query.order_by(LoginAttempt.attempted_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    return jsonify({
        "success": True,
        "data": {
            "items": [a.to_dict() for a in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/exceptions', methods=['GET'])
@require_roles('super_admin')
def list_exceptions():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 50, type=int)
    company_id = request.args.get('company_id')

    query = OperationalException.query

    if company_id:
        try:
            cid = uuid.UUID(company_id)
            query = query.filter(OperationalException.company_id == cid)
        except ValueError:
            pass

    pagination = query.order_by(OperationalException.detected_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    return jsonify({
        "success": True,
        "data": {
            "items": [e.to_dict() for e in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/system/database-stats', methods=['GET'])
@require_roles('super_admin')
def get_database_stats():
    """
    Returns platform-wide database entity counts, table summaries, and runtime status.
    """
    tables = {
        "companies": Company.query.count(),
        "users": User.query.count(),
        "vehicles": Vehicle.query.count(),
        "drivers": Driver.query.count(),
        "trips": Trip.query.count(),
        "maintenance_logs": MaintenanceLog.query.count(),
        "fuel_logs": FuelLog.query.count(),
        "expenses": Expense.query.count(),
        "plans": SubscriptionPlan.query.count(),
        "subscriptions": CompanySubscription.query.count(),
        "audit_logs": AuditLog.query.count(),
        "login_attempts": LoginAttempt.query.count(),
        "operational_exceptions": OperationalException.query.count(),
    }

    active_counts = {
        "active_companies": Company.query.filter_by(is_active=True, deleted_at=None).count(),
        "active_users": User.query.filter_by(is_active=True).count(),
        "active_vehicles": Vehicle.query.filter_by(is_active=True).count(),
        "active_drivers": Driver.query.filter_by(is_active=True).count(),
        "active_trips": Trip.query.filter(Trip.status.in_(['Dispatched', 'In Transit', 'Active', 'Dispatched'])).count(),
    }

    return jsonify({
        "success": True,
        "data": {
            "tables": tables,
            "active_metrics": active_counts,
            "server_time": datetime.utcnow().isoformat(),
            "database_engine": "PostgreSQL",
            "status": "Healthy"
        }
    })
