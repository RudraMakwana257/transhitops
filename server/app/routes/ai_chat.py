from flask import Blueprint, request, jsonify
from app.services.ai_service import get_ai_response
from app.middleware.rbac import require_roles

bp = Blueprint('ai_chat', __name__, url_prefix='/api/ai')

from app.middleware.rate_limiter import limiter, AI_LIMIT

@bp.route('/chat', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
@limiter.limit(AI_LIMIT)
def chat():
    data = request.get_json()
    user_message = data.get('message', '').strip()
    
    if not user_message:
        return jsonify({"success": False, "message": "Message is required"}), 400
    
    if len(user_message) > 500:
        return jsonify({"success": False, "message": "Message too long (max 500 chars)"}), 400
    
    history = data.get('history', [])
    
    ai_response = get_ai_response(user_message, history)
    
    if ai_response.startswith("AI service not configured") or ai_response.startswith("Groq library not installed") or "temporarily unavailable" in ai_response:
        return jsonify({
            "success": False,
            "message": ai_response,
            "error": {"code": "AI_SERVICE_UNAVAILABLE"}
        }), 503
    
    return jsonify({
        "success": True,
        "data": {
            "message": ai_response,
            "role": "assistant"
        }
    })