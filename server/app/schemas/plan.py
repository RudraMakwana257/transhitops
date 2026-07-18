"""
schemas/plan.py — Marshmallow validation schemas for subscription plans

Schemas
-------
PlanSchema              Dump-only — serialise a SubscriptionPlan ORM object to JSON
CreatePlanSchema        POST /api/admin/plans
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE


class PlanSchema(Schema):
    """Read schema — used for serialising SubscriptionPlan objects in API responses.

    All fields are dump_only.
    """

    class Meta:
        unknown = EXCLUDE

    id            = fields.UUID(dump_only=True)
    name          = fields.String(dump_only=True)
    slug          = fields.String(dump_only=True)
    price_monthly = fields.Float(dump_only=True)
    price_yearly  = fields.Float(dump_only=True)
    features      = fields.Dict(dump_only=True)
    limits        = fields.Dict(dump_only=True)
    is_active     = fields.Boolean(dump_only=True)
    created_at    = fields.DateTime(dump_only=True)
    updated_at    = fields.DateTime(dump_only=True)


class CreatePlanSchema(Schema):
    """Input schema for creating a subscription plan (super_admin only).

    Required fields
    ---------------
    - name: name of the plan
    - slug: unique url-friendly identifier
    - price_monthly: monthly price, >= 0
    - price_yearly: yearly price, >= 0

    Optional fields
    ---------------
    - features: dictionary of features and their enablement (Boolean values)
    - limits: dictionary of limit configurations
    - is_active: default True
    """

    class Meta:
        unknown = EXCLUDE

    name = fields.String(
        required=True,
        validate=validate.Length(min=2, max=100, error='Plan name must be between 2 and 100 characters.'),
        error_messages={'required': 'Plan name is required.'}
    )
    slug = fields.String(
        required=True,
        validate=validate.Regexp(
            r'^[a-z0-9]+(?:-[a-z0-9]+)*$',
            error='Slug must be lowercase letters, numbers, and hyphens only.'
        ),
        error_messages={'required': 'Slug is required.'}
    )
    price_monthly = fields.Float(
        required=True,
        validate=validate.Range(min=0.0, error='price_monthly must be 0 or greater.'),
        error_messages={'required': 'price_monthly is required.'}
    )
    price_yearly = fields.Float(
        required=True,
        validate=validate.Range(min=0.0, error='price_yearly must be 0 or greater.'),
        error_messages={'required': 'price_yearly is required.'}
    )
    features  = fields.Dict(load_default=dict)
    limits    = fields.Dict(load_default=dict)
    is_active = fields.Boolean(load_default=True)

    @validates('slug')
    def normalise_slug(self, value, **kwargs):
        return value.strip().lower()

class UpdatePlanSchema(Schema):
    """Input schema for updating a subscription plan. All fields optional."""
    class Meta:
        unknown = EXCLUDE

    name = fields.String(validate=validate.Length(min=2, max=100))
    slug = fields.String(validate=validate.Regexp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$'))
    price_monthly = fields.Float(validate=validate.Range(min=0.0))
    price_yearly = fields.Float(validate=validate.Range(min=0.0))
    features  = fields.Dict()
    limits    = fields.Dict()
    is_active = fields.Boolean()

    @validates('slug')
    def normalise_slug(self, value, **kwargs):
        return value.strip().lower()
