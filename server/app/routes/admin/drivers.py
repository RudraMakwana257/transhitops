import uuid
from datetime import datetime, date
from flask import request, jsonify
from sqlalchemy import or_
from app import db
from app.models.company import Company
from app.models.driver import Driver
from app.middleware.rbac import require_roles

from . import bp

@bp.route('/drivers', methods=['GET'])
@require_roles('super_admin')
def list_all_drivers():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '').strip()
    company_id = request.args.get('company_id')
    status = request.args.get('status')
    category = request.args.get('category')

    query = Driver.query

    if search:
        query = query.filter(or_(
            Driver.name.ilike(f'%{search}%'),
            Driver.license_number.ilike(f'%{search}%'),
            Driver.phone.ilike(f'%{search}%')
        ))

    if company_id:
        try:
            cid = uuid.UUID(company_id)
            query = query.filter(Driver.company_id == cid)
        except ValueError:
            pass

    if status:
        query = query.filter(Driver.status == status)

    if category:
        query = query.filter(Driver.license_category == category)

    pagination = query.order_by(Driver.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    drivers_data = []
    for d in pagination.items:
        d_dict = d.to_dict()
        d_dict['company_id'] = str(d.company_id) if d.company_id else None
        if d.company_id:
            c = Company.query.get(d.company_id)
            d_dict['company_name'] = c.name if c else 'Unknown'
        else:
            d_dict['company_name'] = 'Platform'
        drivers_data.append(d_dict)

    return jsonify({
        "success": True,
        "data": {
            "items": drivers_data,
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/drivers', methods=['POST'])
@require_roles('super_admin')
def create_driver():
    payload = request.get_json() or {}
    company_id = payload.get('company_id')
    name = payload.get('name', '').strip()
    license_number = payload.get('license_number', '').strip().upper()
    license_category = payload.get('license_category', 'HCV')
    license_expiry = payload.get('license_expiry')
    phone = payload.get('phone', '').strip()
    status = payload.get('status', 'Available')
    safety_score = payload.get('safety_score', 100.0)

    if not company_id:
        return jsonify({"success": False, "message": "company_id is required"}), 400
    if not name or not license_number or not phone or not license_expiry:
        return jsonify({"success": False, "message": "name, license_number, phone, and license_expiry are required"}), 400

    try:
        cid = uuid.UUID(company_id)
        comp = Company.query.get(cid)
        if not comp:
            return jsonify({"success": False, "message": "Company not found"}), 404
    except ValueError:
        return jsonify({"success": False, "message": "Invalid company_id format"}), 400

    if Driver.query.filter(Driver.license_number == license_number).first():
        return jsonify({"success": False, "message": f"Driver with license '{license_number}' already exists"}), 400

    driver = Driver(
        company_id=cid,
        name=name,
        license_number=license_number,
        license_category=license_category,
        license_expiry=license_expiry,
        phone=phone,
        status=status,
        safety_score=safety_score,
        is_active=True
    )
    db.session.add(driver)
    db.session.commit()

    d_dict = driver.to_dict()
    d_dict['company_id'] = str(driver.company_id)
    d_dict['company_name'] = comp.name

    return jsonify({
        "success": True,
        "data": d_dict,
        "message": "Driver created successfully"
    }), 201

@bp.route('/drivers/<uuid:driver_id>', methods=['GET'])
@require_roles('super_admin')
def get_driver(driver_id):
    driver = Driver.query.get_or_404(driver_id)
    d_dict = driver.to_dict()
    d_dict['company_id'] = str(driver.company_id) if driver.company_id else None
    if driver.company_id:
        c = Company.query.get(driver.company_id)
        d_dict['company_name'] = c.name if c else 'Unknown'
    return jsonify({"success": True, "data": d_dict})

@bp.route('/drivers/<uuid:driver_id>', methods=['PUT'])
@require_roles('super_admin')
def update_driver(driver_id):
    driver = Driver.query.get_or_404(driver_id)
    payload = request.get_json() or {}

    for field in ['name', 'license_category', 'license_expiry', 'phone', 'status', 'safety_score', 'is_active']:
        if field in payload and payload[field] is not None:
            setattr(driver, field, payload[field])

    if 'license_number' in payload and payload['license_number']:
        new_lic = payload['license_number'].strip().upper()
        existing = Driver.query.filter(Driver.license_number == new_lic, Driver.id != driver_id).first()
        if existing:
            return jsonify({"success": False, "message": "License number already registered"}), 409
        driver.license_number = new_lic

    if 'company_id' in payload and payload['company_id']:
        try:
            cid = uuid.UUID(payload['company_id'])
            comp = Company.query.get(cid)
            if not comp:
                return jsonify({"success": False, "message": "Company not found"}), 404
            driver.company_id = cid
        except ValueError:
            return jsonify({"success": False, "message": "Invalid company_id format"}), 400

    db.session.commit()
    d_dict = driver.to_dict()
    d_dict['company_id'] = str(driver.company_id) if driver.company_id else None
    if driver.company_id:
        c = Company.query.get(driver.company_id)
        d_dict['company_name'] = c.name if c else 'Unknown'

    return jsonify({"success": True, "data": d_dict, "message": "Driver updated successfully"})

@bp.route('/drivers/<uuid:driver_id>', methods=['DELETE'])
@require_roles('super_admin')
def delete_driver(driver_id):
    driver = Driver.query.get_or_404(driver_id)
    db.session.delete(driver)
    db.session.commit()
    return jsonify({"success": True, "message": "Driver deleted successfully"})
