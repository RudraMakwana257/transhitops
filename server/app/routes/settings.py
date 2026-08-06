from flask import Blueprint, request, jsonify, g
from app import db
from app.models.user import User
from app.middleware import require_roles, require_company
from app.utils.response import success_response, error_response

from app.schemas import (
    UserSchema,
    CreateUserSchema,
    UpdateUserSchema,
    validate_request,
)

bp = Blueprint('settings', __name__, url_prefix='/api/settings')

from app.middleware.rate_limiter import limiter, GENERAL_LIMIT
@bp.before_request
@limiter.limit(GENERAL_LIMIT)
def general_limit():
    pass

@bp.route('/users', methods=['GET'])
@require_roles('fleet_manager')
@require_company
def list_users():
    query = User.query
    if g.company_id is not None:
        query = query.filter_by(company_id=g.company_id)
    users = query.order_by(User.created_at.desc()).all()
    return success_response(data=[u.to_dict() for u in users])

@bp.route('/users', methods=['POST'])
@require_roles('fleet_manager')
@require_company
def create_user():
    data = validate_request(CreateUserSchema)
    email = data['email']
    
    if User.query.filter_by(email=email).first():
        return error_response(message="Email already in use", status_code=409)
    
    user = User(
        company_id=g.company_id,
        name=data['name'],
        email=email,
        role=data['role'],
        is_active=data.get('is_active', True)
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    
    return success_response(
        data=user.to_dict(),
        message="User created",
        status_code=201
    )

@bp.route('/users/<id>', methods=['PUT'])
@require_roles('fleet_manager')
@require_company
def update_user(id):
    user = User.query.get_or_404(id)
    if g.company_id is not None and user.company_id != g.company_id:
        return error_response(message="Resource not found", status_code=404)
        
    data = validate_request(UpdateUserSchema)
    
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    is_active = data.get('is_active')
    
    if name is not None:
        user.name = name
    if email is not None:
        existing = User.query.filter(User.email == email, User.id != id).first()
        if existing:
            return error_response(message="Email already in use", status_code=409)
        user.email = email
    if password is not None:
        user.set_password(password)
    if role is not None:
        user.role = role
    if is_active is not None:
        user.is_active = is_active
    
    db.session.commit()
    return success_response(data=user.to_dict(), message="User updated")

@bp.route('/users/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
@require_company
def deactivate_user(id):
    user = User.query.get_or_404(id)
    if g.company_id is not None and user.company_id != g.company_id:
        return error_response(message="Resource not found", status_code=404)
    user.is_active = False
    db.session.commit()
    return success_response(message="User deactivated")
