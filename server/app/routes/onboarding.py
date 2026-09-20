from datetime import datetime, date
from flask import Blueprint
from app import db
from app.models.user import User
from app.models.company import Company
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.utils.response import success_response, error_response

bp = Blueprint('onboarding', __name__, url_prefix='/api/onboarding')

import uuid

@bp.route('/status', methods=['GET'])
@jwt_required()
def get_onboarding_status():
    current_user_id = get_jwt_identity()
    try:
        uid = uuid.UUID(str(current_user_id))
    except (ValueError, TypeError):
        uid = current_user_id
    user = User.query.get(uid)
    
    if not user:
        return error_response(message="User not found", status_code=404)
        
    company = Company.query.get(user.company_id)
    if not company:
        return success_response(data={
            "completed": False,
            "steps": {
                "account_created": True,
                "vehicle_added": False,
                "driver_added": False,
                "trip_created": False,
                "profile_completed": False
            },
            "completion_percentage": 20
        })
    
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
    
    return success_response(data={
        "completed": is_completed,
        "steps": steps,
        "completion_percentage": completion_percentage
    })

@bp.route('/complete', methods=['PATCH'])
@jwt_required()
def complete_onboarding():
    current_user_id = get_jwt_identity()
    try:
        uid = uuid.UUID(str(current_user_id))
    except (ValueError, TypeError):
        uid = current_user_id
    user = User.query.get(uid)
    
    if not user:
        return error_response(message="User not found", status_code=404)
        
    user.onboarding_completed = True
    db.session.commit()
    
    return success_response(message="Onboarding completed")

import csv
import io
from flask import request, g
from app.middleware import require_roles, require_company
from app.services.quota_service import QuotaService

MAX_IMPORT_ROWS = 250

@bp.route('/import/vehicles', methods=['POST'])
@require_roles('fleet_manager')
@require_company
def import_vehicles_csv():
    """Bulk import vehicles from CSV payload or file upload."""
    content = ""
    if 'file' in request.files:
        file = request.files['file']
        content = file.stream.read().decode('utf-8')
    elif request.is_json and request.get_json().get('csv'):
        content = request.get_json()['csv']
    else:
        content = request.get_data(as_text=True)

    if not content or not content.strip():
        return error_response(message="CSV content or file is required", status_code=400)

    imported = 0
    skipped = 0
    errors = []

    try:
        reader = list(csv.DictReader(io.StringIO(content.strip())))
        if len(reader) > MAX_IMPORT_ROWS:
            return error_response(message=f"CSV exceeds maximum batch limit of {MAX_IMPORT_ROWS} rows. Please split the file into smaller batches.", status_code=400)

        for idx, row in enumerate(reader, start=1):
            reg = (row.get('reg_number') or row.get('reg_no') or '').strip()
            name = (row.get('name') or row.get('vehicle_name') or reg).strip()
            v_type = (row.get('type') or 'Truck').strip()
            cap = row.get('capacity_kg') or 5000
            cost = row.get('acquisition_cost') or 100000

            if not reg:
                errors.append({"row": idx, "error": "Missing reg_number"})
                skipped += 1
                continue

            if Vehicle.query.filter_by(company_id=g.company_id, reg_number=reg).first():
                errors.append({"row": idx, "reg_number": reg, "error": "Registration number already exists"})
                skipped += 1
                continue

            can_create, _ = QuotaService.check_quota(g.company_id, 'vehicles')
            if not can_create:
                errors.append({"row": idx, "reg_number": reg, "error": "Vehicle quota limit reached for subscription plan"})
                skipped += 1
                break

            vehicle = Vehicle(
                company_id=g.company_id,
                reg_number=reg,
                name=name,
                type=v_type,
                capacity_kg=float(cap) if cap else 5000.0,
                acquisition_cost=float(cost) if cost else 100000.0,
                status='Available',
                is_active=True
            )
            db.session.add(vehicle)
            imported += 1

        db.session.commit()
        return success_response(data={"imported": imported, "skipped": skipped, "errors": errors}, message=f"Successfully imported {imported} vehicles ({skipped} skipped)")
    except Exception as e:
        db.session.rollback()
        return error_response(message=f"Failed to process CSV: {str(e)}", status_code=400)

@bp.route('/import/drivers', methods=['POST'])
@require_roles('fleet_manager')
@require_company
def import_drivers_csv():
    """Bulk import drivers from CSV payload or file upload."""
    content = ""
    if 'file' in request.files:
        file = request.files['file']
        content = file.stream.read().decode('utf-8')
    elif request.is_json and request.get_json().get('csv'):
        content = request.get_json()['csv']
    else:
        content = request.get_data(as_text=True)

    if not content or not content.strip():
        return error_response(message="CSV content or file is required", status_code=400)

    imported = 0
    skipped = 0
    errors = []

    try:
        reader = list(csv.DictReader(io.StringIO(content.strip())))
        if len(reader) > MAX_IMPORT_ROWS:
            return error_response(message=f"CSV exceeds maximum batch limit of {MAX_IMPORT_ROWS} rows. Please split the file into smaller batches.", status_code=400)

        for idx, row in enumerate(reader, start=1):
            name = (row.get('name') or '').strip()
            lic = (row.get('license_number') or row.get('license') or '').strip()
            cat = (row.get('license_category') or 'HMV').strip()
            exp_str = (row.get('license_expiry') or '2027-12-31').strip()
            phone = (row.get('phone') or '0000000000').strip()
            try:
                exp_date = datetime.strptime(exp_str, '%Y-%m-%d').date()
            except ValueError:
                exp_date = date(2027, 12, 31)

            if not name or not lic:
                errors.append({"row": idx, "error": "Missing driver name or license_number"})
                skipped += 1
                continue

            if Driver.query.filter_by(company_id=g.company_id, license_number=lic).first():
                errors.append({"row": idx, "license_number": lic, "error": "License number already exists"})
                skipped += 1
                continue

            can_create, _ = QuotaService.check_quota(g.company_id, 'drivers')
            if not can_create:
                errors.append({"row": idx, "license_number": lic, "error": "Driver quota limit reached for subscription plan"})
                skipped += 1
                break

            driver = Driver(
                company_id=g.company_id,
                name=name,
                license_number=lic,
                license_category=cat,
                license_expiry=exp_date,
                phone=phone,
                status='Available',
                is_active=True
            )
            db.session.add(driver)
            imported += 1

        db.session.commit()
        return success_response(data={"imported": imported, "skipped": skipped, "errors": errors}, message=f"Successfully imported {imported} drivers ({skipped} skipped)")
    except Exception as e:
        db.session.rollback()
        return error_response(message=f"Failed to process CSV: {str(e)}", status_code=400)
