from flask import request, g
from flask_jwt_extended import get_jwt_identity
from app.middleware.rbac import require_roles
from app.models.manual_payment import ManualPayment
from app.services.manual_billing_service import ManualBillingService
from app.utils.response import success_response, error_response
from . import bp

@bp.route('/payments', methods=['POST'])
@require_roles('super_admin')
def record_manual_payment():
    """
    Record a manual/offline payment and extend/activate subscription for a tenant.
    Only Super Admins may execute this endpoint.
    """
    data = request.get_json() or {}

    company_id = data.get('company_id')
    plan_identifier = data.get('plan_slug') or data.get('plan_id')
    amount = data.get('amount')
    payment_method = data.get('payment_method')

    if not company_id:
        return error_response("company_id is required", status_code=400)
    if not plan_identifier:
        return error_response("plan_slug or plan_id is required", status_code=400)
    if amount is None:
        return error_response("amount is required", status_code=400)
    if not payment_method:
        return error_response("payment_method is required (CASH, UPI, BANK_TRANSFER, PHONE_CALL, FACE_TO_FACE, OTHER)", status_code=400)

    recorded_by = getattr(g, 'user_id', None) or (g.user.id if hasattr(g, 'user') and g.user else None)
    if not recorded_by:
        try:
            recorded_by = get_jwt_identity()
        except Exception:
            recorded_by = None

    try:
        payment = ManualBillingService.record_payment(
            company_id=company_id,
            plan_identifier=plan_identifier,
            amount=amount,
            payment_method=payment_method,
            recorded_by_user_id=recorded_by,
            billing_period_months=data.get('billing_period_months', 1),
            payment_date=data.get('payment_date'),
            period_start=data.get('period_start'),
            period_end=data.get('period_end'),
            currency=data.get('currency', 'INR'),
            reference_number=data.get('reference_number'),
            notes=data.get('notes')
        )
        return success_response(data=payment.to_dict(), message="Manual payment recorded and subscription updated successfully", status_code=201)
    except ValueError as ve:
        return error_response(str(ve), status_code=400)
    except Exception as e:
        return error_response(f"Failed to record manual payment: {str(e)}", status_code=500)

@bp.route('/payments', methods=['GET'])
@require_roles('super_admin')
def list_manual_payments():
    """
    List all manual payments with optional status, company, and payment_method filters.
    Only Super Admins may execute this endpoint.
    """
    company_id = request.args.get('company_id')
    status = request.args.get('status')
    payment_method = request.args.get('payment_method')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    result = ManualBillingService.get_payment_history(
        company_id=company_id,
        status=status,
        payment_method=payment_method,
        page=page,
        per_page=per_page
    )
    return success_response(data=result)

@bp.route('/payments/<uuid:payment_id>', methods=['GET'])
@require_roles('super_admin')
def get_manual_payment_detail(payment_id):
    """
    Get detailed information for a specific manual payment record.
    Only Super Admins may execute this endpoint.
    """
    payment = ManualPayment.query.get_or_404(payment_id)
    return success_response(data=payment.to_dict())

@bp.route('/payments/<uuid:payment_id>/reverse', methods=['POST'])
@require_roles('super_admin')
def reverse_manual_payment(payment_id):
    """
    Reverse a previously confirmed manual payment record.
    Only Super Admins may execute this endpoint.
    """
    data = request.get_json() or {}
    reason = data.get('reason')

    reversed_by = getattr(g, 'user_id', None) or (g.user.id if hasattr(g, 'user') and g.user else None)
    if not reversed_by:
        try:
            reversed_by = get_jwt_identity()
        except Exception:
            reversed_by = None

    try:
        reversed_payment = ManualBillingService.reverse_payment(
            payment_id=payment_id,
            reversed_by_user_id=reversed_by,
            reason=reason
        )
        return success_response(data=reversed_payment.to_dict(), message="Manual payment reversed successfully")
    except ValueError as ve:
        return error_response(str(ve), status_code=400)
    except Exception as e:
        return error_response(f"Failed to reverse payment: {str(e)}", status_code=500)
