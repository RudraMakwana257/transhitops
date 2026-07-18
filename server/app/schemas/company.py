"""
schemas/company.py — Marshmallow validation schemas for company management

Schemas
-------
CompanySchema           Dump-only — serialise a Company ORM object to JSON
CreateCompanySchema     POST /api/admin/companies — super_admin creates a company
UpdateCompanySchema     PUT  /api/admin/companies/<id> — partial update, all fields optional
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE


# ─── Allowed values ───────────────────────────────────────────────────────────
_TIMEZONES = [
    'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'America/New_York', 'America/Chicago', 'America/Los_Angeles',
    'America/Sao_Paulo', 'UTC',
]

_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'BRL', 'AUD', 'CAD']
_LANGUAGES  = ['en', 'hi', 'ar', 'fr', 'de', 'es', 'pt', 'ja', 'zh']


# ─────────────────────────────────────────────────────────────────────────────
class CompanySchema(Schema):
    """Read schema — used for serialising Company objects in API responses.

    All fields are dump_only. This schema is never used for load/input.
    """

    class Meta:
        unknown = EXCLUDE

    id            = fields.UUID(dump_only=True)
    name          = fields.String(dump_only=True)
    slug          = fields.String(dump_only=True)
    domain        = fields.String(dump_only=True)
    logo_url      = fields.String(dump_only=True)
    address       = fields.String(dump_only=True)
    gst_number    = fields.String(dump_only=True)
    phone         = fields.String(dump_only=True)
    email         = fields.Email(dump_only=True)
    timezone      = fields.String(dump_only=True)
    language      = fields.String(dump_only=True)
    currency      = fields.String(dump_only=True)
    is_active     = fields.Boolean(dump_only=True)
    trial_ends_at = fields.DateTime(dump_only=True)
    vehicle_limit = fields.Integer(dump_only=True)
    driver_limit  = fields.Integer(dump_only=True)
    user_limit    = fields.Integer(dump_only=True)
    storage_used  = fields.Float(dump_only=True)
    settings      = fields.Dict(dump_only=True)
    created_at    = fields.DateTime(dump_only=True)
    updated_at    = fields.DateTime(dump_only=True)


# ─────────────────────────────────────────────────────────────────────────────
class CreateCompanySchema(Schema):
    """Input schema for creating a new company (super_admin only).

    Required fields
    ---------------
    - name:  company display name, 2–150 chars
    - email: must be valid email format

    Optional fields (sensible defaults applied at ORM level)
    --------------------------------------------------------
    - slug:          URL-safe identifier; auto-generated from name if omitted
    - domain:        company domain for SSO or white-labelling
    - logo_url:      max 500 chars
    - address:       free-text postal address
    - gst_number:    GST / VAT / tax registration number, max 50 chars
    - phone:         E.164 or local format, max 20 chars
    - timezone:      must be one of the supported tz identifiers
    - language:      ISO 639-1 code, e.g. "en", "hi"
    - currency:      ISO 4217 code, e.g. "INR", "USD"
    - vehicle_limit: max vehicles allowed (0 = unlimited; set by plan)
    - driver_limit:  max drivers allowed
    - user_limit:    max user accounts allowed
    - settings:      arbitrary JSON config dict
    """

    class Meta:
        unknown = EXCLUDE

    # Required
    name = fields.String(
        required=True,
        validate=validate.Length(
            min=2, max=150,
            error='Company name must be between 2 and 150 characters.',
        ),
        error_messages={'required': 'Company name is required.'},
    )
    email = fields.Email(
        required=True,
        error_messages={
            'required': 'Company email is required.',
            'validator_failed': 'Enter a valid email address for the company.',
        },
    )

    # Optional identity fields
    slug = fields.String(
        load_default=None,
        validate=validate.Regexp(
            r'^[a-z0-9]+(?:-[a-z0-9]+)*$',
            error='Slug must be lowercase letters, numbers, and hyphens only (e.g. "acme-corp").',
        ),
    )
    domain = fields.String(
        load_default=None,
        validate=validate.Length(max=150, error='Domain must be 150 characters or fewer.'),
    )
    logo_url = fields.Url(
        load_default=None,
        validate=validate.Length(max=500, error='Logo URL must be 500 characters or fewer.'),
        error_messages={'validator_failed': 'Logo URL must be a valid URL.'},
    )
    address     = fields.String(load_default=None)
    gst_number  = fields.String(
        load_default=None,
        validate=validate.Length(max=50, error='GST number must be 50 characters or fewer.'),
    )
    phone = fields.String(
        load_default=None,
        validate=validate.Length(max=20, error='Phone number must be 20 characters or fewer.'),
    )

    # Locale / regional
    timezone = fields.String(
        load_default='Asia/Kolkata',
        validate=validate.OneOf(
            _TIMEZONES,
            error=f'Timezone must be one of: {", ".join(_TIMEZONES)}',
        ),
    )
    language = fields.String(
        load_default='en',
        validate=validate.OneOf(
            _LANGUAGES,
            error=f'Language must be one of: {", ".join(_LANGUAGES)}',
        ),
    )
    currency = fields.String(
        load_default='INR',
        validate=validate.OneOf(
            _CURRENCIES,
            error=f'Currency must be one of: {", ".join(_CURRENCIES)}',
        ),
    )

    # Limits (0 = inherit from plan, applied by admin route logic)
    vehicle_limit = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0, error='vehicle_limit must be 0 or greater.'),
    )
    driver_limit = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0, error='driver_limit must be 0 or greater.'),
    )
    user_limit = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0, error='user_limit must be 0 or greater.'),
    )

    # Arbitrary settings dict
    settings = fields.Dict(load_default=dict)

    @validates('email')
    def normalise_email(self, value, **kwargs):
        return value.strip().lower()

    @validates('name')
    def strip_name(self, value, **kwargs):
        stripped = value.strip()
        if not stripped:
            raise ValidationError('Company name cannot be blank.')
        return stripped


# ─────────────────────────────────────────────────────────────────────────────
class UpdateCompanySchema(Schema):
    """Input schema for updating an existing company (partial update).

    All fields are optional — only submitted fields are changed.
    The route applies only the keys present in the loaded dict.
    """

    class Meta:
        unknown = EXCLUDE

    name = fields.String(
        load_default=None,
        validate=validate.Length(
            min=2, max=150,
            error='Company name must be between 2 and 150 characters.',
        ),
    )
    email = fields.Email(
        load_default=None,
        error_messages={'validator_failed': 'Enter a valid email address.'},
    )
    domain = fields.String(
        load_default=None,
        validate=validate.Length(max=150, error='Domain must be 150 characters or fewer.'),
    )
    logo_url = fields.Url(
        load_default=None,
        validate=validate.Length(max=500, error='Logo URL must be 500 characters or fewer.'),
        error_messages={'validator_failed': 'Logo URL must be a valid URL.'},
    )
    address    = fields.String(load_default=None)
    gst_number = fields.String(
        load_default=None,
        validate=validate.Length(max=50, error='GST number must be 50 characters or fewer.'),
    )
    phone = fields.String(
        load_default=None,
        validate=validate.Length(max=20, error='Phone number must be 20 characters or fewer.'),
    )
    timezone = fields.String(
        load_default=None,
        validate=validate.OneOf(
            _TIMEZONES,
            error=f'Timezone must be one of: {", ".join(_TIMEZONES)}',
        ),
    )
    language = fields.String(
        load_default=None,
        validate=validate.OneOf(
            _LANGUAGES,
            error=f'Language must be one of: {", ".join(_LANGUAGES)}',
        ),
    )
    currency = fields.String(
        load_default=None,
        validate=validate.OneOf(
            _CURRENCIES,
            error=f'Currency must be one of: {", ".join(_CURRENCIES)}',
        ),
    )
    vehicle_limit = fields.Integer(
        load_default=None,
        validate=validate.Range(min=0, error='vehicle_limit must be 0 or greater.'),
    )
    driver_limit = fields.Integer(
        load_default=None,
        validate=validate.Range(min=0, error='driver_limit must be 0 or greater.'),
    )
    user_limit = fields.Integer(
        load_default=None,
        validate=validate.Range(min=0, error='user_limit must be 0 or greater.'),
    )
    is_active = fields.Boolean(load_default=None)
    settings  = fields.Dict(load_default=None)

    @validates('email')
    def normalise_email(self, value, **kwargs):
        if value is None:
            return value
        return value.strip().lower()

    @validates('name')
    def strip_name(self, value, **kwargs):
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValidationError('Company name cannot be blank.')
        return stripped
