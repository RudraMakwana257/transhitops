"""
schemas/auth.py — Marshmallow validation schemas for authentication endpoints

Schemas
-------
LoginSchema             POST /api/auth/login
ForgotPasswordSchema    POST /api/auth/forgot-password
ResetPasswordSchema     POST /api/auth/reset-password
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE


class LoginSchema(Schema):
    """Validate login credentials.

    Rules
    -----
    - email: required, must be a valid email address, normalised to lowercase
    - password: required, min 1 char (the route layer checks hashed correctness;
      complexity is only enforced on password *reset*, not on login so existing
      accounts with legacy passwords are never blocked from logging in)
    """

    class Meta:
        unknown = EXCLUDE   # silently drop extra fields (e.g. remember_me, csrf)

    email = fields.Email(
        required=True,
        metadata={'description': 'User email address'},
        error_messages={
            'required': 'Email is required.',
            'null':     'Email cannot be blank.',
            'validator_failed': 'Enter a valid email address.',
        },
    )
    password = fields.String(
        required=True,
        load_only=True,          # never serialise passwords back to the client
        validate=validate.Length(min=1, error='Password cannot be blank.'),
        error_messages={'required': 'Password is required.'},
    )

    @validates('email')
    def normalise_email(self, value, **kwargs):
        """Lowercase + strip the email so comparisons are consistent."""
        normalised = value.strip().lower()
        if not normalised:
            raise ValidationError('Email cannot be blank.')
        return normalised


class ForgotPasswordSchema(Schema):
    """Validate forgot-password request.

    Rules
    -----
    - email: required, valid email format
    """

    class Meta:
        unknown = EXCLUDE

    email = fields.Email(
        required=True,
        error_messages={
            'required': 'Email address is required.',
            'null':     'Email address cannot be blank.',
            'validator_failed': 'Enter a valid email address.',
        },
    )

    @validates('email')
    def normalise_email(self, value, **kwargs):
        return value.strip().lower()


class ResetPasswordSchema(Schema):
    """Validate password-reset submission.

    Rules
    -----
    - token:        required, non-empty string (format validated by the route
                    against the database; schema only checks it is present)
    - new_password: required, min 8 chars — complexity enforced here because
                    this is the only place a user sets a *new* password
    """

    class Meta:
        unknown = EXCLUDE

    token = fields.String(
        required=True,
        validate=validate.Length(min=1, error='Reset token cannot be blank.'),
        error_messages={'required': 'Reset token is required.'},
    )
    new_password = fields.String(
        required=True,
        load_only=True,
        validate=validate.Length(
            min=8,
            error='New password must be at least 8 characters long.',
        ),
        error_messages={'required': 'New password is required.'},
    )

    @validates('new_password')
    def check_password_complexity(self, value, **kwargs):
        """Enforce the same complexity policy used in the auth route helper.

        Having the check here means the 422 response is consistent with
        other field errors — the route layer's _validate_password() call
        acts as a second defence but the schema catches it first.
        """
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
