"""
schemas/vehicle.py — Marshmallow validation schemas for vehicle management

Schemas
-------
VehicleSchema           Dump-only — serialise a Vehicle ORM object to JSON
CreateVehicleSchema     POST /api/vehicles
UpdateVehicleSchema     PUT  /api/vehicles/<id> — partial update, all optional

Field names match Vehicle model exactly:
    reg_number, name, type, capacity_kg, acquisition_cost,
    odometer_km, purchase_date, status, region
"""

from datetime import date as date_type

from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE

# ─── Allowed values ───────────────────────────────────────────────────────────
_VEHICLE_TYPES = [
    'Truck', 'Van', 'Pickup', 'Tanker', 'Bus', 'Trailer',
    'Mini Truck', 'Container', 'Tipper', 'Refrigerated', 'Other',
]

_VEHICLE_STATUSES = [
    'Available', 'On Trip', 'In Shop', 'Retired', 'Reserved',
]

_PURCHASE_YEAR_MIN = 1900
_PURCHASE_YEAR_MAX = 2030


# ─────────────────────────────────────────────────────────────────────────────
class VehicleSchema(Schema):
    """Read schema — used for serialising Vehicle objects in API responses.

    All fields are dump_only. Not used for load/input.
    """

    class Meta:
        unknown = EXCLUDE

    id               = fields.UUID(dump_only=True)
    company_id       = fields.UUID(dump_only=True)
    reg_number       = fields.String(dump_only=True)
    name             = fields.String(dump_only=True)
    type             = fields.String(dump_only=True)
    capacity_kg      = fields.Float(dump_only=True)
    acquisition_cost = fields.Float(dump_only=True)
    odometer_km      = fields.Float(dump_only=True)
    purchase_date    = fields.Date(dump_only=True)
    status           = fields.String(dump_only=True)
    region           = fields.String(dump_only=True)
    is_active        = fields.Boolean(dump_only=True)
    health_score     = fields.Float(dump_only=True)
    health_grade     = fields.String(dump_only=True)
    created_at       = fields.DateTime(dump_only=True)
    updated_at       = fields.DateTime(dump_only=True)


# ─────────────────────────────────────────────────────────────────────────────
class CreateVehicleSchema(Schema):
    """Input schema for registering a new vehicle.

    Required fields
    ---------------
    - reg_number:       registration / plate number (unique per company)
    - name:             human-readable vehicle name / alias
    - type:             must be one of the supported vehicle types
    - capacity_kg:      payload capacity in kg, must be > 0
    - acquisition_cost: purchase cost in local currency, must be ≥ 0

    Optional fields
    ---------------
    - odometer_km:   current odometer reading, must be ≥ 0 (default 0)
    - purchase_date: ISO date (YYYY-MM-DD), year must be 1900–2030
    - status:        must be one of the supported statuses (default 'Available')
    - region:        operating region / depot location, max 100 chars
    """

    class Meta:
        unknown = EXCLUDE

    # ── Required ──────────────────────────────────────────────────────────────
    reg_number = fields.String(
        required=True,
        validate=validate.Length(
            min=1, max=20,
            error='Registration number must be between 1 and 20 characters.',
        ),
        error_messages={'required': 'Registration number is required.'},
    )
    name = fields.String(
        required=True,
        validate=validate.Length(
            min=1, max=100,
            error='Vehicle name must be between 1 and 100 characters.',
        ),
        error_messages={'required': 'Vehicle name is required.'},
    )
    type = fields.String(
        required=True,
        validate=validate.OneOf(
            _VEHICLE_TYPES,
            error=f'Vehicle type must be one of: {", ".join(_VEHICLE_TYPES)}',
        ),
        error_messages={'required': 'Vehicle type is required.'},
    )
    capacity_kg = fields.Float(
        required=True,
        validate=validate.Range(
            min=0.01,
            error='Capacity must be greater than 0 kg.',
        ),
        error_messages={'required': 'Capacity (kg) is required.'},
    )
    acquisition_cost = fields.Float(
        required=True,
        validate=validate.Range(
            min=0,
            error='Acquisition cost must be 0 or greater.',
        ),
        error_messages={'required': 'Acquisition cost is required.'},
    )

    # ── Optional ──────────────────────────────────────────────────────────────
    odometer_km = fields.Float(
        load_default=0,
        validate=validate.Range(
            min=0,
            error='Odometer reading must be 0 or greater.',
        ),
    )
    purchase_date = fields.Date(
        load_default=None,
        error_messages={'invalid': 'purchase_date must be a valid date in YYYY-MM-DD format.'},
    )
    status = fields.String(
        load_default='Available',
        validate=validate.OneOf(
            _VEHICLE_STATUSES,
            error=f'Status must be one of: {", ".join(_VEHICLE_STATUSES)}',
        ),
    )
    region = fields.String(
        load_default=None,
        validate=validate.Length(max=100, error='Region must be 100 characters or fewer.'),
    )

    # ── Cross-field validators ─────────────────────────────────────────────────
    @validates('reg_number')
    def normalise_reg_number(self, value, **kwargs):
        """Strip whitespace and uppercase the plate number for consistency."""
        normalised = value.strip().upper()
        if not normalised:
            raise ValidationError('Registration number cannot be blank.')
        return normalised

    @validates('purchase_date')
    def validate_purchase_year(self, value, **kwargs):
        """Purchase year must be within 1900–2030."""
        if value is None:
            return value
        if not (_PURCHASE_YEAR_MIN <= value.year <= _PURCHASE_YEAR_MAX):
            raise ValidationError(
                f'Purchase date year must be between {_PURCHASE_YEAR_MIN} and {_PURCHASE_YEAR_MAX}.'
            )
        return value

    @validates('name')
    def strip_name(self, value, **kwargs):
        stripped = value.strip()
        if not stripped:
            raise ValidationError('Vehicle name cannot be blank.')
        return stripped


# ─────────────────────────────────────────────────────────────────────────────
class UpdateVehicleSchema(Schema):
    """Input schema for updating an existing vehicle (partial update).

    All fields are optional — only submitted fields are changed.
    The route applies only keys where the value is not None.

    Fields that cannot be changed after creation (enforced at route layer):
        - reg_number (unique identifier — changing would break audit trail)
        - company_id (never changes)
    """

    class Meta:
        unknown = EXCLUDE

    name = fields.String(
        load_default=None,
        validate=validate.Length(
            min=1, max=100,
            error='Vehicle name must be between 1 and 100 characters.',
        ),
    )
    type = fields.String(
        load_default=None,
        validate=validate.OneOf(
            _VEHICLE_TYPES,
            error=f'Vehicle type must be one of: {", ".join(_VEHICLE_TYPES)}',
        ),
    )
    capacity_kg = fields.Float(
        load_default=None,
        validate=validate.Range(min=0.01, error='Capacity must be greater than 0 kg.'),
    )
    acquisition_cost = fields.Float(
        load_default=None,
        validate=validate.Range(min=0, error='Acquisition cost must be 0 or greater.'),
    )
    odometer_km = fields.Float(
        load_default=None,
        validate=validate.Range(min=0, error='Odometer reading must be 0 or greater.'),
    )
    purchase_date = fields.Date(
        load_default=None,
        error_messages={'invalid': 'purchase_date must be a valid date in YYYY-MM-DD format.'},
    )
    status = fields.String(
        load_default=None,
        validate=validate.OneOf(
            _VEHICLE_STATUSES,
            error=f'Status must be one of: {", ".join(_VEHICLE_STATUSES)}',
        ),
    )
    region = fields.String(
        load_default=None,
        validate=validate.Length(max=100, error='Region must be 100 characters or fewer.'),
    )
    is_active = fields.Boolean(load_default=None)

    @validates('purchase_date')
    def validate_purchase_year(self, value, **kwargs):
        if value is None:
            return value
        if not (_PURCHASE_YEAR_MIN <= value.year <= _PURCHASE_YEAR_MAX):
            raise ValidationError(
                f'Purchase date year must be between {_PURCHASE_YEAR_MIN} and {_PURCHASE_YEAR_MAX}.'
            )
        return value

    @validates('name')
    def strip_name(self, value, **kwargs):
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValidationError('Vehicle name cannot be blank.')
        return stripped
