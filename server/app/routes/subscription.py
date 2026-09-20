import uuid
from flask import Blueprint, request, jsonify, g
from app.middleware import require_roles, require_company
from app.services.quota_service import QuotaService
from app.models.subscription_plan import SubscriptionPlan
from app.utils.response import success_response, error_response
from app.middleware.rate_limiter import limiter, GENERAL_LIMIT

bp = Blueprint('subscription', __name__, url_prefix='/api/subscription')

@bp.before_request
@limiter.limit(GENERAL_LIMIT)
def general_limit():
    pass

@bp.route('/usage', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
def get_subscription_usage():
    """Get tenant subscription status, limits, and resource usage summary."""
    summary = QuotaService.get_tenant_usage_summary(g.company_id)
    return success_response(data=summary)

@bp.route('/entitlements', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
def get_subscription_entitlements():
    """Get tenant plan entitlements and feature flags."""
    entitlements = QuotaService.get_tenant_entitlements(g.company_id)
    return success_response(data=entitlements)

@bp.route('/plans', methods=['GET'])
def list_subscription_plans():
    """List available active subscription plans."""
    plans = SubscriptionPlan.query.filter_by(is_active=True).order_by(SubscriptionPlan.price_monthly.asc()).all()
    return success_response(data=[p.to_dict() for p in plans])

from app.services.manual_billing_service import ManualBillingService

@bp.route('/payments', methods=['GET'])
@require_roles('fleet_manager', 'financial_analyst')
@require_company
def get_tenant_payment_history():
    """Get tenant payment history and manual billing ledger records."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    history = ManualBillingService.get_payment_history(
        company_id=g.company_id,
        page=page,
        per_page=per_page
    )
    return success_response(data=history)

@bp.route('/change-plan', methods=['POST'])
@require_roles('super_admin')
@require_company
def change_subscription_plan():
    """
    Switch tenant subscription plan.
    Gated strictly to super_admin role to prevent unpaid tenant self-upgrades.
    """
    data = request.get_json() or {}
    plan_identifier = data.get('plan_slug') or data.get('plan_id')

    if not plan_identifier:
        return error_response(message="Plan identifier (plan_slug or plan_id) is required", status_code=400)

    try:
        updated_summary = QuotaService.change_plan(g.company_id, plan_identifier)
        return success_response(data=updated_summary, message="Subscription plan updated successfully")
    except ValueError as ve:
        return error_response(message=str(ve), status_code=400)
    except Exception as e:
        return error_response(message=f"Failed to change plan: {str(e)}", status_code=500)

@bp.route('/checkout', methods=['POST'])
def create_checkout_session():
    """Disabled online payment checkout endpoint under Manual Billing architecture."""
    return error_response(
        message="Online payment checkout is disabled. Subscriptions are activated via Super Admin manual payment recording.",
        status_code=400
    )

@bp.route('/webhook', methods=['POST'])
def billing_webhook():
    """Disabled online payment webhook endpoint under Manual Billing architecture."""
    return error_response(
        message="Online payment webhooks are disabled under Manual Billing model.",
        status_code=400
    )
