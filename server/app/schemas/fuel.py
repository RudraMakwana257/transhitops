"""
schemas/fuel.py — Marshmallow validation schemas for fuel logs

Schemas
-------
FuelLogSchema           Dump-only — serialise a FuelLog ORM object to JSON
CreateFuelLogSchema     POST /api/fuel-logs & PUT partial updates
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE


class FuelLogSchema(Schema):
    """Read schema — used for serialising FuelLog objects in API responses.

    All fields are dump_only.
    """

    class Meta:
        unknown = EXCLUDE

    id               = fields.UUID(dump_only=True)
    company_id       = fields.UUID(dump_only=True)
    vehicle_id       = fields.UUID(dump_only=True)
    driver_id        = fields.UUID(dump_only=True)
    trip_id          = fields.UUID(dump_only=True)
    date             = fields.Date(dump_only=True)
    liters           = fields.Float(dump_only=True)
    price_per_liter  = fields.Float(dump_only=True)
    total_cost       = fields.Float(dump_only=True)
    odometer_reading = fields.Float(dump_only=True)
    fuel_station     = fields.String(dump_only=True)
    created_at       = fields.DateTime(dump_only=True)
    vehicle          = fields.Dict(dump_only=True)
    driver           = fields.Dict(dump_only=True)
    trip             = fields.Dict(dump_only=True)


class CreateFuelLogSchema(Schema):
    """Input schema for creating and updating fuel logs.

    Required fields
    ---------------
    - vehicle_id: UUID of the vehicle
    - date: date of refueling (YYYY-MM-DD)
    - liters: must be > 0
    - price_per_liter: must be > 0

    Optional fields
    ---------------
    - driver_id: UUID of the driver
    - trip_id: UUID of the trip
    - odometer_reading: odometer reading at refueling, must be >= 0
    - fuel_station: location/station name
    """

    class Meta:
        unknown = EXCLUDE

    vehicle_id = fields.UUID(
        required=True,
        error_messages={
            'required': 'Vehicle ID is required.',
            'invalid': 'vehicle_id must be a valid UUID.'
        }
    )
    driver_id = fields.UUID(load_default=None)
    trip_id   = fields.UUID(load_default=None)
    date      = fields.Date(
        required=True,
        error_messages={
            'required': 'Date is required.',
            'invalid': 'date must be a valid date in YYYY-MM-DD format.'
        }
    )
    liters = fields.Float(
        required=True,
        validate=validate.Range(min=0.01, error='Liters must be greater than 0.'),
        error_messages={'required': 'Liters is required.'}
    )
    price_per_liter = fields.Float(
        required=True,
        validate=validate.Range(min=0.01, error='Price per liter must be greater than 0.'),
        error_messages={'required': 'Price per liter is required.'}
    )
    odometer_reading = fields.Float(
        load_default=None,
        validate=validate.Range(min=0.0, error='Odometer reading must be 0 or greater.')
    )
    fuel_station = fields.String(load_default=None)
