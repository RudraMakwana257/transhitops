from flask import Blueprint, request, g
from app import db
from app.models.customer import Customer
from app.middleware import require_roles, require_company
from app.utils.response import success_response, error_response

bp = Blueprint('customers', __name__, url_prefix='/api/customers')

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
@require_company
def get_customers():
    page = request.args.get('page', type=int)
    page_size = request.args.get('page_size', type=int)

    query = Customer.query.filter_by(company_id=g.company_id, is_active=True)
    if page or page_size:
        p_size = min(max(1, page_size or 20), 100)
        p_num = max(1, page or 1)
        pagination = query.paginate(page=p_num, per_page=p_size, error_out=False)
        return success_response(data={
            "items": [c.to_dict() for c in pagination.items],
            "total": pagination.total,
            "page": pagination.page,
            "page_size": pagination.per_page,
            "pages": pagination.pages
        })

    customers = query.all()
    return success_response(data=[c.to_dict() for c in customers])

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
def create_customer():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return error_response(message="Customer name is required", status_code=400)

    customer = Customer(
        company_id=g.company_id,
        name=name,
        email=data.get('email'),
        phone=data.get('phone'),
        address=data.get('address'),
        billing_details=data.get('billing_details', {})
    )
    db.session.add(customer)
    db.session.commit()
    return success_response(data=customer.to_dict(), message="Customer created successfully", status_code=201)

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
@require_company
def get_customer(id):
    customer = Customer.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    return success_response(data=customer.to_dict())

@bp.route('/<id>', methods=['PUT', 'PATCH'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
def update_customer(id):
    customer = Customer.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = request.get_json() or {}
    
    if 'name' in data and data['name'].strip():
        customer.name = data['name'].strip()
    if 'email' in data:
        customer.email = data['email']
    if 'phone' in data:
        customer.phone = data['phone']
    if 'address' in data:
        customer.address = data['address']
    if 'billing_details' in data:
        customer.billing_details = data['billing_details']

    db.session.commit()
    return success_response(data=customer.to_dict(), message="Customer updated successfully")

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
@require_company
def delete_customer(id):
    customer = Customer.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    customer.is_active = False
    db.session.commit()
    return success_response(message="Customer deactivated successfully")
