import re
from datetime import datetime
from flask import request, jsonify
from app import db
from app.models.company import Company
from app.models.company_feature import CompanyFeature
from app.models.company_subscription import CompanySubscription
from app.middleware.rbac import require_roles
from app.schemas import CreateCompanySchema, UpdateCompanySchema, validate_request
from sqlalchemy import or_

from . import bp

def _generate_slug(name):
    base_slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    if not base_slug:
        base_slug = 'company'
    
    slug = base_slug
    counter = 2
    while Company.query.filter_by(slug=slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug

@bp.route('/companies', methods=['GET'])
@require_roles('super_admin')
def list_companies():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '')

    query = Company.query.filter(Company.deleted_at == None)
    
    if search:
        query = query.filter(or_(
            Company.name.ilike(f'%{search}%'),
            Company.slug.ilike(f'%{search}%'),
            Company.email.ilike(f'%{search}%')
        ))

    pagination = query.order_by(Company.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "success": True,
        "data": {
            "items": [c.to_dict() for c in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/companies', methods=['POST'])
@require_roles('super_admin')
def create_company():
    data = validate_request(CreateCompanySchema)
    
    if Company.query.filter_by(email=data['email']).first():
        return jsonify({"success": False, "message": "Email already registered for a company"}), 400

    slug = data.get('slug')
    if not slug:
        slug = _generate_slug(data['name'])
    elif Company.query.filter_by(slug=slug).first():
        return jsonify({"success": False, "message": "Slug already exists"}), 400

    company = Company(
        name=data['name'],
        email=data['email'],
        slug=slug,
        domain=data.get('domain'),
        logo_url=data.get('logo_url'),
        address=data.get('address'),
        gst_number=data.get('gst_number'),
        phone=data.get('phone'),
        timezone=data.get('timezone', 'Asia/Kolkata'),
        language=data.get('language', 'en'),
        currency=data.get('currency', 'INR'),
        vehicle_limit=data.get('vehicle_limit', 0),
        driver_limit=data.get('driver_limit', 0),
        user_limit=data.get('user_limit', 0),
        settings=data.get('settings', {})
    )
    db.session.add(company)
    db.session.flush()

    enabled_features = [
        'vehicles', 'drivers', 'trips', 'maintenance', 'fuel', 
        'expenses', 'dashboard', 'analytics', 'ai_chat'
    ]
    disabled_features = [
        'gps', 'payroll', 'inventory', 'accounting', 
        'documents', 'public_api', 'white_label'
    ]

    for feature in enabled_features:
        db.session.add(CompanyFeature(company_id=company.id, feature_key=feature, is_enabled=True))
    for feature in disabled_features:
        db.session.add(CompanyFeature(company_id=company.id, feature_key=feature, is_enabled=False))

    db.session.commit()
    data = company.to_dict()
    data['features'] = {
        f.feature_key: f.is_enabled for f in CompanyFeature.query.filter_by(company_id=company.id).all()
    }

    return jsonify({
        "success": True,
        "data": data,
        "message": "Company created successfully"
    }), 201

@bp.route('/companies/<uuid:id>', methods=['GET'])
@require_roles('super_admin')
def get_company(id):
    company = Company.query.get_or_404(id)
    if company.deleted_at is not None:
        return jsonify({"success": False, "message": "Company not found"}), 404
        
    data = company.to_dict()
    subscription = CompanySubscription.query.filter_by(company_id=company.id, is_active=True).first()
    data['subscription'] = subscription.to_dict() if subscription else None
    
    return jsonify({"success": True, "data": data})

@bp.route('/companies/<uuid:id>', methods=['PUT'])
@require_roles('super_admin')
def update_company(id):
    company = Company.query.get_or_404(id)
    if company.deleted_at is not None:
        return jsonify({"success": False, "message": "Company not found"}), 404
        
    data = validate_request(UpdateCompanySchema)
    
    if 'email' in data and data['email'] is not None:
        existing = Company.query.filter(Company.email == data['email'], Company.id != id).first()
        if existing:
            return jsonify({"success": False, "message": "Email already registered to another company"}), 409
            
    if 'domain' in data and data['domain'] is not None:
        existing = Company.query.filter(Company.domain == data['domain'], Company.id != id).first()
        if existing:
            return jsonify({"success": False, "message": "Domain already registered to another company"}), 409

    for field in ['name', 'email', 'domain', 'logo_url', 'address', 'gst_number', 'phone', 
                  'timezone', 'language', 'currency', 'vehicle_limit', 'driver_limit', 'user_limit', 
                  'is_active', 'settings']:
        if field in data and data[field] is not None:
            setattr(company, field, data[field])
            
    db.session.commit()
    return jsonify({"success": True, "data": company.to_dict(), "message": "Company updated successfully"})

@bp.route('/companies/<uuid:id>/suspend', methods=['POST'])
@require_roles('super_admin')
def suspend_company(id):
    company = Company.query.get_or_404(id)
    if company.deleted_at is not None:
        return jsonify({"success": False, "message": "Company not found"}), 404
    company.is_active = False
    db.session.commit()
    return jsonify({"success": True, "message": "Company suspended"})

@bp.route('/companies/<uuid:id>/activate', methods=['POST'])
@require_roles('super_admin')
def activate_company(id):
    company = Company.query.get_or_404(id)
    if company.deleted_at is not None:
        return jsonify({"success": False, "message": "Company not found"}), 404
    company.is_active = True
    db.session.commit()
    return jsonify({"success": True, "message": "Company activated"})

@bp.route('/companies/<uuid:id>', methods=['DELETE'])
@require_roles('super_admin')
def delete_company(id):
    company = Company.query.get_or_404(id)
    if company.deleted_at is not None:
        return jsonify({"success": False, "message": "Company not found"}), 404
    company.deleted_at = datetime.utcnow()
    company.is_active = False
    db.session.commit()
    return jsonify({"success": True, "message": "Company soft deleted"})
