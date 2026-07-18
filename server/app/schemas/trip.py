"""
schemas/trip.py — Marshmallow validation schemas for trip management

Schemas
-------
TripSchema          Dump-only — serialise a Trip ORM object to JSON
CreateTripSchema    POST /api/trips
UpdateTripSchema    PUT  /api/trips/<id> — partial update, all optional

Field names match Trip model exactly:
    trip_number, vehicle_id, driver_id, source, destination,
    cargo_weight_kg, planned_distance_km, status, revenue, notes,
    dispatched_at, completed_at, cancelled_at
"""

from datetime import datetime as datetime_type

from marshmallow import (
    Schema, fields, validate, validates, validates_schema,
    ValidationError, EXCLUDE,
)

# ─── Allowed values ───────────────────────────────────────────────────────────
_TRIP_STATUSES = [
    'Draft', 'Dispatched', 'In Transit', 'Completed', 'Cancelled',
]

# Statuses a dispatcher/manager may set when creating a trip
_CREATABLE_STATUSES = ['Draft', 'Dispatched']

# Statuses a dispatcher/manager may move a trip to via update
_UPDATABLE_STATUSES = ['Draft', 'Dispatched', 'In Transit', 'Completed', 'Cancelled']


# ─────────────────────────────────────────────────────────────────────────────
class TripSchema(Schema):
    """Read schema — used for serialising Trip objects in API responses.

    All fields are dump_only. Not used for load/input.
    """

    class Meta:
        unknown = EXCLUDE

    id                  = fields.UUID(dump_only=True)
    company_id          = fields.UUID(dump_only=True)
    trip_number         = fields.String(dump_only=True)
    vehicle_id          = fields.UUID(dump_only=True)
    driver_id           = fields.UUID(dump_only=True)
    source              = fields.String(dump_only=True)
    destination         = fields.String(dump_only=True)
    cargo_weight_kg     = fields.Float(dump_only=True)
    planned_distance_km = fields.Float(dump_only=True)
    actual_distance_km  = fields.Float(dump_only=True)
    status              = fields.String(dump_only=True)
    start_odometer      = fields.Float(dump_only=True)
    end_odometer        = fields.Float(dump_only=True)
    fuel_consumed_l     = fields.Float(dump_only=True)
    revenue             = fields.Float(dump_only=True)
    notes               = fields.String(dump_only=True)
    dispatched_at       = fields.DateTime(dump_only=True)
    completed_at        = fields.DateTime(dump_only=True)
    cancelled_at        = fields.DateTime(dump_only=True)
    created_by          = fields.UUID(dump_only=True)
    created_at          = fields.DateTime(dump_only=True)
    updated_at          = fields.DateTime(dump_only=True)
    # Nested relations (included when route calls to_dict(include_relations=True))
    vehicle             = fields.Dict(dump_only=True)
    driver              = fields.Dict(dump_only=True)


# ─────────────────────────────────────────────────────────────────────────────
class CreateTripSchema(Schema):
    """Input schema for creating a new trip.

    Required fields
    ---------------
    - vehicle_id:       UUID of the vehicle to assign
    - driver_id:        UUID of the driver to assign
    - source:           origin location name/address, 1–200 chars
    - destination:      destination location name/address, 1–200 chars
    - cargo_weight_kg:  payload weight in kg, must be > 0

    Optional fields
    ---------------
    - planned_distance_km: estimated route distance, must be > 0 if provided
    - status:              initial status, only 'Draft' or 'Dispatched' allowed
                           (default 'Draft'); transitions to other statuses happen
                           via dedicated dispatch/complete/cancel endpoints
    - revenue:             expected trip revenue in local currency, ≥ 0
    - notes:               free-text notes for the dispatcher
    - dispatched_at:       ISO 8601 datetime — when the trip was dispatched;
                           must be a valid datetime string if provided
    """

    class Meta:
        unknown = EXCLUDE

    # ── Required ──────────────────────────────────────────────────────────────
    vehicle_id = fields.UUID(
        required=True,
        error_messages={
            'required': 'Vehicle ID is required.',
            'invalid':  'vehicle_id must be a valid UUID.',
        },
    )
    driver_id = fields.UUID(
        required=True,
        error_messages={
            'required': 'Driver ID is required.',
            'invalid':  'driver_id must be a valid UUID.',
        },
    )
    source = fields.String(
        required=True,
        validate=validate.Length(
            min=1, max=200,
            error='Source location must be between 1 and 200 characters.',
        ),
        error_messages={'required': 'Source (start location) is required.'},
    )
    destination = fields.String(
        required=True,
        validate=validate.Length(
            min=1, max=200,
            error='Destination location must be between 1 and 200 characters.',
        ),
        error_messages={'required': 'Destination (end location) is required.'},
    )
    cargo_weight_kg = fields.Float(
        required=True,
        validate=validate.Range(
            min=0.01,
            error='Cargo weight must be greater than 0 kg.',
        ),
        error_messages={'required': 'Cargo weight (kg) is required.'},
    )

    # ── Optional ──────────────────────────────────────────────────────────────
    planned_distance_km = fields.Float(
        load_default=None,
        validate=validate.Range(
            min=0.01,
            error='Planned distance must be greater than 0 km.',
        ),
    )
    status = fields.String(
        load_default='Draft',
        validate=validate.OneOf(
            _CREATABLE_STATUSES,
            error=(
                f'A new trip can only be created with status: '
                f'{", ".join(_CREATABLE_STATUSES)}. '
                f'Use the dispatch/complete/cancel endpoints to change status.'
            ),
        ),
    )
    revenue = fields.Float(
        load_default=0,
        validate=validate.Range(min=0, error='Revenue must be 0 or greater.'),
    )
    notes = fields.String(load_default=None)
    dispatched_at = fields.DateTime(
        load_default=None,
        error_messages={
            'invalid': (
                'dispatched_at must be a valid ISO 8601 datetime '
                '(e.g. "2025-01-15T10:30:00").'
            ),
        },
    )

    # ── Field-level validators ─────────────────────────────────────────────────
    @validates('source')
    def strip_source(self, value, **kwargs):
        stripped = value.strip()
        if not stripped:
            raise ValidationError('Source location cannot be blank.')
        return stripped

    @validates('destination')
    def strip_destination(self, value, **kwargs):
        stripped = value.strip()
        if not stripped:
            raise ValidationError('Destination location cannot be blank.')
        return stripped

    @validates_schema
    def source_and_destination_differ(self, data, **kwargs):
        """Source and destination should not be identical."""
        src  = (data.get('source') or '').strip().lower()
        dest = (data.get('destination') or '').strip().lower()
        if src and dest and src == dest:
            raise ValidationError(
                {'destination': ['Destination cannot be the same as the source location.']}
            )

    @validates_schema
    def dispatched_at_requires_dispatched_status(self, data, **kwargs):
        """dispatched_at timestamp only makes sense when status is Dispatched."""
        dispatched_at = data.get('dispatched_at')
        status        = data.get('status', 'Draft')
        if dispatched_at and status == 'Draft':
            raise ValidationError(
                {'dispatched_at': [
                    'dispatched_at should not be set when status is Draft. '
                    'Set status to "Dispatched" or omit dispatched_at.'
                ]}
            )


# ─────────────────────────────────────────────────────────────────────────────
class UpdateTripSchema(Schema):
    """Input schema for updating a trip (partial update).

    All fields are optional — only submitted fields are changed.

    Fields that are immutable after creation:
        - vehicle_id    (changing mid-trip is a business-logic decision handled
        - driver_id      by the dispatch endpoint, not a plain PATCH)
        - trip_number   (auto-generated, never editable)

    Operational fields writable via update:
        - status, notes, revenue, planned_distance_km
        - Odometer / completion data (start_odometer, end_odometer,
          fuel_consumed_l, actual_distance_km) — written by the driver app or
          dispatcher when closing out a trip.
    """

    class Meta:
        unknown = EXCLUDE

    status = fields.String(
        load_default=None,
        validate=validate.OneOf(
            _UPDATABLE_STATUSES,
            error=f'Status must be one of: {", ".join(_UPDATABLE_STATUSES)}',
        ),
    )
    source = fields.String(
        load_default=None,
        validate=validate.Length(
            min=1, max=200,
            error='Source location must be between 1 and 200 characters.',
        ),
    )
    destination = fields.String(
        load_default=None,
        validate=validate.Length(
            min=1, max=200,
            error='Destination location must be between 1 and 200 characters.',
        ),
    )
    cargo_weight_kg = fields.Float(
        load_default=None,
        validate=validate.Range(min=0.01, error='Cargo weight must be greater than 0 kg.'),
    )
    planned_distance_km = fields.Float(
        load_default=None,
        validate=validate.Range(min=0.01, error='Planned distance must be greater than 0 km.'),
    )
    actual_distance_km = fields.Float(
        load_default=None,
        validate=validate.Range(min=0.01, error='Actual distance must be greater than 0 km.'),
    )
    start_odometer = fields.Float(
        load_default=None,
        validate=validate.Range(min=0, error='Start odometer must be 0 or greater.'),
    )
    end_odometer = fields.Float(
        load_default=None,
        validate=validate.Range(min=0, error='End odometer must be 0 or greater.'),
    )
    fuel_consumed_l = fields.Float(
        load_default=None,
        validate=validate.Range(min=0.01, error='Fuel consumed must be greater than 0 litres.'),
    )
    revenue = fields.Float(
        load_default=None,
        validate=validate.Range(min=0, error='Revenue must be 0 or greater.'),
    )
    notes         = fields.String(load_default=None)
    dispatched_at = fields.DateTime(
        load_default=None,
        error_messages={'invalid': 'dispatched_at must be a valid ISO 8601 datetime.'},
    )
    completed_at = fields.DateTime(
        load_default=None,
        error_messages={'invalid': 'completed_at must be a valid ISO 8601 datetime.'},
    )
    cancelled_at = fields.DateTime(
        load_default=None,
        error_messages={'invalid': 'cancelled_at must be a valid ISO 8601 datetime.'},
    )

    @validates_schema
    def odometer_consistency(self, data, **kwargs):
        """end_odometer must be greater than start_odometer when both are provided."""
        start = data.get('start_odometer')
        end   = data.get('end_odometer')
        if start is not None and end is not None and end <= start:
            raise ValidationError(
                {'end_odometer': ['End odometer must be greater than start odometer.']}
            )
