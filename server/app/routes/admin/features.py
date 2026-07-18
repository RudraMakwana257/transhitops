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
    
    features = CompanyFeature.query.filter_by(company_id=company.id).all()
    updated_data = {f.feature_key: f.is_enabled for f in features}
    
    return jsonify({
        "success": True, 
        "data": updated_data,
        "message": "Company features updated successfully"
    })
