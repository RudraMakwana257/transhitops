"""Phase 4 Missing Core Domain Tables and Foreign Key Performance Indexes

Revision ID: 007_phase4_tables_indexes
Revises: 006_phase3_logistics
Create Date: 2026-08-11 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '007_phase4_tables_indexes'
down_revision = '006_phase3_logistics'
branch_labels = None
depends_on = None

def upgrade():
    # 1. customers
    op.create_table(
        'customers',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', sa.UUID(as_uuid=True), sa.ForeignKey('companies.id'), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('email', sa.String(length=150), nullable=True),
        sa.Column('phone', sa.String(length=30), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('billing_details', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True)
    )
    op.create_index('idx_customers_company_id', 'customers', ['company_id'], unique=False)
    op.create_index('idx_customers_company_active', 'customers', ['company_id', 'is_active'], unique=False)

    # 2. shipments
    op.create_table(
        'shipments',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', sa.UUID(as_uuid=True), sa.ForeignKey('companies.id'), nullable=False),
        sa.Column('customer_id', sa.UUID(as_uuid=True), sa.ForeignKey('customers.id'), nullable=False),
        sa.Column('tracking_number', sa.String(length=50), nullable=False, unique=True),
        sa.Column('origin', sa.String(length=200), nullable=False),
        sa.Column('destination', sa.String(length=200), nullable=False),
        sa.Column('weight_kg', sa.Numeric(precision=10, scale=2), server_default='0.00', nullable=True),
        sa.Column('status', sa.String(length=30), server_default='Pending', nullable=True),
        sa.Column('trip_id', sa.UUID(as_uuid=True), sa.ForeignKey('trips.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True)
    )
    op.create_index('idx_shipments_company_id', 'shipments', ['company_id'], unique=False)
    op.create_index('idx_shipments_customer_id', 'shipments', ['customer_id'], unique=False)
    op.create_index('idx_shipments_trip_id', 'shipments', ['trip_id'], unique=False)

    # 3. shipment_items
    op.create_table(
        'shipment_items',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('shipment_id', sa.UUID(as_uuid=True), sa.ForeignKey('shipments.id'), nullable=False),
        sa.Column('description', sa.String(length=200), nullable=False),
        sa.Column('quantity', sa.Integer(), server_default='1', nullable=True),
        sa.Column('weight_kg', sa.Numeric(precision=10, scale=2), server_default='0.00', nullable=True)
    )
    op.create_index('idx_shipment_items_shipment_id', 'shipment_items', ['shipment_id'], unique=False)

    # 4. file_metadata
    op.create_table(
        'file_metadata',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', sa.UUID(as_uuid=True), sa.ForeignKey('companies.id'), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_key', sa.String(length=500), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('file_size', sa.Integer(), server_default='0', nullable=True),
        sa.Column('entity_type', sa.String(length=50), nullable=True),
        sa.Column('entity_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True)
    )
    op.create_index('idx_file_metadata_company_id', 'file_metadata', ['company_id'], unique=False)
    op.create_index('idx_file_metadata_entity', 'file_metadata', ['entity_type', 'entity_id'], unique=False)

    # 5. webhook_logs
    op.create_table(
        'webhook_logs',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('event_id', sa.String(length=100), nullable=True, unique=True),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('provider', sa.String(length=50), server_default='mock', nullable=True),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=30), server_default='processed', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True)
    )
    op.create_index('idx_webhook_logs_event_id', 'webhook_logs', ['event_id'], unique=False)

    # Foreign Key B-Tree Indexes on existing high-frequency tables
    op.create_index('idx_trips_vehicle_id', 'trips', ['vehicle_id'], unique=False)
    op.create_index('idx_trips_driver_id', 'trips', ['driver_id'], unique=False)
    op.create_index('idx_maint_vehicle_id', 'maintenance_logs', ['vehicle_id'], unique=False)
    op.create_index('idx_fuel_vehicle_id', 'fuel_logs', ['vehicle_id'], unique=False)
    op.create_index('idx_expense_vehicle_id', 'expenses', ['vehicle_id'], unique=False)

def downgrade():
    op.drop_index('idx_expense_vehicle_id', table_name='expenses')
    op.drop_index('idx_fuel_vehicle_id', table_name='fuel_logs')
    op.drop_index('idx_maint_vehicle_id', table_name='maintenance_logs')
    op.drop_index('idx_trips_driver_id', table_name='trips')
    op.drop_index('idx_trips_vehicle_id', table_name='trips')

    op.drop_index('idx_webhook_logs_event_id', table_name='webhook_logs')
    op.drop_table('webhook_logs')

    op.drop_index('idx_file_metadata_entity', table_name='file_metadata')
    op.drop_index('idx_file_metadata_company_id', table_name='file_metadata')
    op.drop_table('file_metadata')

    op.drop_index('idx_shipment_items_shipment_id', table_name='shipment_items')
    op.drop_table('shipment_items')

    op.drop_index('idx_shipments_trip_id', table_name='shipments')
    op.drop_index('idx_shipments_customer_id', table_name='shipments')
    op.drop_index('idx_shipments_company_id', table_name='shipments')
    op.drop_table('shipments')

    op.drop_index('idx_customers_company_active', table_name='customers')
    op.drop_index('idx_customers_company_id', table_name='customers')
    op.drop_table('customers')
