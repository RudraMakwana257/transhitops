from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User
from app.middleware.rbac import require_roles
from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies, unset_jwt_cookies, get_jwt_identity, get_jwt, jwt_required
from app.models.password_reset_token import PasswordResetToken
from app.services.email_service import send_password_reset_email
from app.services.token_blocklist import block_token
from app.utils.response import success_response, error_response, standard_response

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

from app.middleware.rate_limiter import limiter, AUTH_LIMIT

@bp.route('/login', methods=['POST'])
@limiter.limit(AUTH_LIMIT)
def login():
    """Authenticate user with email and password to receive JWT access and refresh tokens.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
              example: super@transitops.com
            password:
              type: string
              example: SecurePass123!
    responses:
      200:
        description: Authentication successful
      400:
        description: Email and password required
      401:
        description: Invalid email or password
      423:
        description: Account locked
    """
    raw_body = request.get_data(as_text=True)
    if len(raw_body) > 10000:
        return error_response(message="Request body too large.", error="PAYLOAD_TOO_LARGE", status_code=413)
        
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return error_response(message="Email and password required", status_code=400)
    
    email_clean = str(email).strip().lower()
    
    if len(email_clean) > 150 or len(password) > 255:
        return error_response(message="Validation error: Input exceeds maximum length", status_code=422)
    
    user = User.query.filter(db.func.lower(User.email) == email_clean).first()
    
    if not user:
        return error_response(message="Invalid email or password", status_code=401)
        
    if user.is_locked:
        return error_response(message="Account is locked due to multiple failed login attempts. Try again later.", status_code=423)
        
    password_valid = user.check_password(password)
        
    if not password_valid:
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
@jwt_required(optional=True)
def logout():
    try:
        claims = get_jwt()
        if claims and claims.get('jti'):
            block_token(claims['jti'], ttl_seconds=28800)
    except Exception:
        pass
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

@bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    data = request.get_json() or {}
    company_name = data.get('company_name', '').strip()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not company_name or not name or not email or not password:
        return error_response(message="company_name, name, email, and password are required", status_code=400)
        
    if len(password) < 8:
        return error_response(message="Password must be at least 8 characters long", status_code=422)
        
    if User.query.filter(db.func.lower(User.email) == email).first():
        return error_response(message="Email is already registered", status_code=409)
        
    import re
    from app.models.company import Company
    from app.models.subscription_plan import SubscriptionPlan
    from app.models.company_subscription import CompanySubscription
    from app.models.company_feature import CompanyFeature
    
    base_slug = re.sub(r'[^a-z0-9]+', '-', company_name.lower()).strip('-') or 'org'
    slug = base_slug
    counter = 1
    while Company.query.filter_by(slug=slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
        
    company = Company(name=company_name, slug=slug, email=email, is_active=True)
    db.session.add(company)
    db.session.flush()
    
    user = User(
        company_id=company.id,
        name=name,
        email=email,
        role='fleet_manager',
        is_active=True
    )
    user.set_password(password)
    db.session.add(user)
    db.session.flush()
    
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    plan = SubscriptionPlan.query.filter_by(slug='starter').first()
    if not plan:
        plan = SubscriptionPlan.query.filter_by(is_active=True).first()
    if not plan:
        plan = SubscriptionPlan(
            name="Starter Plan",
            slug="starter",
            price_monthly=49.0,
            price_yearly=470.0,
            limits={"user_limit": 5, "vehicle_limit": 5, "driver_limit": 5, "active_trips_limit": 10},
            features={"vehicles": True, "drivers": True, "trips": True, "maintenance": True, "fuel": True, "expenses": True, "dashboard": True, "analytics": True, "ai_chat": True, "exceptions": True},
            is_active=True
        )
        db.session.add(plan)
        db.session.flush()
        
    sub = CompanySubscription(
        company_id=company.id,
        plan_id=plan.id,
        status='active',
        current_period_start=now,
        current_period_end=now + timedelta(days=30)
    )
    db.session.add(sub)
        
    for f_key in ['vehicles', 'drivers', 'trips', 'maintenance', 'fuel', 'expenses', 'dashboard', 'analytics', 'ai_chat', 'exceptions']:
        db.session.add(CompanyFeature(company_id=company.id, feature_key=f_key, is_enabled=True))
        
    db.session.commit()
    
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'name': user.name, 'company_id': str(company.id)}
    )
    refresh_token = create_refresh_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'name': user.name, 'company_id': str(company.id)}
    )
    
    resp, code = success_response(
        data={
            "user": user.to_dict(),
            "company": company.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token
        },
        message="Company account created successfully",
        status_code=201
    )
    set_access_cookies(resp, access_token)
    set_refresh_cookies(resp, refresh_token)
    return resp, code