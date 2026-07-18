"""
schemas/driver.py — Marshmallow validation schemas for driver management

Schemas
-------
DriverSchema            Dump-only — serialise a Driver ORM object to JSON
CreateDriverSchema      POST /api/drivers
UpdateDriverSchema      PUT  /api/drivers/<id> — partial update, all optional

Field names match Driver model exactly:
    name, license_number, license_category, license_expiry,
    phone, safety_score, status
"""

from datetime import date as date_type

from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE

# ─── Allowed values ───────────────────────────────────────────────────────────
_LICENSE_CATEGORIES = [
    'LMV',    # Light Motor Vehicle
    'HMV',    # Heavy Motor Vehicle
    'HPMV',   # Heavy Passenger Motor Vehicle
    'HGMV',   # Heavy Goods Motor Vehicle
    'MGV',    # Medium Goods Vehicle
    'MCWG',   # Motor Cycle With Gear
    'MCWOG',  # Motor Cycle Without Gear
    'Other',
]

_DRIVER_STATUSES = [
    'Available', 'On Trip', 'Off Duty', 'Suspended', 'On Leave',
]


# ─────────────────────────────────────────────────────────────────────────────
class DriverSchema(Schema):
    """Read schema — used for serialising Driver objects in API responses.

    All fields are dump_only. Not used for load/input.
    """

    class Meta:
        unknown = EXCLUDE

    id                  = fields.UUID(dump_only=True)
    company_id          = fields.UUID(dump_only=True)
    name                = fields.String(dump_only=True)
    license_number      = fields.String(dump_only=True)
    license_category    = fields.String(dump_only=True)
    license_expiry      = fields.Date(dump_only=True)
    phone               = fields.String(dump_only=True)
    safety_score        = fields.Float(dump_only=True)
    status              = fields.String(dump_only=True)
    is_active           = fields.Boolean(dump_only=True)
    is_license_expired  = fields.Boolean(dump_only=True)
    days_until_expiry   = fields.Integer(dump_only=True)
    created_at          = fields.DateTime(dump_only=True)


# ─────────────────────────────────────────────────────────────────────────────
class CreateDriverSchema(Schema):
    """Input schema for registering a new driver.

    Required fields
    ---------------
    - name:             driver's full name, 2–100 chars
    - license_number:   unique driving licence number, 1–50 chars
    - license_category: must be one of the supported DL categories
    - license_expiry:   ISO date (YYYY-MM-DD), must be a future date
    - phone:            contact number, 7–20 chars

    Optional fields
    ---------------
    - safety_score: 0.00–100.00, default 100.00 (set by system as trips accumulate)
    - status:       one of the supported statuses, default 'Available'
    """

    class Meta:
        unknown = EXCLUDE

    # ── Required ──────────────────────────────────────────────────────────────
    name = fields.String(
        required=True,
        validate=validate.Length(
            min=2, max=100,
            error='Driver name must be between 2 and 100 characters.',
        ),
        error_messages={'required': "Driver's full name is required."},
    )
    license_number = fields.String(
        required=True,
        validate=validate.Length(
            min=1, max=50,
            error='Licence number must be between 1 and 50 characters.',
        ),
        error_messages={'required': 'Licence number is required.'},
    )
    license_category = fields.String(
        required=True,
        validate=validate.OneOf(
            _LICENSE_CATEGORIES,
            error=f'Licence category must be one of: {", ".join(_LICENSE_CATEGORIES)}',
        ),
        error_messages={'required': 'Licence category is required.'},
    )
    license_expiry = fields.Date(
        required=True,
        error_messages={
            'required': 'Licence expiry date is required.',
            'invalid':  'license_expiry must be a valid date in YYYY-MM-DD format.',
        },
    )
    phone = fields.String(
        required=True,
        validate=validate.Length(
            min=7, max=20,
            error='Phone number must be between 7 and 20 characters.',
        ),
        error_messages={'required': 'Phone number is required.'},
    )

    # ── Optional ──────────────────────────────────────────────────────────────
    safety_score = fields.Float(
        load_default=100.00,
        validate=validate.Range(
            min=0.0, max=100.0,
            error='Safety score must be between 0 and 100.',
        ),
    )
    status = fields.String(
        load_default='Available',
        validate=validate.OneOf(
            _DRIVER_STATUSES,
            error=f'Status must be one of: {", ".join(_DRIVER_STATUSES)}',
        ),
    )

    # ── Field-level validators ─────────────────────────────────────────────────
    @validates('license_expiry')
    def must_be_future_date(self, value, **kwargs):
        """Licence expiry must be today or a future date.

        A driver with an already-expired licence should NOT be registered
        as active. The route can enforce a separate 'renew' workflow.
        """
        if value is None:
            return value
        if value < date_type.today():
            raise ValidationError(
                'Licence expiry date must be today or a future date. '
                'Cannot register a driver with an expired licence.'
            )
        return value

    @validates('name')
    def strip_name(self, value, **kwargs):
        stripped = value.strip()
        if not stripped:
            raise ValidationError('Driver name cannot be blank.')
        return stripped

    @validates('license_number')
    def normalise_license_number(self, value, **kwargs):
        """Strip whitespace and uppercase for consistent storage."""
        normalised = value.strip().upper()
        if not normalised:
            raise ValidationError('Licence number cannot be blank.')
        return normalised

    @validates('phone')
    def strip_phone(self, value, **kwargs):
        stripped = value.strip()
        if not stripped:
            raise ValidationError('Phone number cannot be blank.')
        return stripped


# ─────────────────────────────────────────────────────────────────────────────
class UpdateDriverSchema(Schema):
    """Input schema for updating an existing driver (partial update).

    All fields are optional — only submitted fields are changed.

    Fields that cannot be changed after creation (enforced at route layer):
        - license_number (unique identifier — changing requires re-registration)
    """

    class Meta:
        unknown = EXCLUDE

    name = fields.String(
        load_default=None,
        validate=validate.Length(
            min=2, max=100,
            error='Driver name must be between 2 and 100 characters.',
        ),
    )
    license_category = fields.String(
        load_default=None,
        validate=validate.OneOf(
            _LICENSE_CATEGORIES,
            error=f'Licence category must be one of: {", ".join(_LICENSE_CATEGORIES)}',
        ),
    )
    license_expiry = fields.Date(
        load_default=None,
        error_messages={'invalid': 'license_expiry must be a valid date in YYYY-MM-DD format.'},
    )
    phone = fields.String(
        load_default=None,
        validate=validate.Length(
            min=7, max=20,
            error='Phone number must be between 7 and 20 characters.',
        ),
    )
    safety_score = fields.Float(
        load_default=None,
        validate=validate.Range(
            min=0.0, max=100.0,
            error='Safety score must be between 0 and 100.',
        ),
    )
    status = fields.String(
        load_default=None,
        validate=validate.OneOf(
            _DRIVER_STATUSES,
            error=f'Status must be one of: {", ".join(_DRIVER_STATUSES)}',
        ),
    )
    is_active = fields.Boolean(load_default=None)

    @validates('license_expiry')
    def must_be_future_date(self, value, **kwargs):
        """When updating the expiry, the new date must still be in the future."""
        if value is None:
            return value
        if value < date_type.today():
            raise ValidationError(
                'Updated licence expiry date must be today or a future date.'
            )
        return value

    @validates('name')
    def strip_name(self, value, **kwargs):
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValidationError('Driver name cannot be blank.')
        return stripped

    @validates('phone')
    def strip_phone(self, value, **kwargs):
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValidationError('Phone number cannot be blank.')
        return stripped
