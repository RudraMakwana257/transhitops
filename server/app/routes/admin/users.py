import secrets
import string
from flask import request, jsonify
from app import db
from app.models.company import Company
from app.models.user import User
from app.middleware.rbac import require_roles
from app.schemas import CreateUserSchema, validate_request
from app.services.email_service import send_welcome_email

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

@bp.route('/companies/<uuid:id>/users', methods=['POST'])
@require_roles('super_admin')
def create_company_admin(id):
    company = Company.query.get_or_404(id)
    
    payload = request.get_json() or {}
    
    # Auto-generate password if not provided
    generated_password = None
    if 'password' not in payload:
        generated_password = generate_temp_password()
        payload['password'] = generated_password
        
    payload['role'] = 'fleet_manager'
        
    data = validate_request(CreateUserSchema, data=payload)
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"success": False, "message": "User with this email already exists"}), 400

    user = User(
        company_id=company.id,
        name=data['name'],
        email=data['email'],
        role='fleet_manager',  # Force role for company admin
        is_active=data.get('is_active', True)
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    
    send_welcome_email(
        to_email=user.email,
        user_name=user.name,
        company_name=company.name,
        temporary_password=generated_password or data['password']
    )
    
    response_data = user.to_dict()
    
    return jsonify({
        "success": True, 
        "data": {
            "user": response_data,
            "temporary_password": generated_password or data['password']
        },
        "message": "Company admin user created successfully. Email sent if SMTP configured."
    }), 201
