import secrets
import string
import uuid
from flask import request, jsonify
from sqlalchemy import or_
from app import db
from app.models.company import Company
from app.models.user import User
from app.middleware.rbac import require_roles

from . import bp

def generate_temp_password(length=12):
    specials = "!@#$%^&*"
    chars = string.ascii_letters + string.digits
    pwd = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(specials)
    ]
    pwd += [secrets.choice(chars + specials) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(pwd)
    return ''.join(pwd)

@bp.route('/users', methods=['GET'])
@require_roles('super_admin')
def list_all_users():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    search = request.args.get('search', '').strip()
    company_id = request.args.get('company_id')
    role = request.args.get('role')
    is_active = request.args.get('is_active')

    query = User.query

    if search:
        query = query.filter(or_(
            User.name.ilike(f'%{search}%'),
            User.email.ilike(f'%{search}%')
        ))
    
    if company_id:
        try:
            cid = uuid.UUID(company_id)
            query = query.filter(User.company_id == cid)
        except ValueError:
            pass

    if role:
        query = query.filter(User.role == role)

    if is_active is not None and is_active != '':
        query = query.filter(User.is_active == (is_active.lower() == 'true'))

    pagination = query.order_by(User.created_at.desc()).paginate(page=page, per_page=page_size, error_out=False)

    users_data = []
    for u in pagination.items:
        u_dict = u.to_dict()
        if u.company_id:
            c = Company.query.get(u.company_id)
            u_dict['company_name'] = c.name if c else 'Unknown'
        else:
            u_dict['company_name'] = 'Platform (Super Admin)'
        users_data.append(u_dict)

    return jsonify({
        "success": True,
        "data": {
            "items": users_data,
            "total": pagination.total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination.pages
        }
    })

@bp.route('/users', methods=['POST'])
@require_roles('super_admin')
def create_user():
    payload = request.get_json() or {}
    name = payload.get('name', '').strip()
    email = payload.get('email', '').strip().lower()
    role = payload.get('role', 'fleet_manager')
    password = payload.get('password')
    company_id = payload.get('company_id')
    is_active = payload.get('is_active', True)

    if not name or not email:
        return jsonify({"success": False, "message": "Name and email are required"}), 400

    if User.query.filter(User.email.ilike(email)).first():
        return jsonify({"success": False, "message": "User with this email already exists"}), 400

    parsed_cid = None
    if company_id and role != 'super_admin':
        try:
            parsed_cid = uuid.UUID(company_id)
            comp = Company.query.get(parsed_cid)
            if not comp:
                return jsonify({"success": False, "message": "Company not found"}), 404
        except ValueError:
            return jsonify({"success": False, "message": "Invalid company ID format"}), 400

    generated_password = None
    if not password:
        generated_password = generate_temp_password()
        password = generated_password

    user = User(
        name=name,
        email=email,
        role=role,
        company_id=parsed_cid if role != 'super_admin' else None,
        is_active=is_active
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    u_dict = user.to_dict()
    if user.company_id:
        c = Company.query.get(user.company_id)
        u_dict['company_name'] = c.name if c else 'Unknown'
    else:
        u_dict['company_name'] = 'Platform (Super Admin)'

    return jsonify({
        "success": True,
        "data": {
            "user": u_dict,
            "temporary_password": generated_password or password
        },
        "message": "User created successfully"
    }), 201

@bp.route('/users/<uuid:user_id>', methods=['GET'])
@require_roles('super_admin')
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    u_dict = user.to_dict()
    if user.company_id:
        c = Company.query.get(user.company_id)
        u_dict['company_name'] = c.name if c else 'Unknown'
    else:
        u_dict['company_name'] = 'Platform (Super Admin)'
    return jsonify({"success": True, "data": u_dict})

@bp.route('/users/<uuid:user_id>', methods=['PUT'])
@require_roles('super_admin')
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    payload = request.get_json() or {}

    if 'name' in payload and payload['name']:
        user.name = payload['name'].strip()

    if 'email' in payload and payload['email']:
        email = payload['email'].strip().lower()
        existing = User.query.filter(User.email.ilike(email), User.id != user_id).first()
        if existing:
            return jsonify({"success": False, "message": "Email already in use"}), 409
        user.email = email

    if 'role' in payload and payload['role']:
        user.role = payload['role']

    if 'is_active' in payload:
        user.is_active = bool(payload['is_active'])

    if 'company_id' in payload:
        if payload['company_id']:
            try:
                cid = uuid.UUID(payload['company_id'])
                comp = Company.query.get(cid)
                if not comp:
                    return jsonify({"success": False, "message": "Company not found"}), 404
                user.company_id = cid
            except ValueError:
                return jsonify({"success": False, "message": "Invalid company ID"}), 400
        else:
            user.company_id = None

    db.session.commit()
    u_dict = user.to_dict()
    if user.company_id:
        c = Company.query.get(user.company_id)
        u_dict['company_name'] = c.name if c else 'Unknown'
    else:
        u_dict['company_name'] = 'Platform (Super Admin)'

    return jsonify({"success": True, "data": u_dict, "message": "User updated successfully"})

@bp.route('/users/<uuid:user_id>/reset-password', methods=['POST'])
@require_roles('super_admin')
def reset_user_password(user_id):
    user = User.query.get_or_404(user_id)
    payload = request.get_json() or {}
    password = payload.get('password')

    if not password:
        password = generate_temp_password()

    user.set_password(password)
    user.failed_login_count = 0
    user.locked_until = None
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {
            "user_id": str(user.id),
            "email": user.email,
            "temporary_password": password
        },
        "message": "Password reset successfully"
    })

@bp.route('/users/<uuid:user_id>', methods=['DELETE'])
@require_roles('super_admin')
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    # Check if deleting own account
    # We can allow deletion or deactivate
    db.session.delete(user)
    db.session.commit()
    return jsonify({"success": True, "message": "User deleted successfully"})

@bp.route('/companies/<uuid:id>/users', methods=['POST'])
@require_roles('super_admin')
def create_company_admin(id):
    company = Company.query.get_or_404(id)
    payload = request.get_json() or {}
    
    first_name = payload.get('first_name', '')
    last_name = payload.get('last_name', '')
    name = f"{first_name} {last_name}".strip() or payload.get('name', 'Admin')
    email = payload.get('email', '').strip().lower()
    
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    if User.query.filter(User.email.ilike(email)).first():
        return jsonify({"success": False, "message": "User with this email already exists"}), 400

    generated_password = payload.get('password') or generate_temp_password()

    user = User(
        company_id=company.id,
        name=name,
        email=email,
        role='fleet_manager',
        is_active=payload.get('is_active', True)
    )
    user.set_password(generated_password)
    db.session.add(user)
    db.session.commit()
    
    from app.services.email_service import send_welcome_email
    send_welcome_email(
        to_email=user.email,
        user_name=user.name,
        company_name=company.name,
        temporary_password=generated_password
    )

    return jsonify({
        "success": True, 
        "data": {
            "user": user.to_dict(),
            "temporary_password": generated_password
        },
        "message": "Company admin user created successfully. Email sent if SMTP configured."
    }), 201
