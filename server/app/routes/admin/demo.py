from flask import request
from app.middleware.rbac import require_roles
from app.utils.response import success_response, error_response
from app.services.demo_service import DemoService
from . import bp


@bp.route('/demo', methods=['GET'])
@require_roles('super_admin')
def get_demo_overview():
    """Returns overview statistics and list of all demo sandbox environments."""
    data = DemoService.get_demo_overview()
    return success_response(data=data)


@bp.route('/demo', methods=['POST'])
@require_roles('super_admin')
def create_demo_sandbox():
    """Provisions a new dedicated demo sandbox environment for a customer prospect."""
    body = request.get_json() or {}
    company_name = body.get('company_name')
    admin_name = body.get('admin_name')
    admin_email = body.get('admin_email')
    password = body.get('password')
    duration_days = body.get('duration_days', 7)
    seed_dummy_data = body.get('seed_dummy_data', True)
    notes = body.get('notes')

    if not company_name or not admin_name or not admin_email:
        return error_response(
            message="Company name, admin name, and admin email are required.",
            status_code=400
        )

    try:
        result = DemoService.create_demo_sandbox(
            company_name=company_name,
            admin_name=admin_name,
            admin_email=admin_email,
            password=password,
            duration_days=duration_days,
            seed_dummy_data=seed_dummy_data,
            notes=notes
        )
        return success_response(
            data=result,
            message=f"Demo sandbox for '{company_name}' provisioned successfully for {duration_days} days.",
            status_code=201
        )
    except ValueError as ve:
        return error_response(message=str(ve), status_code=400)
    except Exception as e:
        return error_response(message=f"Failed to create demo sandbox: {str(e)}", status_code=500)


@bp.route('/demo/<uuid:company_id>/extend', methods=['POST'])
@require_roles('super_admin')
def extend_demo_sandbox(company_id):
    """Extends demo sandbox duration by X days or sets a custom date."""
    body = request.get_json() or {}
    days = body.get('days')
    custom_date = body.get('custom_date')

    try:
        result = DemoService.extend_demo_sandbox(
            company_id=str(company_id),
            days=days,
            custom_date=custom_date
        )
        return success_response(
            data=result,
            message="Demo sandbox extended successfully."
        )
    except ValueError as ve:
        return error_response(message=str(ve), status_code=400)
    except Exception as e:
        return error_response(message=f"Failed to extend demo: {str(e)}", status_code=500)


@bp.route('/demo/<uuid:company_id>/reset-data', methods=['POST'])
@require_roles('super_admin')
def reset_demo_dummy_data(company_id):
    """Re-seeds clean dummy vehicles, drivers, trips, and logs for a demo tenant."""
    try:
        result = DemoService.reset_demo_dummy_data(company_id=str(company_id))
        return success_response(data=result, message=result.get('message'))
    except ValueError as ve:
        return error_response(message=str(ve), status_code=400)
    except Exception as e:
        return error_response(message=f"Failed to reset demo data: {str(e)}", status_code=500)


@bp.route('/demo/<uuid:company_id>/status', methods=['POST'])
@require_roles('super_admin')
def toggle_demo_status(company_id):
    """Suspends or reactivates a demo sandbox."""
    body = request.get_json() or {}
    is_active = body.get('is_active', True)
    try:
        result = DemoService.toggle_demo_status(company_id=str(company_id), is_active=is_active)
        return success_response(data=result, message="Sandbox status updated.")
    except Exception as e:
        return error_response(message=str(e), status_code=500)


@bp.route('/demo/users/<uuid:user_id>/password', methods=['PUT'])
@require_roles('super_admin')
def update_demo_user_password(user_id):
    """Updates password for a demo user from the admin panel."""
    body = request.get_json() or {}
    new_password = body.get('password')

    if not new_password or len(str(new_password).strip()) < 8:
        return error_response(message="Password must be at least 8 characters long.", status_code=400)

    try:
        result = DemoService.update_demo_user_password(user_id=str(user_id), new_password=new_password)
        return success_response(data=result, message=result.get('message'))
    except ValueError as ve:
        return error_response(message=str(ve), status_code=400)
    except Exception as e:
        return error_response(message=f"Failed to update password: {str(e)}", status_code=500)


@bp.route('/demo/<uuid:company_id>', methods=['DELETE'])
@require_roles('super_admin')
def delete_demo_sandbox(company_id):
    """Deletes a demo sandbox environment and all related records."""
    try:
        result = DemoService.delete_demo_sandbox(company_id=str(company_id))
        return success_response(data=result, message=result.get('message'))
    except ValueError as ve:
        return error_response(message=str(ve), status_code=400)
    except Exception as e:
        return error_response(message=f"Failed to delete demo sandbox: {str(e)}", status_code=500)
