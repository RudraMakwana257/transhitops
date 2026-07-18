from flask import Blueprint, jsonify
from app import db
from app.models.user import User
from app.models.company import Company
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from flask_jwt_extended import get_jwt_identity, jwt_required

bp = Blueprint('onboarding', __name__, url_prefix='/api/onboarding')

@bp.route('/status', methods=['GET'])
@jwt_required()
def get_onboarding_status():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
        
    company = Company.query.get(user.company_id)
    
    has_vehicle = Vehicle.query.filter_by(company_id=company.id).count() > 0
    has_driver = Driver.query.filter_by(company_id=company.id).count() > 0
    has_trip = Trip.query.filter_by(company_id=company.id).count() > 0
    has_profile = bool(company.phone and company.address)
    
    steps = {
        "account_created": True,
        "vehicle_added": has_vehicle,
        "driver_added": has_driver,
        "trip_created": has_trip,
        "profile_completed": has_profile
    }
    
    completed_steps = sum(1 for v in steps.values() if v)
    total_steps = len(steps)
    completion_percentage = int((completed_steps / total_steps) * 100)
    
    is_completed = (completed_steps == total_steps) or user.onboarding_completed
    
    return jsonify({
        "success": True,
        "completed": is_completed,
        "steps": steps,
        "completion_percentage": completion_percentage
    })

@bp.route('/complete', methods=['PATCH'])
@jwt_required()
def complete_onboarding():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
        
    user.onboarding_completed = True
    db.session.commit()
    
    return jsonify({"success": True, "message": "Onboarding completed"})
