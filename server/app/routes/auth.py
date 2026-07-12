from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User
from app.middleware.rbac import require_roles
from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies, unset_jwt_cookies, get_jwt_identity, jwt_required

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    remember_me = data.get('remember_me', False)
    
    if not email or not password:
        return jsonify({"success": False, "message": "Email and password required"}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401
    
    if not user.is_active:
        return jsonify({"success": False, "message": "Account disabled"}), 403
    
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'name': user.name}
    )
    refresh_token = create_refresh_token(identity=str(user.id))
    
    response = jsonify({
        "success": True,
        "data": {"user": user.to_dict()},
        "message": "Login successful"
    })
    
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
    
    return response

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    response = jsonify({"success": True, "message": "Logged out successfully"})
    unset_jwt_cookies(response)
    return response

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    return jsonify({"success": True, "data": user.to_dict()})

@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({"success": False, "message": "User not found"}), 401
    
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'name': user.name}
    )
    
    response = jsonify({"success": True, "data": {"access_token": access_token}})
    set_access_cookies(response, access_token)
    return response