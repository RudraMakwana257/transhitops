from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User
from app.middleware.rbac import require_roles
from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies, unset_jwt_cookies, get_jwt_identity, jwt_required
from app.models.password_reset_token import PasswordResetToken
from app.services.email_service import send_password_reset_email
from app.utils.response import success_response, error_response, standard_response

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

from app.middleware.rate_limiter import limiter, AUTH_LIMIT

@bp.route('/login', methods=['POST'])
@limiter.limit(AUTH_LIMIT)
def login():
    raw_body = request.get_data(as_text=True)
    if len(raw_body) > 10000:
        return error_response(message="Request body too large.", error="PAYLOAD_TOO_LARGE", status_code=413)
        
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return error_response(message="Email and password required", status_code=400)
    
    if len(email) > 150 or len(password) > 255:
        return error_response(message="Validation error: Input exceeds maximum length", status_code=422)
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return error_response(message="Invalid email or password", status_code=401)
        
    if user.is_locked:
        return error_response(message="Account is locked due to multiple failed login attempts. Try again later.", status_code=423)
        
    if not user.check_password(password):
        user.record_failed_login()
        db.session.commit()
        return error_response(message="Invalid email or password", status_code=401)
        
    if not user.is_active:
        return error_response(message="Account disabled", status_code=403)
        
    user.record_successful_login()
    db.session.commit()
    
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'name': user.name, 'company_id': str(user.company_id) if user.company_id else None}
    )
    refresh_token = create_refresh_token(identity=str(user.id))
    
    resp, code = success_response(
        data={"user": user.to_dict(), "access_token": access_token, "refresh_token": refresh_token},
        message="Login successful"
    )
    
    set_access_cookies(resp, access_token)
    set_refresh_cookies(resp, refresh_token)
    
    return resp, code

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    resp, code = success_response(message="Logged out successfully")
    unset_jwt_cookies(resp)
    return resp, code

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
        return error_response(message="User not found", status_code=404)
    return success_response(data=user.to_dict())

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
        return error_response(message="User not found", status_code=401)
    
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'name': user.name, 'company_id': str(user.company_id) if user.company_id else None}
    )
    
    resp, code = success_response(data={"access_token": access_token})
    set_access_cookies(resp, access_token)
    return resp, code

@bp.route('/forgot-password', methods=['POST'])
@limiter.limit("5 per minute")
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email')
    
    if not email:
        return error_response(message="Email is required", status_code=400)
        
    user = User.query.filter_by(email=email).first()
    
    if user and user.is_active:
        reset_token = PasswordResetToken.generate(user.id)
        db.session.add(reset_token)
        db.session.commit()
        
        send_password_reset_email(user.email, user.name, reset_token.token)
        
    return success_response(message="If the email exists, a password reset link has been sent.")

@bp.route('/reset-password', methods=['POST'])
@limiter.limit("5 per minute")
def reset_password():
    data = request.get_json() or {}
    token_str = data.get('token')
    new_password = data.get('password')
    
    if not token_str or not new_password:
        return error_response(message="Token and password are required", status_code=400)
        
    reset_token = PasswordResetToken.query.filter_by(token=token_str).first()
    
    if not reset_token or not reset_token.is_valid:
        return error_response(message="Invalid or expired token", status_code=400)
        
    user = reset_token.user
    user.set_password(new_password)
    reset_token.mark_used()
    db.session.commit()
    
    return success_response(message="Password reset successful")