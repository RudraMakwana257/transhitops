from flask import Blueprint, request, jsonify, g
from app import db
from app.models.trip import Trip
from app.models.trip_event import TripEvent
from app.models.audit_log import AuditLog
from app.services.trip_service import TripService
from app.services.notification_service import create_notification
from app.middleware import require_roles, require_company, require_feature
from sqlalchemy import or_, desc
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

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('trips')
def list_trips():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status')
    
    query = Trip.query.filter_by(company_id=g.company_id)
    
    if search:
        query = query.filter(or_(
            Trip.origin.ilike(f'%{search}%'),
            Trip.destination.ilike(f'%{search}%'),
            Trip.id.cast(db.String).ilike(f'%{search}%')
        ))
    if status:
        query = query.filter_by(status=status)
    
    query = query.order_by(desc(Trip.created_at))
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "success": True,
        "data": {
            "items": [t.to_dict() for t in pagination.items],
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('trips')
def get_trip(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    return jsonify({"success": True, "data": trip.to_dict()})

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def create_trip():
    data = validate_request(CreateTripSchema)
    
    trip = TripService.create_trip(
        company_id=g.company_id,
        vehicle_id=data['vehicle_id'],
        driver_id=data['driver_id'],
        source=data['source'],
        destination=data['destination'],
        cargo_weight_kg=data['cargo_weight_kg'],
        planned_distance_km=data.get('planned_distance_km'),
        notes=data.get('notes'),
        user_id=g.user.id
    )
    
    return jsonify({
        "success": True, 
        "data": trip.to_dict(),
        "message": "Trip created successfully"
    }), 201

@bp.route('/<id>', methods=['PUT'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def update_trip(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = validate_request(UpdateTripSchema)
    
    if trip.status not in ['Draft', 'Dispatched']:
        return jsonify({"success": False, "message": f"Cannot edit trip in {trip.status} status"}), 400
        
    for field in ['vehicle_id', 'driver_id', 'origin', 'destination', 
                  'planned_start_time', 'planned_distance_km', 'notes']:
        if field in data and data[field] is not None:
            setattr(trip, field, data[field])
            
    # TODO: Add notification trigger here if assigned driver changes
            
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "data": trip.to_dict(),
        "message": "Trip updated successfully"
    })

@bp.route('/<id>/dispatch', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def dispatch_trip(id):
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
        return jsonify({
            "success": True, 
            "data": trip.to_dict(),
            "message": "Trip dispatched successfully"
        })
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400

@bp.route('/<id>/complete', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def complete_trip(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    
    data = request.get_json() or {}
    actual_distance = data.get('actual_distance_km')
    
    try:
        trip = TripService.complete_trip(g.company_id, trip.id, g.user.id, actual_distance)
        create_notification(
            company_id=g.company_id,
            user_id=g.user.id,
            title="Trip Completed",
            message=f"Trip #{trip.id} completed by {trip.driver.name if trip.driver else 'Unknown Driver'}",
            notification_type='success',
            entity_type='trip',
            entity_id=str(trip.id)
        )
        return jsonify({
            "success": True, 
            "data": trip.to_dict(),
            "message": "Trip completed successfully"
        })
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400

@bp.route('/<id>/cancel', methods=['POST'])
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
        return jsonify({
            "success": True, 
            "data": trip.to_dict(),
            "message": "Trip cancelled successfully"
        })
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400

@bp.route('/<id>/events', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer')
@require_company
@require_feature('trips')
def get_trip_events(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    events = TripEvent.query.filter_by(trip_id=trip.id, company_id=g.company_id).order_by(desc(TripEvent.event_time)).all()
    
    return jsonify({
        "success": True,
        "data": [e.to_dict() for e in events]
    })

@bp.route('/<id>/events', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
@require_feature('trips')
def add_trip_event(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = request.get_json() or {}
    
    event = TripEvent(
        company_id=g.company_id,
        trip_id=trip.id,
        event_type=data['event_type'],
        location=data.get('location'),
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        notes=data.get('notes'),
        created_by=g.user.id
    )
    
    db.session.add(event)
    db.session.commit()
    
    if data['event_type'] in ['Incident', 'Delay']:
        create_notification(
            company_id=g.company_id,
            user_id=None,
            title=f"Trip {data['event_type']}",
            message=f"{data['event_type']} reported on Trip #{trip.id}: {data.get('notes', 'No details')}",
            notification_type='error' if data['event_type'] == 'Incident' else 'warning',
            entity_type='trip',
            entity_id=str(trip.id)
        )
    
    return jsonify({
        "success": True, 
        "data": event.to_dict(),
        "message": "Trip event added successfully"
    }), 201