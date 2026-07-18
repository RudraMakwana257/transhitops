"""
schemas/expense.py — Marshmallow validation schemas for expenses

Schemas
-------
ExpenseSchema           Dump-only — serialise an Expense ORM object to JSON
CreateExpenseSchema     POST /api/expenses & PUT partial updates
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE


class ExpenseSchema(Schema):
    """Read schema — used for serialising Expense objects in API responses.

    All fields are dump_only.
    """

    class Meta:
        unknown = EXCLUDE

    id          = fields.UUID(dump_only=True)
    company_id  = fields.UUID(dump_only=True)
    vehicle_id  = fields.UUID(dump_only=True)
    trip_id     = fields.UUID(dump_only=True)
    type        = fields.String(dump_only=True)  # Acts as the category
    amount      = fields.Float(dump_only=True)
    description = fields.String(dump_only=True)
    date        = fields.Date(dump_only=True)
    created_by  = fields.UUID(dump_only=True)
    created_at  = fields.DateTime(dump_only=True)
    vehicle     = fields.Dict(dump_only=True)
    trip        = fields.Dict(dump_only=True)


class CreateExpenseSchema(Schema):
    """Input schema for creating and updating expenses.

    Required fields
    ---------------
    - type: expense type / category, must not be blank
    - amount: must be > 0
    - date: date of expense (YYYY-MM-DD)

    Optional fields
    ---------------
    - vehicle_id: UUID of the associated vehicle
    - trip_id: UUID of the associated trip
    - description: optional details
    """

    class Meta:
        unknown = EXCLUDE

    type = fields.String(
        required=True,
        validate=validate.Length(min=1, error='Expense type/category is required.'),
        error_messages={'required': 'Expense type/category is required.'}
    )
    amount = fields.Float(
        required=True,
        validate=validate.Range(min=0.01, error='Amount must be greater than 0.'),
        error_messages={'required': 'Amount is required.'}
    )
    date = fields.Date(
        required=True,
        error_messages={
            'required': 'Date is required.',
            'invalid': 'date must be a valid date in YYYY-MM-DD format.'
        }
    )
    vehicle_id  = fields.UUID(load_default=None)
    trip_id     = fields.UUID(load_default=None)
    description = fields.String(load_default=None)

    @validates('type')
    def strip_type(self, value, **kwargs):
        stripped = value.strip()
        if not stripped:
            raise ValidationError('Expense type/category cannot be blank.')
        return stripped
