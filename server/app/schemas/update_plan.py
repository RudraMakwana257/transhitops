from marshmallow import Schema, fields, validate, validates, EXCLUDE

class UpdatePlanSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.String(
        validate=validate.Length(min=2, max=100, error='Plan name must be between 2 and 100 characters.')
    )
    slug = fields.String(
        validate=validate.Regexp(
            r'^[a-z0-9]+(?:-[a-z0-9]+)*$',
            error='Slug must be lowercase letters, numbers, and hyphens only.'
        )
    )
    price_monthly = fields.Float(
        validate=validate.Range(min=0.0, error='price_monthly must be 0 or greater.')
    )
    price_yearly = fields.Float(
        validate=validate.Range(min=0.0, error='price_yearly must be 0 or greater.')
    )
    features  = fields.Dict()
    limits    = fields.Dict()
    is_active = fields.Boolean()

    @validates('slug')
    def normalise_slug(self, value, **kwargs):
        return value.strip().lower()
