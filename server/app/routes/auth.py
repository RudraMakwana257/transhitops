from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User
from app.middleware.rbac import require_roles
from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies, unset_jwt_cookies, get_jwt_identity, jwt_required
from app.models.password_reset_token import PasswordResetToken
from app.services.email_service import send_password_reset_email

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

from app.middleware.rate_limiter import limiter, AUTH_LIMIT

@bp.route('/login', methods=['POST'])
@limiter.limit(AUTH_LIMIT)
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    remember_me = data.get('remember_me', False)
    
    if not email or not password:
        return jsonify({"success": False, "message": "Email and password required"}), 400
    
    if len(email) > 150 or len(password) > 255:
        return jsonify({"success": False, "message": "Validation error: Input exceeds maximum length"}), 422
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({"success": False, "message": "Invalid email or password"}), 401
        
    if user.is_locked:
        return jsonify({"success": False, "message": "Account is locked due to multiple failed login attempts. Try again later."}), 423
        
    if not user.check_password(password):
        user.record_failed_login()
        db.session.commit()
        return jsonify({"success": False, "message": "Invalid email or password"}), 401
        
    if not user.is_active:
        return jsonify({"success": False, "message": "Account disabled"}), 403
        
    user.record_successful_login()
    db.session.commit()
    
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'name': user.name, 'company_id': str(user.company_id) if user.company_id else None}
    )
    refresh_token = create_refresh_token(identity=str(user.id))
    
    response = jsonify({
        "success": True,
        "data": {"user": user.to_dict(), "access_token": access_token},
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
    import uuid
    try:
        user_id = uuid.UUID(user_id)
    except ValueError:
        pass
    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    return jsonify({"success": True, "data": user.to_dict()})

@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit("30 per minute")
def refresh():
    user_id = get_jwt_identity()
    import uuid
    try:
        user_id = uuid.UUID(user_id)
    except ValueError:
        pass
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({"success": False, "message": "User not found"}), 401
    
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'name': user.name, 'company_id': str(user.company_id) if user.company_id else None}
    )
    
    response = jsonify({"success": True, "data": {"access_token": access_token}})
    set_access_cookies(response, access_token)
    return response

@bp.route('/forgot-password', methods=['POST'])
@limiter.limit("5 per minute")
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400
        
    user = User.query.filter_by(email=email).first()
    
    # Always return 200 to prevent email enumeration
    if user and user.is_active:
        reset_token = PasswordResetToken.generate(user.id)
        db.session.add(reset_token)
        db.session.commit()
        
        send_password_reset_email(user.email, user.name, reset_token.token)
        
    return jsonify({"success": True, "message": "If the email exists, a password reset link has been sent."})

@bp.route('/reset-password', methods=['POST'])
@limiter.limit("5 per minute")
def reset_password():
    data = request.get_json()
    token_str = data.get('token')
    new_password = data.get('password')
    
    if not token_str or not new_password:
        return jsonify({"success": False, "message": "Token and password are required"}), 400
        
    reset_token = PasswordResetToken.query.filter_by(token=token_str).first()
    
    if not reset_token or not reset_token.is_valid:
        return jsonify({"success": False, "message": "Invalid or expired token"}), 400
        
    user = reset_token.user
    user.set_password(new_password)
    reset_token.mark_used()
    db.session.commit()
    
    return jsonify({"success": True, "message": "Password reset successful"})