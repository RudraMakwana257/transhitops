"""Fix Driver user_id, safety_score precision, and TripEvent location/coordinates/notes schema

Revision ID: 008_fix_driver_tripevent
Revises: 007_phase4_tables_indexes
Create Date: 2026-08-12 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '008_fix_driver_tripevent'
down_revision = '007_phase4_tables_indexes'
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Fix drivers table
    driver_cols = [c['name'] for c in inspector.get_columns('drivers')]
    if 'user_id' not in driver_cols:
        op.add_column('drivers', sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True))
        op.create_index('idx_drivers_user_id', 'drivers', ['user_id'], unique=False)
    op.alter_column('drivers', 'safety_score',
                    existing_type=sa.Numeric(precision=4, scale=2),
                    type_=sa.Numeric(precision=5, scale=2),
                    existing_nullable=True)

    # Fix trip_events table
    trip_event_cols = [c['name'] for c in inspector.get_columns('trip_events')]
    if 'location' not in trip_event_cols:
        op.add_column('trip_events', sa.Column('location', sa.String(length=200), nullable=True))
    if 'latitude' not in trip_event_cols:
        op.add_column('trip_events', sa.Column('latitude', sa.Numeric(precision=10, scale=6), nullable=True))
    if 'longitude' not in trip_event_cols:
        op.add_column('trip_events', sa.Column('longitude', sa.Numeric(precision=10, scale=6), nullable=True))
    if 'notes' not in trip_event_cols:
        op.add_column('trip_events', sa.Column('notes', sa.Text(), nullable=True))

def downgrade():
    op.drop_column('trip_events', 'notes')
    op.drop_column('trip_events', 'longitude')
    op.drop_column('trip_events', 'latitude')
    op.drop_column('trip_events', 'location')

    op.alter_column('drivers', 'safety_score',
                    existing_type=sa.Numeric(precision=5, scale=2),
                    type_=sa.Numeric(precision=4, scale=2),
                    existing_nullable=True)
    op.drop_index('idx_drivers_user_id', table_name='drivers')
    op.drop_column('drivers', 'user_id')
