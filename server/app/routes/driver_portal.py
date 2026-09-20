from flask import Blueprint, request, g
from app import db
from app.models.driver import Driver
from app.models.trip import Trip
from app.services.trip_service import TripService
from app.middleware import require_roles, require_company
from app.utils.response import success_response, error_response

bp = Blueprint('driver_portal', __name__, url_prefix='/api/driver')

@bp.route('/assigned-trips', methods=['GET'])
@require_roles('driver', 'dispatcher', 'fleet_manager')
@require_company
def get_assigned_trips():
    driver = Driver.query.filter_by(user_id=g.user.id, company_id=g.company_id).first()
    if driver and g.user.role == 'driver':
        driver_id = driver.id
    elif driver and not request.args.get('driver_id'):
        driver_id = driver.id
    elif g.user.role == 'driver':
        return error_response(message="Driver profile not associated with current account", status_code=404)
    else:
        req_driver_id = request.args.get('driver_id')
        if not req_driver_id:
            return error_response(message="driver_id parameter is required for non-driver roles without linked profile", status_code=400)
        target_driver = Driver.query.filter_by(id=req_driver_id, company_id=g.company_id).first()
        if not target_driver:
            return error_response(message="Driver profile not found", status_code=404)
        driver_id = target_driver.id

    trips = Trip.query.filter_by(driver_id=driver_id, company_id=g.company_id).all()
    return success_response(data=[t.to_dict() for t in trips])

@bp.route('/trips/<id>/update-status', methods=['POST'])
@require_roles('driver', 'dispatcher', 'fleet_manager')
@require_company
def update_driver_trip_status(id):
    trip = Trip.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    
    if g.user.role == 'driver':
        driver = Driver.query.filter_by(user_id=g.user.id, company_id=g.company_id).first()
        if not driver or str(trip.driver_id) != str(driver.id):
            return error_response(message="Forbidden: Cannot update trip assigned to another driver", status_code=403)

    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in ['Dispatched', 'In Progress', 'Completed']:
        return error_response(message="Invalid status for driver update", status_code=400)

    # Valid transitions: Dispatched -> In Progress -> Completed, or Dispatched -> Completed
    valid_transitions = {
        'Draft': ['Dispatched'],
        'Dispatched': ['In Progress', 'Completed'],
        'In Progress': ['Completed'],
        'Completed': [],
        'Cancelled': []
    }
    
    allowed = valid_transitions.get(trip.status, [])
    if new_status not in allowed:
        return error_response(message=f"Invalid state transition from {trip.status} to {new_status}", status_code=400)

    if new_status == 'Completed':
        updated_trip = TripService.complete_trip(
            company_id=g.company_id,
            trip_id=trip.id,
            user_id=g.user.id,
            notes=data.get('notes')
        )
        return success_response(data=updated_trip.to_dict(), message="Trip completed successfully")

    trip.status = new_status
    db.session.commit()

    return success_response(data=trip.to_dict(), message=f"Trip status updated to {new_status}")

