from flask import jsonify
from app import db
from app.models.company import Company
from app.models.user import User
from app.models.vehicle import Vehicle
from app.middleware.rbac import require_roles

from . import bp

@bp.route('/dashboard', methods=['GET'])
@require_roles('super_admin')
def get_dashboard_stats():
    total_companies = Company.query.filter(Company.deleted_at == None).count()
    active_companies = Company.query.filter(Company.deleted_at == None, Company.is_active == True).count()
    
    # Platform-wide users (excluding super admins maybe? We'll just count all for now)
    total_users = User.query.count()
    
    total_vehicles = Vehicle.query.count()
    
    # We could add MRR or active subscriptions if needed, 
    # but these are the basics requested.
    
    return jsonify({
        "success": True,
        "data": {
            "total_companies": total_companies,
            "active_companies": active_companies,
            "total_users": total_users,
            "total_vehicles": total_vehicles
        }
    })
