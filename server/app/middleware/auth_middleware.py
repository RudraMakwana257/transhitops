from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from flask import jsonify, request
from app.models.user import User

def jwt_required_custom(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            return fn(*args, **kwargs)
        except Exception as e:
            return jsonify({
                'success': False,
                'message': 'Authentication required. Please login.',
                'error': {'code': 'UNAUTHORIZED'}
            }), 401
    return wrapper

def get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(user_id)

def get_current_user_role():
    claims = get_jwt()
    return claims.get('role')

def get_current_user_id():
    return get_jwt_identity()