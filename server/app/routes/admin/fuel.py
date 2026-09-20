import uuid
from datetime import datetime
from flask import request, jsonify
from app import db
from app.models.company import Company
from app.models.fuel_log import FuelLog
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.middleware.rbac import require_roles

from . import bp

@bp.route('/fuel', methods=['GET'])
@require_roles('super_admin')
def list_all_fuel():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '').strip()
    company_id = request.args.get('company_id')

    query = FuelLog.query.filter(FuelLog.deleted_at == None)

    if search:
        query = query.filter(FuelLog.fuel_station.ilike(f'%{search}%'))

    if company_id:
        try:
            cid = uuid.UUID(company_id)
            query = query.filter(FuelLog.company_id == cid)
        except ValueError:
            pass

    pagination = query.order_by(FuelLog.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    logs_data = []
    for f in pagination.items:
        f_dict = f.to_dict()
        f_dict['company_id'] = str(f.company_id) if f.company_id else None
        if f.company_id:
            c = Company.query.get(f.company_id)
            f_dict['company_name'] = c.name if c else 'Unknown'
        else:
            f_dict['company_name'] = 'Platform'

        if f.vehicle:
            f_dict['vehicle_name'] = f"{f.vehicle.name} ({f.vehicle.reg_number})"
        if f.driver:
            f_dict['driver_name'] = f.driver.name

        logs_data.append(f_dict)

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

@bp.route('/fuel', methods=['POST'])
@require_roles('super_admin')
def create_fuel():
    payload = request.get_json() or {}
    company_id = payload.get('company_id')
    vehicle_id = payload.get('vehicle_id')
    driver_id = payload.get('driver_id')
    trip_id = payload.get('trip_id')
    f_date = payload.get('date', datetime.utcnow().strftime('%Y-%m-%d'))
    liters = payload.get('liters', 0)
    price_per_liter = payload.get('price_per_liter', 0)
    total_cost = payload.get('total_cost')
    if total_cost is None and liters and price_per_liter:
        total_cost = float(liters) * float(price_per_liter)
    odometer_reading = payload.get('odometer_reading')
    fuel_station = payload.get('fuel_station', '')

    if not company_id or not vehicle_id:
        return jsonify({"success": False, "message": "company_id and vehicle_id are required"}), 400

    try:
        cid = uuid.UUID(company_id)
        vid = uuid.UUID(vehicle_id)
        did = uuid.UUID(driver_id) if driver_id else None
        tid = uuid.UUID(trip_id) if trip_id else None
    except ValueError:
        return jsonify({"success": False, "message": "Invalid UUID format"}), 400

    f_log = FuelLog(
        company_id=cid,
        vehicle_id=vid,
        driver_id=did,
        trip_id=tid,
        date=f_date,
        liters=liters,
        price_per_liter=price_per_liter,
        total_cost=total_cost,
        odometer_reading=odometer_reading,
        fuel_station=fuel_station
    )
    db.session.add(f_log)
    db.session.commit()

    f_dict = f_log.to_dict()
    f_dict['company_id'] = str(f_log.company_id)
    return jsonify({
        "success": True,
        "data": f_dict,
        "message": "Fuel log created successfully"
    }), 201

@bp.route('/fuel/<uuid:log_id>', methods=['GET'])
@require_roles('super_admin')
def get_fuel(log_id):
    f_log = FuelLog.query.get_or_404(log_id)
    f_dict = f_log.to_dict()
    f_dict['company_id'] = str(f_log.company_id) if f_log.company_id else None
    if f_log.company_id:
        c = Company.query.get(f_log.company_id)
        f_dict['company_name'] = c.name if c else 'Unknown'
    return jsonify({"success": True, "data": f_dict})

@bp.route('/fuel/<uuid:log_id>', methods=['PUT'])
@require_roles('super_admin')
def update_fuel(log_id):
    f_log = FuelLog.query.get_or_404(log_id)
    payload = request.get_json() or {}

    for field in ['date', 'liters', 'price_per_liter', 'total_cost', 'odometer_reading', 'fuel_station']:
        if field in payload and payload[field] is not None:
            setattr(f_log, field, payload[field])

    if 'liters' in payload or 'price_per_liter' in payload:
        if 'total_cost' not in payload or payload['total_cost'] is None:
            f_log.total_cost = float(f_log.liters) * float(f_log.price_per_liter)

    db.session.commit()
    f_dict = f_log.to_dict()
    f_dict['company_id'] = str(f_log.company_id) if f_log.company_id else None
    return jsonify({"success": True, "data": f_dict, "message": "Fuel log updated successfully"})

@bp.route('/fuel/<uuid:log_id>', methods=['DELETE'])
@require_roles('super_admin')
def delete_fuel(log_id):
    f_log = FuelLog.query.get_or_404(log_id)
    f_log.deleted_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"success": True, "message": "Fuel log deleted successfully"})
