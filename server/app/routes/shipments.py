import uuid
from flask import Blueprint, request, g
from app import db
from app.models.shipment import Shipment
from app.models.shipment_item import ShipmentItem
from app.models.customer import Customer
from app.models.trip import Trip
from app.middleware import require_roles, require_company
from app.utils.response import success_response, error_response

bp = Blueprint('shipments', __name__, url_prefix='/api/shipments')

@bp.route('', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
@require_company
def get_shipments():
    page = request.args.get('page', type=int)
    page_size = request.args.get('page_size', type=int)

    query = Shipment.query.filter_by(company_id=g.company_id)
    if page or page_size:
        p_size = min(max(1, page_size or 20), 100)
        p_num = max(1, page or 1)
        pagination = query.paginate(page=p_num, per_page=p_size, error_out=False)
        return success_response(data={
            "items": [s.to_dict(include_items=True) for s in pagination.items],
            "total": pagination.total,
            "page": pagination.page,
            "page_size": pagination.per_page,
            "pages": pagination.pages
        })

    shipments = query.all()
    return success_response(data=[s.to_dict(include_items=True) for s in shipments])

@bp.route('', methods=['POST'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
def create_shipment():
    data = request.get_json() or {}
    cust_id = data.get('customer_id')
    orig = (data.get('origin') or '').strip()
    dest = (data.get('destination') or '').strip()
    
    if not cust_id or not orig or not dest:
        return error_response(message="customer_id, origin, and destination are required", status_code=400)

    customer = Customer.query.filter_by(id=cust_id, company_id=g.company_id).first()
    if not customer:
        return error_response(message="Customer not found", status_code=404)

    tracking_no = data.get('tracking_number') or f"SHP-{uuid.uuid4().hex[:8].upper()}"

    shipment = Shipment(
        company_id=g.company_id,
        customer_id=customer.id,
        tracking_number=tracking_no,
        origin=orig,
        destination=dest,
        weight_kg=float(data.get('weight_kg', 0)),
        status=data.get('status', 'Pending')
    )
    db.session.add(shipment)
    db.session.flush()

    items_data = data.get('items', [])
    for item in items_data:
        s_item = ShipmentItem(
            shipment_id=shipment.id,
            description=item.get('description', 'Cargo Item'),
            quantity=int(item.get('quantity', 1)),
            weight_kg=float(item.get('weight_kg', 0))
        )
        db.session.add(s_item)

    db.session.commit()
    return success_response(data=shipment.to_dict(include_items=True), message="Shipment created successfully", status_code=201)

@bp.route('/<id>', methods=['GET'])
@require_roles('fleet_manager', 'dispatcher', 'financial_analyst')
@require_company
def get_shipment(id):
    shipment = Shipment.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    return success_response(data=shipment.to_dict(include_items=True))

@bp.route('/<id>', methods=['PUT', 'PATCH'])
@require_roles('fleet_manager', 'dispatcher')
@require_company
def update_shipment(id):
    shipment = Shipment.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    data = request.get_json() or {}

    if 'status' in data:
        shipment.status = data['status']
    if 'trip_id' in data:
        trip_id = data.get('trip_id')
        if trip_id:
            trip = Trip.query.filter_by(id=trip_id, company_id=g.company_id).first()
            if not trip:
                return error_response(message="Trip not found", status_code=404)
            shipment.trip_id = trip.id
        else:
            shipment.trip_id = None
    if 'weight_kg' in data:
        shipment.weight_kg = float(data['weight_kg'])

    db.session.commit()
    return success_response(data=shipment.to_dict(include_items=True), message="Shipment updated successfully")

@bp.route('/<id>', methods=['DELETE'])
@require_roles('fleet_manager')
@require_company
def delete_shipment(id):
    shipment = Shipment.query.filter_by(id=id, company_id=g.company_id).first_or_404()
    shipment.status = 'Cancelled'
    db.session.commit()
    return success_response(message="Shipment cancelled successfully")
