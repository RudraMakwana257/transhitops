from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from flask import jsonify
from app.models.user import User

def require_roles(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                user_id = get_jwt_identity()
                user = User.query.get(user_id)
                if not user or not user.is_active:
                    return jsonify({"success": False, "message": "User not found"}), 401
                if user.role not in roles:
                    return jsonify({
                        "success": False,
                        "message": f"Access denied. Required roles: {', '.join(roles)}"
                    }), 403
            except Exception as e:
                return jsonify({
                    "success": False,
                    "message": "Authentication required. Please login.",
                    "error": {"code": "UNAUTHORIZED"}
                }), 401
            return fn(*args, **kwargs)
        return wrapper
    return decorator