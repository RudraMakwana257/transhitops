from flask import Blueprint, request, jsonify
from app.services.ai_service import get_fleet_context, build_system_prompt
from app.middleware.rbac import require_roles
import os
import anthropic

bp = Blueprint('ai_chat', __name__, url_prefix='/api/ai')

@bp.route('/chat', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst')
def chat():
    data = request.get_json()
    user_message = data.get('message', '').strip()
    
    if not user_message:
        return jsonify({"success": False, "message": "Message is required"}), 400
    
    if len(user_message) > 500:
        return jsonify({"success": False, "message": "Message too long (max 500 chars)"}), 400
    
    history = data.get('history', [])
    
    fleet_context = get_fleet_context()
    system_prompt = build_system_prompt(fleet_context)
    
    messages = []
    for msg in history[-10:]:
        if msg.get('role') in ['user', 'assistant']:
            messages.append({"role": msg['role'], "content": msg['content']})
    messages.append({"role": "user", "content": user_message})
    
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return jsonify({
            "success": False,
            "message": "AI service not configured",
            "error": {"code": "AI_NOT_CONFIGURED"}
        }), 503
    
    client = anthropic.Anthropic(api_key=api_key)
    
    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=system_prompt,
            messages=messages
        )
        
        ai_response = response.content[0].text
        
        return jsonify({
            "success": True,
            "data": {
                "message": ai_response,
                "role": "assistant"
            }
        })
    
    except anthropic.APIError as e:
        return jsonify({
            "success": False,
            "message": "AI service temporarily unavailable. Please try again.",
            "error": {"code": "AI_SERVICE_UNAVAILABLE"}
        }), 503
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "An error occurred. Please try again.",
            "error": {"code": "INTERNAL_ERROR"}
        }), 500