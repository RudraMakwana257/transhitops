import uuid
from datetime import datetime
from flask import request, jsonify
from sqlalchemy import or_
from app import db
from app.models.company import Company
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.middleware.rbac import require_roles

from . import bp

@bp.route('/trips', methods=['GET'])
@require_roles('super_admin')
def list_all_trips():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '').strip()
    company_id = request.args.get('company_id')
    status = request.args.get('status')

    query = Trip.query

    if search:
        query = query.filter(or_(
            Trip.trip_number.ilike(f'%{search}%'),
            Trip.source.ilike(f'%{search}%'),
            Trip.destination.ilike(f'%{search}%')
        ))

    if company_id:
        try:
            cid = uuid.UUID(company_id)
            query = query.filter(Trip.company_id == cid)
        except ValueError:
            pass

    if status:
        query = query.filter(Trip.status == status)

    pagination = query.order_by(Trip.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    trips_data = []
    for t in pagination.items:
        t_dict = t.to_dict()
        t_dict['company_id'] = str(t.company_id) if t.company_id else None
        if t.company_id:
            c = Company.query.get(t.company_id)
            t_dict['company_name'] = c.name if c else 'Unknown'
        else:
            t_dict['company_name'] = 'Platform'
        
        if t.vehicle:
            t_dict['vehicle_name'] = f"{t.vehicle.name} ({t.vehicle.reg_number})"
        if t.driver:
            t_dict['driver_name'] = t.driver.name

        trips_data.append(t_dict)

    return jsonify({
        "success": True,
        "data": {
            "items": trips_data,
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/trips', methods=['POST'])
@require_roles('super_admin')
def create_trip():
    payload = request.get_json() or {}
    company_id = payload.get('company_id')
    vehicle_id = payload.get('vehicle_id')
    driver_id = payload.get('driver_id')
    source = payload.get('source', '').strip()
    destination = payload.get('destination', '').strip()
    cargo_weight_kg = payload.get('cargo_weight_kg', 100)
    planned_distance_km = payload.get('planned_distance_km', 50)
    revenue = payload.get('revenue', 0)
    notes = payload.get('notes')
    status = payload.get('status', 'Draft')

    if not company_id or not vehicle_id or not driver_id or not source or not destination:
        return jsonify({"success": False, "message": "company_id, vehicle_id, driver_id, source, and destination are required"}), 400

    try:
        cid = uuid.UUID(company_id)
        vid = uuid.UUID(vehicle_id)
        did = uuid.UUID(driver_id)
    except ValueError:
        return jsonify({"success": False, "message": "Invalid UUID format in company, vehicle, or driver ID"}), 400

    import random
    trip_number = f"TRP-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

    trip = Trip(
        company_id=cid,
        vehicle_id=vid,
        driver_id=did,
        trip_number=trip_number,
        source=source,
        destination=destination,
        cargo_weight_kg=cargo_weight_kg,
        planned_distance_km=planned_distance_km,
        revenue=revenue,
        notes=notes,
        status=status
    )
    db.session.add(trip)
    db.session.commit()

    t_dict = trip.to_dict()
    t_dict['company_id'] = str(trip.company_id)
    return jsonify({
        "success": True,
        "data": t_dict,
        "message": "Trip created successfully"
    }), 201

@bp.route('/trips/<uuid:trip_id>', methods=['GET'])
@require_roles('super_admin')
def get_trip(trip_id):
    trip = Trip.query.get_or_404(trip_id)
    t_dict = trip.to_dict()
    t_dict['company_id'] = str(trip.company_id) if trip.company_id else None
    if trip.company_id:
        c = Company.query.get(trip.company_id)
        t_dict['company_name'] = c.name if c else 'Unknown'
    if trip.vehicle:
        t_dict['vehicle_name'] = f"{trip.vehicle.name} ({trip.vehicle.reg_number})"
    if trip.driver:
        t_dict['driver_name'] = trip.driver.name
    return jsonify({"success": True, "data": t_dict})

@bp.route('/trips/<uuid:trip_id>', methods=['PUT'])
@require_roles('super_admin')
def update_trip(trip_id):
    trip = Trip.query.get_or_404(trip_id)
    payload = request.get_json() or {}

    for field in ['source', 'destination', 'cargo_weight_kg', 'planned_distance_km', 
                  'actual_distance_km', 'status', 'start_odometer', 'end_odometer', 
                  'fuel_consumed_l', 'revenue', 'notes']:
        if field in payload and payload[field] is not None:
            setattr(trip, field, payload[field])

    if 'status' in payload:
        new_status = payload['status']
        if new_status == 'Dispatched' and not trip.dispatched_at:
            trip.dispatched_at = datetime.utcnow()
        elif new_status == 'Completed' and not trip.completed_at:
            trip.completed_at = datetime.utcnow()
        elif new_status == 'Cancelled' and not trip.cancelled_at:
            trip.cancelled_at = datetime.utcnow()

    db.session.commit()
    t_dict = trip.to_dict()
    t_dict['company_id'] = str(trip.company_id) if trip.company_id else None
    return jsonify({"success": True, "data": t_dict, "message": "Trip updated successfully"})

@bp.route('/trips/<uuid:trip_id>', methods=['DELETE'])
@require_roles('super_admin')
def delete_trip(trip_id):
    trip = Trip.query.get_or_404(trip_id)
    db.session.delete(trip)
    db.session.commit()
    return jsonify({"success": True, "message": "Trip deleted successfully"})
