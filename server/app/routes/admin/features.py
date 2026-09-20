from flask import request, jsonify
from app import db
from app.models.company import Company
from app.models.company_feature import CompanyFeature, FEATURE_KEYS
from app.middleware.rbac import require_roles

from . import bp

@bp.route('/companies/<id>/features', methods=['GET'])
@require_roles('super_admin')
def get_company_features(id):
    company = Company.query.get_or_404(id)
    features = CompanyFeature.query.filter_by(company_id=company.id).all()
    
    # Return as a dictionary of feature_key: is_enabled
    data = {f.feature_key: f.is_enabled for f in features}
    return jsonify({"success": True, "data": data})

@bp.route('/companies/<id>/features', methods=['PUT'])
@require_roles('super_admin')
def update_company_features(id):
    company = Company.query.get_or_404(id)
    
    data = request.get_json() or {}
    features_data = data.get('features', {})
    
    if not isinstance(features_data, dict):
        return jsonify({"success": False, "message": "features must be an object"}), 400
        
    for key, enabled in features_data.items():
        if key not in FEATURE_KEYS:
            # We allow custom keys like 'vehicles', 'drivers' seeded earlier, 
            # so we'll just accept any key provided or strictly enforce FEATURE_KEYS.
            # To be safe and support our seeds, we'll allow it.
            pass
            
        feature = CompanyFeature.query.filter_by(company_id=company.id, feature_key=key).first()
        if feature:
            feature.is_enabled = bool(enabled)
        else:
            feature = CompanyFeature(
                company_id=company.id,
                feature_key=key,
                is_enabled=bool(enabled)
            )
            db.session.add(feature)
            
    db.session.commit()
    
    updated_features = CompanyFeature.query.filter_by(company_id=company.id).all()
    return jsonify({
        "success": True,
        "message": "Company features updated successfully",
        "data": {f.feature_key: f.is_enabled for f in updated_features}
    })
    
# Global Feature Flag catalog with rollout targets
_GLOBAL_FEATURE_FLAGS = {
    "exception_engine": {
        "name": "Exception Engine",
        "description": "Autonomous detection of route deviations, fuel anomalies, and maintenance alerts",
        "rollout": "ALL", # ALL, PLAN_BASED, BETA
        "enabled": True,
        "plans": ["free", "starter", "growth", "enterprise"]
    },
    "advanced_analytics": {
        "name": "Advanced Analytics & Forecasting",
        "description": "Historical fuel efficiency trends, vehicle ROI, and cost-per-km metrics",
        "rollout": "PLAN_BASED",
        "enabled": True,
        "plans": ["growth", "enterprise"]
    },
    "gps_live_tracking": {
        "name": "Live GPS Telemetry",
        "description": "Real-time simulated and hardware GPS tracking with map visualization",
        "rollout": "ALL",
        "enabled": True,
        "plans": ["free", "starter", "growth", "enterprise"]
    },
    "predictive_maintenance": {
        "name": "Predictive Maintenance",
        "description": "AI-driven component degradation analysis and breakdown prevention",
        "rollout": "PLAN_BASED",
        "enabled": False,
        "plans": ["enterprise"]
    },
    "ai_assistant": {
        "name": "AI Fleet Copilot",
        "description": "Natural language assistant with tool execution across fleet queries",
        "rollout": "ALL",
        "enabled": True,
        "plans": ["starter", "growth", "enterprise"]
    },
    "driver_mobile_app": {
        "name": "Driver Companion App",
        "description": "Mobile driver interface for dispatches, proof of delivery, and fuel receipts",
        "rollout": "PLAN_BASED",
        "enabled": True,
        "plans": ["growth", "enterprise"]
    },
    "automated_dispatch": {
        "name": "Automated Dispatch Optimization",
        "description": "Automated vehicle & driver matching based on eligibility and capacity",
        "rollout": "BETA",
        "enabled": True,
        "plans": ["enterprise"]
    }
}

@bp.route('/feature-flags', methods=['GET'])
@require_roles('super_admin')
def get_global_feature_flags():
    return jsonify({
        "success": True,
        "data": _GLOBAL_FEATURE_FLAGS
    })

@bp.route('/feature-flags/<key>', methods=['PUT'])
@require_roles('super_admin')
def update_global_feature_flag(key):
    global _GLOBAL_FEATURE_FLAGS
    if key not in _GLOBAL_FEATURE_FLAGS:
        return jsonify({"success": False, "message": "Feature flag not found"}), 404
        
    data = request.get_json() or {}
    for field in ['enabled', 'rollout', 'plans', 'name', 'description']:
        if field in data:
            _GLOBAL_FEATURE_FLAGS[key][field] = data[field]
            
    return jsonify({
        "success": True,
        "data": _GLOBAL_FEATURE_FLAGS[key],
        "message": f"Feature flag '{key}' updated successfully"
    })

