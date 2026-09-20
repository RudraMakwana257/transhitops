from flask import jsonify
from app import db
from app.models.company import Company
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.operational_exception import OperationalException
from app.models.company_subscription import CompanySubscription
from app.models.audit_log import AuditLog
from app.middleware.rbac import require_roles

from . import bp

@bp.route('/dashboard', methods=['GET'])
@require_roles('super_admin')
def get_dashboard_stats():
    total_companies = Company.query.filter(Company.deleted_at == None).count()
    active_companies = Company.query.filter(Company.deleted_at == None, Company.is_active == True).count()
    suspended_companies = total_companies - active_companies
    
    total_users = User.query.count()
    active_users = User.query.filter(User.is_active == True).count()
    
    total_vehicles = Vehicle.query.count()
    total_drivers = Driver.query.count()
    total_trips = Trip.query.count()
    active_trips = Trip.query.filter(Trip.status.in_(['Dispatched', 'In Transit'])).count()
    
    critical_exceptions = OperationalException.query.filter_by(severity='CRITICAL', status='ACTIVE').count()
    high_exceptions = OperationalException.query.filter_by(severity='HIGH', status='ACTIVE').count()
    total_open_exceptions = OperationalException.query.filter(OperationalException.status.in_(['ACTIVE', 'ACKNOWLEDGED'])).count()
    
    # Financial metrics
    active_subscriptions = CompanySubscription.query.filter(CompanySubscription.status == 'active').count()
    trial_subscriptions = CompanySubscription.query.filter(CompanySubscription.status == 'trialing').count()
    
    # Sum MRR from active subscriptions
    subscriptions = CompanySubscription.query.filter(CompanySubscription.status.in_(['active', 'trialing'])).all()
    mrr = sum([sub.plan.price_monthly for sub in subscriptions if hasattr(sub, 'plan') and sub.plan and getattr(sub.plan, 'price_monthly', None)])
    
    # Real health status checks
    import os
    db_status = "Healthy"
    try:
        db.session.execute(db.text("SELECT 1"))
    except Exception:
        db_status = "Degraded"
        
    redis_status = "Healthy"
    redis_url = os.environ.get('REDIS_URL')
    if redis_url:
        try:
            import redis
            r = redis.from_url(redis_url, socket_timeout=1)
            r.ping()
        except Exception:
            redis_status = "Unavailable"
    else:
        redis_status = "Local Memory"

    # Recent audit trail
    recent_logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(10).all()
    recent_activity = []
    for log in recent_logs:
        user = User.query.get(log.user_id) if log.user_id else None
        company = Company.query.get(log.company_id) if log.company_id else None
        recent_activity.append({
            "id": str(log.id),
            "action": log.action,
            "user_name": user.name if user else "System",
            "company_name": company.name if company else "Platform",
            "entity_type": log.entity_type,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    
    return jsonify({
        "success": True,
        "data": {
            "total_companies": total_companies,
            "active_companies": active_companies,
            "suspended_companies": suspended_companies,
            "total_users": total_users,
            "active_users": active_users,
            "total_vehicles": total_vehicles,
            "total_drivers": total_drivers,
            "total_trips": total_trips,
            "active_trips": active_trips,
            "critical_exceptions": critical_exceptions,
            "high_exceptions": high_exceptions,
            "total_open_exceptions": total_open_exceptions,
            "active_subscriptions": active_subscriptions,
            "trial_subscriptions": trial_subscriptions,
            "mrr": float(mrr),
            "system_health": {
                "api": "Healthy",
                "database": db_status,
                "workers": "Active",
                "redis": redis_status
            },
            "recent_activity": recent_activity
        }
    })

