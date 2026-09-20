"""
schemas/user.py — Marshmallow validation schemas for user management

Schemas
-------
UserSchema              Dump-only — serialise a User ORM object to JSON
CreateUserSchema        POST /api/settings/users
UpdateUserSchema        PUT  /api/settings/users/<id> — partial update, all optional
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE

_TENANT_USER_ROLES = ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst', 'driver']


class UserSchema(Schema):
    """Read schema — used for serialising User objects in API responses.

    All fields are dump_only.
    """

    class Meta:
        unknown = EXCLUDE

    id                 = fields.UUID(dump_only=True)
    company_id         = fields.UUID(dump_only=True)
    name               = fields.String(dump_only=True)
    email              = fields.Email(dump_only=True)
    role               = fields.String(dump_only=True)
    is_active          = fields.Boolean(dump_only=True)
    last_login_at      = fields.DateTime(dump_only=True)
    failed_login_count = fields.Integer(dump_only=True)
    locked_until       = fields.DateTime(dump_only=True)
    created_at         = fields.DateTime(dump_only=True)
    updated_at         = fields.DateTime(dump_only=True)


class CreateUserSchema(Schema):
    """Input schema for creating a user.

    Required fields
    ---------------
    - name: user full name
    - email: required, must be valid email format
    - password: required, min 8 characters with complexity checks
    - role: one of valid roles

    Optional fields
    ---------------
    - is_active: default True
    """

    class Meta:
        unknown = EXCLUDE

    name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100, error='Name must be between 1 and 100 characters.'),
        error_messages={'required': 'Name is required.'}
    )
    email = fields.Email(
        required=True,
        error_messages={
            'required': 'Email is required.',
            'validator_failed': 'Enter a valid email address.'
        }
    )
    password = fields.String(
        required=True,
        load_only=True,
        validate=validate.Length(min=8, error='Password must be at least 8 characters long.'),
        error_messages={'required': 'Password is required.'}
    )
    role = fields.String(
        required=True,
        validate=validate.OneOf(_TENANT_USER_ROLES, error=f'Role must be one of: {", ".join(_TENANT_USER_ROLES)}'),
        error_messages={'required': 'Role is required.'}
    )
    is_active = fields.Boolean(load_default=True)

    @validates('email')
    def normalise_email(self, value, **kwargs):
        return value.strip().lower()

    @validates('password')
    def check_password_complexity(self, value, **kwargs):
        import re
        if not re.search(r'[A-Z]', value):
            raise ValidationError('Password must contain at least one uppercase letter.')
        if not re.search(r'[a-z]', value):
            raise ValidationError('Password must contain at least one lowercase letter.')
        if not re.search(r'\d', value):
            raise ValidationError('Password must contain at least one number.')
        if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>?/\\|`~]', value):
            raise ValidationError('Password must contain at least one special character.')
        return value
Block = False


class UpdateUserSchema(Schema):
    """Input schema for updating an existing user (partial update).

    All fields are optional.
    """

    class Meta:
        unknown = EXCLUDE

    name = fields.String(
        load_default=None,
        validate=validate.Length(min=1, max=100, error='Name must be between 1 and 100 characters.')
    )
    email = fields.Email(
        load_default=None,
        error_messages={'validator_failed': 'Enter a valid email address.'}
    )
    password = fields.String(
        load_default=None,
        load_only=True,
        validate=validate.Length(min=8, error='Password must be at least 8 characters long.')
    )
    role = fields.String(
        load_default=None,
        validate=validate.OneOf(_TENANT_USER_ROLES, error=f'Role must be one of: {", ".join(_TENANT_USER_ROLES)}')
    )
    is_active = fields.Boolean(load_default=None)

    @validates('email')
    def normalise_email(self, value, **kwargs):
        if value is None:
            return value
        return value.strip().lower()

    @validates('password')
    def check_password_complexity(self, value, **kwargs):
        if value is None:
            return value
        import re
        if not re.search(r'[A-Z]', value):
            raise ValidationError('Password must contain at least one uppercase letter.')
        if not re.search(r'[a-z]', value):
            raise ValidationError('Password must contain at least one lowercase letter.')
        if not re.search(r'\d', value):
            raise ValidationError('Password must contain at least one number.')
        if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>?/\\|`~]', value):
            raise ValidationError('Password must contain at least one special character.')
        return value
