from flask import Blueprint, request, jsonify, g
from app import db
from app.models.driver import Driver
from app.middleware import require_roles, require_company, require_feature
from sqlalchemy import or_, desc
import uuid

from app.schemas import (
    DriverSchema,
    CreateDriverSchema,
    UpdateDriverSchema,
    validate_request,
)

bp = Blueprint('drivers', __name__, url_prefix='/api/drivers')

from app.middleware.rate_limiter import limiter, GENERAL_LIMIT
@bp.before_request
@limiter.limit(GENERAL_LIMIT)
def general_limit():
    pass

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('drivers')
def list_drivers():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status')
    category = request.args.get('category')
    sort_by = request.args.get('sort_by', 'name')
    sort_order = request.args.get('sort_order', 'asc')
    
    query = Driver.query.filter_by(company_id=g.company_id, is_active=True)
    
    if search:
        query = query.filter(or_(
            Driver.name.ilike(f'%{search}%'),
            Driver.license_number.ilike(f'%{search}%'),
            Driver.phone.ilike(f'%{search}%')
        ))
    if status:
        query = query.filter_by(status=status)
    if category:
        query = query.filter_by(license_category=category)
    
    if sort_order == 'desc':
        query = query.order_by(desc(getattr(Driver, sort_by)))
    else:
        query = query.order_by(getattr(Driver, sort_by))
    
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "success": True,
        "data": {
            "items": [d.to_dict() for d in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('drivers')
def get_driver(id):
    driver = Driver.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    return jsonify({"success": True, "data": driver.to_dict()})

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('drivers')
def create_driver():
    data = validate_request(CreateDriverSchema)
    
    if Driver.query.filter_by(company_id=g.company_id, license_number=data['license_number']).first():
        return jsonify({"success": False, "message": "License number already exists"}), 400
        
    driver = Driver(
        company_id=g.company_id,
        name=data['name'],
        license_number=data['license_number'],
        license_category=data.get('license_category'),
        license_expiry=data.get('license_expiry'),
        phone=data.get('phone'),
        safety_score=data.get('safety_score', 100.0),
        status=data.get('status', 'Available'),
        is_active=True
    )
    
    db.session.add(driver)
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "data": driver.to_dict(),
        "message": "Driver created successfully"
    }), 201

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('drivers')
def update_driver(id):
    driver = Driver.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = validate_request(UpdateDriverSchema)
    
    if 'license_number' in data and data['license_number'] != driver.license_number:
        if Driver.query.filter_by(company_id=g.company_id, license_number=data['license_number']).first():
            return jsonify({"success": False, "message": "License number already exists"}), 400
            
    for field in ['name', 'license_number', 'license_category', 'license_expiry', 
                  'phone', 'safety_score', 'status', 'is_active']:
        if field in data and data[field] is not None:
            setattr(driver, field, data[field])
            
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "data": driver.to_dict(),
        "message": "Driver updated successfully"
    })

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
@require_company
@require_feature('drivers')
def delete_driver(id):
    driver = Driver.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    driver.is_active = False
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "message": "Driver deactivated successfully"
    })