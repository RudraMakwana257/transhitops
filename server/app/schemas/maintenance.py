"""
schemas/maintenance.py — Marshmallow validation schemas for maintenance logs

Schemas
-------
MaintenanceSchema           Dump-only — serialise a MaintenanceLog ORM object to JSON
CreateMaintenanceSchema     POST /api/maintenance-logs & PUT partial updates
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE

_MAINTENANCE_TYPES = [
    'Scheduled', 'Unscheduled', 'Breakdown', 'Inspection', 'Servicing', 'Repair', 'Tyres', 'Bodywork', 'Other'
]

_MAINTENANCE_STATUSES = [
    'Open', 'In Progress', 'Completed', 'Cancelled'
]


class MaintenanceSchema(Schema):
    """Read schema — used for serialising MaintenanceLog objects in API responses.

    All fields are dump_only.
    """

    class Meta:
        unknown = EXCLUDE

    id                  = fields.UUID(dump_only=True)
    company_id          = fields.UUID(dump_only=True)
    vehicle_id          = fields.UUID(dump_only=True)
    type                = fields.String(dump_only=True)
    description         = fields.String(dump_only=True)
    status              = fields.String(dump_only=True)
    cost                = fields.Float(dump_only=True)
    technician          = fields.String(dump_only=True)
    scheduled_date      = fields.Date(dump_only=True)
    completed_date      = fields.Date(dump_only=True)
    odometer_at_service = fields.Float(dump_only=True)
    created_by          = fields.UUID(dump_only=True)
    created_at          = fields.DateTime(dump_only=True)
    updated_at          = fields.DateTime(dump_only=True)
    vehicle             = fields.Dict(dump_only=True)


class CreateMaintenanceSchema(Schema):
    """Input schema for creating and updating maintenance logs.

    Required fields
    ---------------
    - vehicle_id: UUID of the vehicle
    - type: must be one of the supported types

    Optional fields
    ---------------
    - description: details of the maintenance
    - status: default 'Open', must be one of the supported statuses
    - cost: cost of the maintenance, must be >= 0
    - technician: name of technician/shop
    - scheduled_date: date when scheduled (YYYY-MM-DD)
    - completed_date: date when completed (YYYY-MM-DD)
    - odometer_at_service: odometer reading at time of service, must be >= 0
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
    type = fields.String(
        required=True,
        validate=validate.OneOf(
            _MAINTENANCE_TYPES,
            error=f'Maintenance type must be one of: {", ".join(_MAINTENANCE_TYPES)}'
        ),
        error_messages={'required': 'Maintenance type is required.'}
    )
    description         = fields.String(load_default=None)
    status              = fields.String(
        load_default='Open',
        validate=validate.OneOf(
            _MAINTENANCE_STATUSES,
            error=f'Status must be one of: {", ".join(_MAINTENANCE_STATUSES)}'
        )
    )
    cost                = fields.Float(
        load_default=0.0,
        validate=validate.Range(min=0.0, error='Cost must be 0 or greater.')
    )
    technician          = fields.String(load_default=None)
    scheduled_date      = fields.Date(load_default=None)
    completed_date      = fields.Date(load_default=None)
    odometer_at_service = fields.Float(
        load_default=None,
        validate=validate.Range(min=0.0, error='Odometer reading must be 0 or greater.')
    )

    @validates('type')
    def strip_type(self, value, **kwargs):
        stripped = value.strip()
        if not stripped:
            raise ValidationError('Maintenance type cannot be blank.')
        return stripped
