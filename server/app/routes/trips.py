from datetime import datetime
from flask import Blueprint, request, jsonify, g
from app import db
from app.models.trip import Trip
from app.models.trip_event import TripEvent
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.audit_log import AuditLog
from app.services.trip_service import TripService
from app.services.notification_service import create_notification
from app.middleware import require_roles, require_company, require_feature
from app.utils.response import success_response, error_response
from sqlalchemy import or_, desc
from sqlalchemy.orm.attributes import flag_modified
import uuid

from app.schemas import (
    TripSchema,
    CreateTripSchema,
    UpdateTripSchema,
    validate_request,
)

bp = Blueprint('trips', __name__, url_prefix='/api/trips')

from app.middleware.rate_limiter import limiter, GENERAL_LIMIT
@bp.before_request
@limiter.limit(GENERAL_LIMIT)
def general_limit():
    pass

from sqlalchemy.orm import joinedload

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('trips')
def list_trips():
    """List fleet trips with pagination and status filtering.
    ---
    tags:
      - Trips
    security:
      - Bearer: []
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
        description: Page number
      - name: page_size
        in: query
        type: integer
        default: 20
        description: Page size
      - name: status
        in: query
        type: string
        description: Filter by trip status (Draft, Dispatched, In Progress, Completed, Cancelled)
      - name: search
        in: query
        type: string
        description: Search by source or destination
    responses:
      200:
        description: Paginated trips list
      401:
        description: Unauthorized
      403:
        description: Forbidden
    """
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status')
    
    query = Trip.query.options(joinedload(Trip.vehicle), joinedload(Trip.driver)).filter_by(company_id=g.company_id)
    
    if search:
        query = query.filter(or_(
            Trip.source.ilike(f'%{search}%'),
            Trip.destination.ilike(f'%{search}%'),
            Trip.id.cast(db.String).ilike(f'%{search}%')
        ))
    if status:
        query = query.filter_by(status=status)
    
    query = query.order_by(desc(Trip.created_at))
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return success_response(data={
        "items": [t.to_dict() for t in pagination.items],
        "total": pagination.total,
        "page": page,
        "page_size": page_size,
        "total_pages": pagination.pages
    })

@bp.route('/recommend-vehicle', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def recommend_vehicle():
    cargo_weight = request.args.get('cargo_weight', type=float) or request.args.get('cargo_weight_kg', type=float) or 0.0
    
    query = Vehicle.query.filter_by(company_id=g.company_id, is_active=True, status='Available')
    if cargo_weight > 0:
        query = query.filter(Vehicle.capacity_kg >= cargo_weight)
        
    vehicles = query.all()
    
    recommendations = []
    for v in vehicles:
        cap = float(v.capacity_kg) if v.capacity_kg else 1.0
        utilization = (cargo_weight / cap) if (cargo_weight > 0 and cap > 0) else 0.5
        utilization = min(utilization, 1.0)
        
        capacity_score = utilization * 50.0
        health_val = float(v.health_score) if (hasattr(v, 'health_score') and v.health_score is not None) else 80.0
        health_score = (health_val / 100.0) * 50.0
        
        total_score = round(capacity_score + health_score, 1)
        
        reasons = []
        if cargo_weight > 0:
            reasons.append(f"Capacity utilization: {round(utilization * 100, 1)}%")
        reasons.append(f"Health score: {health_val}/100")
        
        recommendations.append({
            "vehicle": v.to_dict(),
            "score": total_score,
            "match_reasons": reasons
        })
        
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    
    return success_response(data=recommendations)

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('trips')
def get_trip(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    return success_response(data=trip.to_dict())

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def create_trip():
    """Create and schedule a new fleet trip.
    ---
    tags:
      - Trips
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - vehicle_id
            - driver_id
            - source
            - destination
            - cargo_weight_kg
          properties:
            vehicle_id:
              type: string
              format: uuid
            driver_id:
              type: string
              format: uuid
            source:
              type: string
              example: Mumbai Port Hub
            destination:
              type: string
              example: Pune Warehouse B
            cargo_weight_kg:
              type: number
              example: 1200
            planned_distance_km:
              type: number
              example: 150
            notes:
              type: string
    responses:
      201:
        description: Trip created successfully
      400:
        description: Business logic validation failure (e.g. driver license expired or vehicle over-capacity)
      401:
        description: Unauthorized
    """
    data = validate_request(CreateTripSchema)
    
    trip = TripService.create_trip(
        company_id=g.company_id,
        vehicle_id=data['vehicle_id'],
        driver_id=data['driver_id'],
        source=data.get('source') or data.get('origin'),
        destination=data['destination'],
        cargo_weight_kg=data['cargo_weight_kg'],
        planned_distance_km=data.get('planned_distance_km'),
        notes=data.get('notes'),
        user_id=g.user.id
    )
    
    return success_response(
        data=trip.to_dict(),
        message="Trip created successfully",
        status_code=201
    )

@bp.route('/check-eligibility', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def check_eligibility():
    vehicle_id = request.args.get('vehicle_id')
    driver_id = request.args.get('driver_id')
    if not vehicle_id or not driver_id:
        return error_response(message="vehicle_id and driver_id parameters are required", status_code=400)
    is_eligible, reasons = TripService.check_dispatch_eligibility(g.company_id, vehicle_id, driver_id)
    return success_response(data={
        "eligible": is_eligible,
        "reasons": reasons
    })

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def update_trip(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = validate_request(UpdateTripSchema)
    
    if 'status' in data and data['status'] is not None and data['status'] != trip.status:
        return error_response(message="Direct status updates are not allowed. Use dedicated action endpoints (/dispatch, /complete, /cancel).", status_code=400)

    if trip.status not in ['Draft', 'Dispatched']:
        return error_response(message=f"Cannot edit trip in {trip.status} status", status_code=400)
        
    if trip.status == 'Dispatched':
        disallowed_dispatched_fields = ['vehicle_id', 'driver_id', 'cargo_weight_kg']
        for df in disallowed_dispatched_fields:
            if df in data and data[df] is not None:
                current_val = str(getattr(trip, df, ''))
                if str(data[df]) != current_val:
                    return error_response(
                        message=f"Cannot change {df} on a dispatched trip. Complete or cancel the trip first.",
                        status_code=400
                    )
        
    if 'vehicle_id' in data and data['vehicle_id'] and data['vehicle_id'] != str(trip.vehicle_id):
        Vehicle.query.filter_by(id=data['vehicle_id'], company_id=g.company_id).first_or_404()
    if 'driver_id' in data and data['driver_id'] and data['driver_id'] != str(trip.driver_id):
        Driver.query.filter_by(id=data['driver_id'], company_id=g.company_id).first_or_404()

    updatable_fields = [
        'vehicle_id', 'driver_id', 'source', 'destination', 
        'cargo_weight_kg', 'planned_distance_km', 'actual_distance_km',
        'start_odometer', 'end_odometer', 'fuel_consumed_l',
        'revenue', 'notes', 'dispatched_at', 'completed_at', 'cancelled_at'
    ]
    for field in updatable_fields:
        if field in data and data[field] is not None:
            setattr(trip, field, data[field])
            
    if 'origin' in data and data['origin'] is not None and not data.get('source'):
        trip.source = data['origin']
            
    db.session.commit()
    
    return success_response(
        data=trip.to_dict(),
        message="Trip updated successfully"
    )

from app.services.quota_service import QuotaService

@bp.route('/<id>/dispatch', methods=['POST', 'PUT'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def dispatch_trip(id):
    QuotaService.enforce_quota(g.company_id, 'active_trips')
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    
    try:
        trip = TripService.dispatch_trip(g.company_id, trip.id, g.user.id)
        if trip.driver:
            create_notification(
                company_id=g.company_id,
                user_id=g.user.id,
                title="New Trip Assigned",
                message=f"Trip #{trip.id} from {trip.source} to {trip.destination}",
                notification_type='info',
                entity_type='trip',
                entity_id=str(trip.id)
            )
        return success_response(
            data=trip.to_dict(),
            message="Trip dispatched successfully"
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)

@bp.route('/<id>/complete', methods=['POST', 'PUT'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def complete_trip(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    
    data = request.get_json() or {}
    actual_distance = data.get('actual_distance_km')
    end_odometer = data.get('end_odometer')
    fuel_consumed = data.get('fuel_consumed_l')
    revenue = data.get('revenue')
    notes = data.get('notes')
    
    try:
        trip = TripService.complete_trip(
            g.company_id,
            trip.id,
            g.user.id,
            actual_distance_km=actual_distance,
            end_odometer=end_odometer,
            fuel_consumed_l=fuel_consumed,
            revenue=revenue,
            notes=notes
        )
        create_notification(
            company_id=g.company_id,
            user_id=g.user.id,
            title="Trip Completed",
            message=f"Trip #{trip.id} completed by {trip.driver.name if trip.driver else 'Unknown Driver'}",
            notification_type='success',
            entity_type='trip',
            entity_id=str(trip.id)
        )
        return success_response(
            data=trip.to_dict(),
            message="Trip completed successfully"
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)

@bp.route('/<id>/cancel', methods=['POST', 'PUT'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def cancel_trip(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    
    data = request.get_json() or {}
    reason = data.get('reason', 'Cancelled by user')
    
    try:
        trip = TripService.cancel_trip(g.company_id, trip.id, g.user.id, reason)
        if trip.driver:
            create_notification(
                company_id=g.company_id,
                user_id=g.user.id,
                title="Trip Cancelled",
                message=f"Trip #{trip.id} has been cancelled.",
                notification_type='warning',
                entity_type='trip',
                entity_id=str(trip.id)
            )
        return success_response(
            data=trip.to_dict(),
            message="Trip cancelled successfully"
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)

@bp.route('/<id>/waypoints/<waypoint_id>/arrive', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def arrive_waypoint(id, waypoint_id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    if trip.status not in ['Dispatched', 'In Progress']:
        return error_response(message=f"Cannot record arrival for trip in {trip.status} status", status_code=400)

    waypoints = list(trip.waypoints or [])
    found = False
    now_iso = datetime.utcnow().isoformat()

    for wp in waypoints:
        if str(wp.get('id', wp.get('waypoint_id', ''))) == str(waypoint_id):
            wp['status'] = 'Arrived'
            wp['arrived_at'] = now_iso
            found = True
            break

    if not found:
        return error_response(message="Waypoint not found", status_code=404)

    trip.waypoints = waypoints
    flag_modified(trip, 'waypoints')
    db.session.commit()
    return success_response(data=trip.to_dict(), message="Recorded waypoint arrival")

@bp.route('/<id>/waypoints/<waypoint_id>/depart', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def depart_waypoint(id, waypoint_id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    if trip.status not in ['Dispatched', 'In Progress']:
        return error_response(message=f"Cannot record departure for trip in {trip.status} status", status_code=400)

    waypoints = list(trip.waypoints or [])
    found = False
    now_iso = datetime.utcnow().isoformat()

    for wp in waypoints:
        if str(wp.get('id', wp.get('waypoint_id', ''))) == str(waypoint_id):
            wp['status'] = 'Departed'
            wp['departed_at'] = now_iso
            found = True
            break

    if not found:
        return error_response(message="Waypoint not found", status_code=404)

    # Transition status from Dispatched -> In Progress upon first departure
    if trip.status == 'Dispatched':
        trip.status = 'In Progress'

    trip.waypoints = waypoints
    flag_modified(trip, 'waypoints')
    db.session.commit()
    return success_response(data=trip.to_dict(), message="Recorded waypoint departure")

@bp.route('/<id>/pod', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def capture_pod(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    if trip.status not in ['Dispatched', 'In Progress', 'Completed']:
        return error_response(message=f"Cannot record POD for trip in {trip.status} status", status_code=400)

    data = request.get_json() or {}
    recipient_name = (data.get('recipient_name') or '').strip()
    if not recipient_name:
        return error_response(message="recipient_name is required for Proof of Delivery", status_code=400)

    now_iso = datetime.utcnow().isoformat()
    pod = {
        "recipient_name": recipient_name,
        "recipient_signature": data.get('recipient_signature'),
        "delivery_photo": data.get('delivery_photo'),
        "delivered_at": data.get('delivered_at', now_iso),
        "latitude": data.get('latitude'),
        "longitude": data.get('longitude'),
        "notes": data.get('notes')
    }

    trip.pod_details = pod
    flag_modified(trip, 'pod_details')
    db.session.commit()

    return success_response(data=trip.to_dict(), message="Proof of Delivery captured successfully")

@bp.route('/<id>/events', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer')
@require_company
@require_feature('trips')
def get_trip_events(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    events = TripEvent.query.filter_by(trip_id=trip.id, company_id=g.company_id).order_by(desc(TripEvent.event_time)).all()
    
    return success_response(data=[e.to_dict() for e in events])

@bp.route('/<id>/events', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def add_trip_event(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = request.get_json() or {}
    event_type = (data.get('event_type') or '').strip()
    if not event_type:
        return error_response(message="event_type is required", status_code=400)
    
    event = TripEvent(
        company_id=g.company_id,
        trip_id=trip.id,
        event_type=event_type,
        location=data.get('location'),
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        notes=data.get('notes'),
        created_by=g.user.id
    )
    
    db.session.add(event)
    db.session.commit()
    
    if event_type in ['Incident', 'Delay']:
        create_notification(
            company_id=g.company_id,
            user_id=None,
            title=f"Trip {data['event_type']}",
            message=f"{data['event_type']} reported on Trip #{trip.id}: {data.get('notes', 'No details')}",
            notification_type='error' if data['event_type'] == 'Incident' else 'warning',
            entity_type='trip',
            entity_id=str(trip.id)
        )
    
    return success_response(
        data=event.to_dict(),
        message="Trip event added successfully",
        status_code=201
    )