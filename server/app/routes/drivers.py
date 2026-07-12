from flask import Blueprint, request, jsonify
from app import db
from app.models.driver import Driver
from app.middleware.rbac import require_roles
from sqlalchemy import or_, desc

bp = Blueprint('drivers', __name__, url_prefix='/api/drivers')

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer')
def list_drivers():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status')
    sort_by = request.args.get('sort_by', 'name')
    sort_order = request.args.get('sort_order', 'asc')
    
    query = Driver.query.filter_by(is_active=True)
    
    if search:
        query = query.filter(or_(
            Driver.name.ilike(f'%{search}%'),
            Driver.license_number.ilike(f'%{search}%')
        ))
    if status:
        query = query.filter_by(status=status)
    
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

@bp.route('', methods=['POST'])
@require_roles('fleet_manager')
def create_driver():
    data = request.get_json()
    
    if Driver.query.filter_by(license_number=data.get('license_number')).first():
        return jsonify({"success": False, "message": "License number already exists"}), 400
    
    driver = Driver(
        name=data['name'],
        license_number=data['license_number'],
        license_category=data['license_category'],
        license_expiry=data['license_expiry'],
        phone=data['phone'],
        safety_score=data.get('safety_score', 100),
        status=data.get('status', 'Available')
    )
    
    db.session.add(driver)
    db.session.commit()
    
    return jsonify({"success": True, "data": driver.to_dict(), "message": "Driver created"}), 201

@bp.route('/available', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher')
def get_available_drivers():
    from datetime import date
    drivers = Driver.query.filter(
        Driver.status == 'Available',
        Driver.is_active == True,
        Driver.license_expiry > date.today()
    ).all()
    return jsonify({"success": True, "data": [d.to_dict() for d in drivers]})

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer')
def get_driver(id):
    driver = Driver.query.get_or_404(id)
    return jsonify({"success": True, "data": driver.to_dict()})

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager', 'safety_officer')
def update_driver(id):
    driver = Driver.query.get_or_404(id)
    data = request.get_json()
    
    allowed_fields = ['name', 'license_category', 'license_expiry', 'phone', 'safety_score', 'status']
    if 'fleet_manager' not in [request.claims.get('role') if hasattr(request, 'claims') else '']:
        allowed_fields = ['safety_score', 'status']
    
    for field in allowed_fields:
        if field in data:
            setattr(driver, field, data[field])
    
    db.session.commit()
    return jsonify({"success": True, "data": driver.to_dict(), "message": "Driver updated"})

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
def delete_driver(id):
    driver = Driver.query.get_or_404(id)
    driver.is_active = False
    db.session.commit()
    return jsonify({"success": True, "message": "Driver deleted"})

@bp.route('/<id>/trips', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer')
def driver_trips(id):
    driver = Driver.query.get_or_404(id)
    trips = driver.trips.order_by(desc('created_at')).all()
    return jsonify({"success": True, "data": [t.to_dict() for t in trips]})