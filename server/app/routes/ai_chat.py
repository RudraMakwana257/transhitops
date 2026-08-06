from flask import Blueprint, request, g
from app.services.ai_service import get_ai_response
from app.middleware.rbac import require_roles
from app.middleware.tenant import require_company
from app.utils.response import success_response, error_response

bp = Blueprint('ai_chat', __name__, url_prefix='/api/ai')

from app.middleware.rate_limiter import limiter, AI_LIMIT

@bp.route('/chat', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@require_company
@limiter.limit(AI_LIMIT)
def chat():
    data = request.get_json() or {}
    user_message = data.get('message', '').strip()
    
    if not user_message:
        return error_response(message="Message is required", status_code=400)
    
    if len(user_message) > 500:
        return error_response(message="Message too long (max 500 chars)", status_code=400)
    
    history = data.get('history', [])
    
    ai_response = get_ai_response(user_message, history)
    
    if ai_response.startswith("AI service not configured") or ai_response.startswith("Groq library not installed") or "temporarily unavailable" in ai_response:
        return error_response(message=ai_response, error="AI_SERVICE_UNAVAILABLE", status_code=503)
    
    return success_response(data={
        "message": ai_response,
        "role": "assistant"
    })