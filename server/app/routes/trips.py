from flask import Blueprint, request, jsonify
from app import db
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip_event import TripEvent
from app.models.fuel_log import FuelLog
from app.middleware.rbac import require_roles
from sqlalchemy import or_, desc, func
from datetime import date, datetime
import uuid

bp = Blueprint('trips', __name__, url_prefix='/api/trips')

def generate_trip_number():
    today = date.today().strftime('%Y%m%d')
    count = Trip.query.filter(Trip.trip_number.like(f'TRIP-{today}-%')).count()
    return f'TRIP-{today}-{count+1:04d}'

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def list_trips():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status')
    vehicle_id = request.args.get('vehicle_id')
    driver_id = request.args.get('driver_id')
    from_date = request.args.get('from_date')
    to_date = request.args.get('to_date')
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    
    query = Trip.query
    
    if search:
        query = query.filter(or_(
            Trip.trip_number.ilike(f'%{search}%'),
            Trip.source.ilike(f'%{search}%'),
            Trip.destination.ilike(f'%{search}%')
        ))
    if status:
        query = query.filter_by(status=status)
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if driver_id:
        query = query.filter_by(driver_id=driver_id)
    if from_date:
        query = query.filter(Trip.created_at >= from_date)
    if to_date:
        query = query.filter(Trip.created_at <= to_date)
    
    if sort_order == 'desc':
        query = query.order_by(desc(getattr(Trip, sort_by)))
    else:
        query = query.order_by(getattr(Trip, sort_by))
    
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "success": True,
        "data": {
            "items": [t.to_dict(include_relations=True) for t in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
def create_trip():
    data = request.get_json()
    
    vehicle = Vehicle.query.get(data['vehicle_id'])
    driver = Driver.query.get(data['driver_id'])
    
    if not vehicle or vehicle.status != 'Available' or not vehicle.is_active:
        return jsonify({"success": False, "message": "Vehicle not available"}), 400
    if not driver or driver.status != 'Available' or not driver.is_active:
        return jsonify({"success": False, "message": "Driver not available"}), 400
    if driver.license_expiry < date.today():
        return jsonify({"success": False, "message": "Driver license expired"}), 400
    if float(data['cargo_weight_kg']) > float(vehicle.capacity_kg):
        return jsonify({"success": False, "message": "Cargo weight exceeds vehicle capacity"}), 400
    
    trip = Trip(
        trip_number=generate_trip_number(),
        vehicle_id=vehicle.id,
        driver_id=driver.id,
        source=data['source'],
        destination=data['destination'],
        cargo_weight_kg=data['cargo_weight_kg'],
        planned_distance_km=data.get('planned_distance_km'),
        notes=data.get('notes'),
        created_by=request.claims.get('sub') if hasattr(request, 'claims') else None
    )
    
    db.session.add(trip)
    db.session.commit()
    
    return jsonify({"success": True, "data": trip.to_dict(include_relations=True), "message": "Trip created as draft"}), 201

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def get_trip(id):
    trip = Trip.query.get_or_404(id)
    return jsonify({"success": True, "data": trip.to_dict(include_relations=True)})

@bp.route('/<id>/dispatch', methods=['PUT'])
@require_roles('fleet_manager', 'dispatcher')
def dispatch_trip(id):
    trip = Trip.query.get_or_404(id)
    
    if trip.status != 'Draft':
        return jsonify({"success": False, "message": "Trip cannot be dispatched from current status"}), 400
    
    vehicle = trip.vehicle
    driver = trip.driver
    
    if vehicle.status != 'Available':
        return jsonify({"success": False, "message": "Vehicle is not available"}), 400
    if driver.status != 'Available':
        return jsonify({"success": False, "message": "Driver is not available"}), 400
    if driver.license_expiry < date.today():
        return jsonify({"success": False, "message": "Driver license expired"}), 400
    if float(trip.cargo_weight_kg) > float(vehicle.capacity_kg):
        return jsonify({"success": False, "message": "Cargo weight exceeds vehicle capacity"}), 400
    
    vehicle.status = 'On Trip'
    driver.status = 'On Trip'
    trip.status = 'Dispatched'
    trip.dispatched_at = datetime.utcnow()
    trip.start_odometer = vehicle.odometer_km
    
    event = TripEvent(trip_id=trip.id, event_type='dispatched', description=f'Trip dispatched: {trip.source} to {trip.destination}')
    db.session.add(event)
    db.session.commit()
    
    return jsonify({"success": True, "data": trip.to_dict(include_relations=True), "message": "Trip dispatched successfully"})

@bp.route('/<id>/complete', methods=['PUT'])
@require_roles('fleet_manager', 'dispatcher')
def complete_trip(id):
    trip = Trip.query.get_or_404(id)
    data = request.get_json()
    
    if trip.status != 'Dispatched':
        return jsonify({"success": False, "message": "Trip cannot be completed from current status"}), 400
    
    end_odometer = data.get('end_odometer')
    fuel_consumed = data.get('fuel_consumed_l')
    revenue = data.get('revenue', 0)
    notes = data.get('notes')
    
    if not end_odometer or float(end_odometer) <= float(trip.start_odometer):
        return jsonify({"success": False, "message": "End odometer must be greater than start odometer"}), 400
    
    vehicle = trip.vehicle
    driver = trip.driver
    
    trip.status = 'Completed'
    trip.end_odometer = end_odometer
    trip.actual_distance_km = float(end_odometer) - float(trip.start_odometer)
    trip.fuel_consumed_l = fuel_consumed
    trip.revenue = revenue
    trip.notes = notes
    trip.completed_at = datetime.utcnow()
    
    vehicle.status = 'Available'
    vehicle.odometer_km = end_odometer
    driver.status = 'Available'
    
    if fuel_consumed:
        fuel_log = FuelLog(
            vehicle_id=vehicle.id,
            driver_id=driver.id,
            trip_id=trip.id,
            date=date.today(),
            liters=fuel_consumed,
            price_per_liter=0,
            odometer_reading=end_odometer,
            fuel_station='Trip completion'
        )
        db.session.add(fuel_log)
    
    event = TripEvent(trip_id=trip.id, event_type='completed', description='Trip completed')
    db.session.add(event)
    
    from app.services.health_score_service import recalculate_health_score
    recalculate_health_score(vehicle.id)
    
    db.session.commit()
    
    return jsonify({"success": True, "data": trip.to_dict(include_relations=True), "message": "Trip completed successfully"})

@bp.route('/<id>/cancel', methods=['PUT'])
@require_roles('fleet_manager', 'dispatcher')
def cancel_trip(id):
    trip = Trip.query.get_or_404(id)
    data = request.get_json()
    
    if trip.status not in ['Draft', 'Dispatched']:
        return jsonify({"success": False, "message": "Trip cannot be cancelled from current status"}), 400
    
    if trip.status == 'Dispatched':
        trip.vehicle.status = 'Available'
        trip.driver.status = 'Available'
    
    trip.status = 'Cancelled'
    trip.cancelled_at = datetime.utcnow()
    trip.notes = data.get('reason', trip.notes)
    
    event = TripEvent(trip_id=trip.id, event_type='cancelled', description=data.get('reason', 'Trip cancelled'))
    db.session.add(event)
    db.session.commit()
    
    return jsonify({"success": True, "data": trip.to_dict(include_relations=True), "message": "Trip cancelled"})

@bp.route('/recommend-vehicle', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher')
def recommend_vehicle():
    cargo_weight = request.args.get('cargo_weight', type=float)
    if not cargo_weight:
        return jsonify({"success": False, "message": "cargo_weight parameter required"}), 400
    
    vehicles = Vehicle.query.filter(
        Vehicle.status == 'Available',
        Vehicle.capacity_kg >= cargo_weight,
        Vehicle.is_active == True
    ).all()
    
    scored = []
    for v in vehicles:
        score = 0
        reasons = []
        
        ratio = cargo_weight / float(v.capacity_kg)
        if ratio >= 0.8:
            score += 30
            reasons.append("✔ Optimal capacity match")
        elif ratio >= 0.5:
            score += 20
            reasons.append("✔ Good capacity match")
        else:
            score += 10
            reasons.append("✔ Capacity matches (underutilized)")
        
        if v.health and v.health.health_score:
            score += int(float(v.health.health_score) * 0.4)
            if float(v.health.health_score) >= 80:
                reasons.append(f"✔ High health score ({float(v.health.health_score):.0f}/100)")
        
        from app.models.maintenance_log import MaintenanceLog
        upcoming = MaintenanceLog.query.filter(
            MaintenanceLog.vehicle_id == v.id,
            MaintenanceLog.status.in_(['Open', 'In Progress'])
        ).count()
        if upcoming == 0:
            score += 20
            reasons.append("✔ No pending maintenance")
        else:
            reasons.append(f"⚠ {upcoming} open maintenance job(s)")
        
        scored.append({
            "vehicle": v.to_dict(),
            "score": score,
            "reasons": reasons
        })
    
    scored.sort(key=lambda x: x['score'], reverse=True)
    
    return jsonify({"success": True, "data": scored[:3]})