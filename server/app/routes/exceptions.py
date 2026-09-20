from flask import Blueprint, request, jsonify, g
from app.middleware import require_roles, require_company, require_feature
from app.services.exception_service import ExceptionService
from app.utils.response import success_response, error_response
from app.middleware.rate_limiter import limiter, GENERAL_LIMIT

bp = Blueprint('exceptions', __name__, url_prefix='/api/exceptions')

@bp.before_request
@limiter.limit(GENERAL_LIMIT)
def general_limit():
    pass

@bp.route('/detect', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer')
@require_company
@require_feature('exceptions')
def trigger_detection():
    """Manually trigger exception detection for current company."""
    try:
        summary = ExceptionService.run_exception_detection(g.company_id)
        return success_response(data=summary, message="Exception detection executed successfully")
    except Exception as e:
        return error_response(message=f"Detection failed: {str(e)}", status_code=500)

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('exceptions')
def list_exceptions():
    """List tenant exceptions with filtering and pagination."""
    status = request.args.get('status')
    severity = request.args.get('severity')
    exc_type = request.args.get('type')
    entity_type = request.args.get('entity_type')

    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
    except ValueError:
        return error_response(message="Invalid pagination parameters", status_code=400)

    result = ExceptionService.get_exceptions(
        company_id=g.company_id,
        status=status,
        severity=severity,
        type=exc_type,
        entity_type=entity_type,
        page=page,
        page_size=page_size
    )

    return success_response(data=result)

@bp.route('/summary', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('exceptions')
def get_exception_summary():
    """Get active exception summary counts grouped by severity."""
    counts = ExceptionService.get_summary_stats(g.company_id)
    return success_response(data=counts)

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@require_feature('exceptions')
def get_exception_detail(id):
    """Fetch exception details including entity info and recommended action."""
    detail = ExceptionService.get_exception_detail(g.company_id, id)
    if not detail:
        return error_response(message="Exception not found", status_code=404)
    return success_response(data=detail)

@bp.route('/<id>/acknowledge', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer')
@require_company
@require_feature('exceptions')
def acknowledge_exception(id):
    """Acknowledge an active exception."""
    try:
        updated = ExceptionService.acknowledge_exception(g.company_id, g.user.id, id)
        return success_response(data=updated, message="Exception acknowledged")
    except ValueError as ve:
        return error_response(message=str(ve), status_code=400)
    except Exception as e:
        return error_response(message=f"Failed to acknowledge exception: {str(e)}", status_code=500)

@bp.route('/<id>/resolve', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer')
@require_company
@require_feature('exceptions')
def resolve_exception(id):
    """Resolve an exception."""
    data = request.get_json() or {}
    note = data.get('resolution_note')

    try:
        updated = ExceptionService.resolve_exception(g.company_id, g.user.id, id, resolution_note=note)
        return success_response(data=updated, message="Exception resolved")
    except ValueError as ve:
        return error_response(message=str(ve), status_code=400)
    except Exception as e:
        return error_response(message=f"Failed to resolve exception: {str(e)}", status_code=500)

@bp.route('/<id>/dismiss', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer')
@require_company
@require_feature('exceptions')
def dismiss_exception(id):
    """Dismiss an exception."""
    data = request.get_json() or {}
    note = data.get('resolution_note')

    try:
        updated = ExceptionService.dismiss_exception(g.company_id, g.user.id, id, resolution_note=note)
        return success_response(data=updated, message="Exception dismissed")
    except ValueError as ve:
        return error_response(message=str(ve), status_code=400)
    except Exception as e:
        return error_response(message=f"Failed to dismiss exception: {str(e)}", status_code=500)
