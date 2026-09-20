"""Phase 3 Compound Indexes and Multi-Tenant Schema Performance Optimization

Revision ID: 005_phase3_compound_indexes
Revises: 004_create_operational_exceptions
Create Date: 2026-08-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '005_phase3_compound_indexes'
down_revision = '004_operational_exceptions'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('trips', sa.Column('waypoints', sa.JSON(), nullable=True))
    op.add_column('trips', sa.Column('pod_details', sa.JSON(), nullable=True))
    op.create_index('idx_vehicles_company_status', 'vehicles', ['company_id', 'status'], unique=False)
    op.create_index('idx_drivers_company_status', 'drivers', ['company_id', 'status'], unique=False)
    op.create_index('idx_trips_company_status', 'trips', ['company_id', 'status'], unique=False)
    op.create_index('idx_trips_company_created', 'trips', ['company_id', 'created_at'], unique=False)
    op.create_index('idx_maint_company_status', 'maintenance_logs', ['company_id', 'status'], unique=False)
    op.create_index('idx_fuel_company_vehicle', 'fuel_logs', ['company_id', 'vehicle_id', 'date'], unique=False)
    op.create_index('idx_expense_company_date', 'expenses', ['company_id', 'date'], unique=False)
    op.create_index('idx_audit_company_created', 'audit_logs', ['company_id', 'created_at'], unique=False)

def downgrade():
    op.drop_index('idx_audit_company_created', table_name='audit_logs')
    op.drop_index('idx_expense_company_date', table_name='expenses')
    op.drop_index('idx_fuel_company_vehicle', table_name='fuel_logs')
    op.drop_index('idx_maint_company_status', table_name='maintenance_logs')
    op.drop_index('idx_trips_company_created', table_name='trips')
    op.drop_index('idx_trips_company_status', table_name='trips')
    op.drop_index('idx_drivers_company_status', table_name='drivers')
    op.drop_index('idx_vehicles_company_status', table_name='vehicles')
    op.drop_column('trips', 'pod_details')
    op.drop_column('trips', 'waypoints')
