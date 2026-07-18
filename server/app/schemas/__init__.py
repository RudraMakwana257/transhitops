"""
schemas/__init__.py — Marshmallow schema package for TransitOps Phase 1

All schemas are exported from here so routes can do a single clean import:

    from app.schemas import CreateVehicleSchema, validate_request

validate_request()
──────────────────
The one universal entry-point for input validation. Every POST/PUT route
calls this instead of duplicating marshmallow load logic.

Usage (in a route):
    data = validate_request(CreateVehicleSchema)
    # data is the deserialized, validated dict — safe to use directly

On validation failure it raises marshmallow.ValidationError, which is caught
by the global error handler in app/__init__.py and returned as:
    HTTP 422 Unprocessable Entity
    {
        "success": false,
        "message": "Validation failed.",
        "errors": {
            "field_name": ["Error message 1", ...],
            ...
        }
    }

If the request body is not valid JSON the client receives:
    HTTP 400 Bad Request
    {"success": false, "message": "Request body must be valid JSON."}
"""

from flask import request, jsonify
from marshmallow import ValidationError

# ─── Auth ─────────────────────────────────────────────────────────────────────
from app.schemas.auth import (
    LoginSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
)

# ─── Company ──────────────────────────────────────────────────────────────────
from app.schemas.company import (
    CompanySchema,
    CreateCompanySchema,
    UpdateCompanySchema,
)

# ─── Vehicle ──────────────────────────────────────────────────────────────────
from app.schemas.vehicle import (
    VehicleSchema,
    CreateVehicleSchema,
    UpdateVehicleSchema,
)

# ─── Driver ───────────────────────────────────────────────────────────────────
from app.schemas.driver import (
    DriverSchema,
    CreateDriverSchema,
    UpdateDriverSchema,
)

# ─── Trip ─────────────────────────────────────────────────────────────────────
from app.schemas.trip import (
    TripSchema,
    CreateTripSchema,
    UpdateTripSchema,
)

# ─── Maintenance ──────────────────────────────────────────────────────────────
from app.schemas.maintenance import (
    MaintenanceSchema,
    CreateMaintenanceSchema,
)

# ─── Fuel ─────────────────────────────────────────────────────────────────────
from app.schemas.fuel import (
    FuelLogSchema,
    CreateFuelLogSchema,
)

# ─── Expense ──────────────────────────────────────────────────────────────────
from app.schemas.expense import (
    ExpenseSchema,
    CreateExpenseSchema,
)

# ─── User ─────────────────────────────────────────────────────────────────────
from app.schemas.user import (
    UserSchema,
    CreateUserSchema,
    UpdateUserSchema,
)

# ─── Plan ─────────────────────────────────────────────────────────────────────
from app.schemas.plan import (
    PlanSchema,
    CreatePlanSchema,
    UpdatePlanSchema,
)


# ─────────────────────────────────────────────────────────────────────────────
def validate_request(schema_class, data=None):
    """Validate and deserialize the incoming request body.

    Parameters
    ----------
    schema_class : type[Schema]
        The marshmallow schema class to use (not an instance).
    data : dict | None
        If provided, validate this dict directly instead of reading the request
        body. Useful for validating query params or pre-parsed data.

    Returns
    -------
    dict
        The validated, deserialized data safe to use in route logic.

    Raises
    ------
    marshmallow.ValidationError
        Caught by the global error handler → HTTP 422 with field-level errors.
    werkzeug.exceptions.BadRequest (400)
        Returned directly if the Content-Type is not JSON or the body is
        malformed JSON.
    """
    if data is None:
        data = request.get_json(silent=True)
        if data is None:
            # Return a Flask response directly — not a ValidationError —
            # because the problem is the HTTP request itself, not the fields.
            from flask import abort
            abort(400, description='Request body must be valid JSON.')

    schema = schema_class()
    # load() triggers validation and raises ValidationError on failure.
    # The global error handler in app/__init__.py catches that and formats it.
    return schema.load(data)


__all__ = [
    # helper
    'validate_request',
    # auth
    'LoginSchema', 'ForgotPasswordSchema', 'ResetPasswordSchema',
    # company
    'CompanySchema', 'CreateCompanySchema', 'UpdateCompanySchema',
    # vehicle
    'VehicleSchema', 'CreateVehicleSchema', 'UpdateVehicleSchema',
    # driver
    'DriverSchema', 'CreateDriverSchema', 'UpdateDriverSchema',
    # trip
    'TripSchema', 'CreateTripSchema', 'UpdateTripSchema',
    # maintenance
    'MaintenanceSchema', 'CreateMaintenanceSchema',
    # fuel
    'FuelLogSchema', 'CreateFuelLogSchema',
    # expense
    'ExpenseSchema', 'CreateExpenseSchema',
    # user
    'UserSchema', 'CreateUserSchema', 'UpdateUserSchema',
    # plan
    'PlanSchema', 'CreatePlanSchema', 'UpdatePlanSchema',
]
