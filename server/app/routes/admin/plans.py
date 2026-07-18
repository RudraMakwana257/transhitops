from datetime import datetime, timedelta
from flask import request, jsonify
from app import db
from app.models.subscription_plan import SubscriptionPlan
from app.models.company_subscription import CompanySubscription
from app.models.company import Company
from app.middleware.rbac import require_roles
from app.schemas import CreatePlanSchema, UpdatePlanSchema, validate_request

from . import bp

@bp.route('/plans', methods=['GET'])
@require_roles('super_admin')
def list_plans():
    plans = SubscriptionPlan.query.order_by(SubscriptionPlan.price_monthly.asc()).all()
    return jsonify({
        "success": True,
        "data": [p.to_dict() for p in plans]
    })

@bp.route('/plans', methods=['POST'])
@require_roles('super_admin')
def create_plan():
    data = validate_request(CreatePlanSchema)
    
    if SubscriptionPlan.query.filter_by(slug=data['slug']).first():
        return jsonify({"success": False, "message": "Plan slug already exists"}), 400

    plan = SubscriptionPlan(
        name=data['name'],
        slug=data['slug'],
        price_monthly=data['price_monthly'],
        price_yearly=data['price_yearly'],
        features=data.get('features', {}),
        limits=data.get('limits', {}),
        is_active=data.get('is_active', True)
    )
    db.session.add(plan)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "data": plan.to_dict(),
        "message": "Plan created successfully"
    }), 201

@bp.route('/plans/<id>', methods=['PUT'])
@require_roles('super_admin')
def update_plan(id):
    plan = SubscriptionPlan.query.get_or_404(id)
    data = validate_request(UpdatePlanSchema)
    
    if 'slug' in data and data['slug'] != plan.slug:
        if SubscriptionPlan.query.filter_by(slug=data['slug']).first():
            return jsonify({"success": False, "message": "Plan slug already exists"}), 400

    for field in ['name', 'slug', 'price_monthly', 'price_yearly', 'features', 'limits', 'is_active']:
        if field in data and data[field] is not None:
            setattr(plan, field, data[field])
            
    db.session.commit()
    return jsonify({"success": True, "data": plan.to_dict(), "message": "Plan updated successfully"})

@bp.route('/plans/<id>/assign/<company_id>', methods=['POST'])
@require_roles('super_admin')
def assign_plan(id, company_id):
    plan = SubscriptionPlan.query.get_or_404(id)
    company = Company.query.get_or_404(company_id)
    
    sub = CompanySubscription.query.filter_by(company_id=company.id).first()
    
    now = datetime.utcnow()
    end_date = now + timedelta(days=30)
    
    if not sub:
        sub = CompanySubscription(
            company_id=company.id,
            plan_id=plan.id,
            status='active',
            current_period_start=now,
            current_period_end=end_date
        )
        db.session.add(sub)
    else:
        sub.plan_id = plan.id
        sub.status = 'active'
        sub.current_period_start = now
        sub.current_period_end = end_date
        
    db.session.commit()
    
    return jsonify({
        "success": True,
        "data": sub.to_dict(),
        "message": f"Plan '{plan.name}' assigned to company '{company.name}' successfully"
    })
