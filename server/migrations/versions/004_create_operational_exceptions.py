"""create operational_exceptions table

Revision ID: 004_create_operational_exceptions
Revises: 003_add_onboarding_flag
Create Date: 2026-08-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '004_operational_exceptions'
down_revision = '003_add_onboarding_flag'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'operational_exceptions',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', sa.UUID(as_uuid=True), sa.ForeignKey('companies.id'), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('detected_at', sa.DateTime(), nullable=False),
        sa.Column('due_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_by', sa.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('resolution_note', sa.Text(), nullable=True),
        sa.Column('meta_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True)
    )
    op.create_index('idx_exception_company_id', 'operational_exceptions', ['company_id'])
    op.create_index('idx_exception_tenant_status', 'operational_exceptions', ['company_id', 'status'])
    op.create_index('idx_exception_tenant_type_entity', 'operational_exceptions', ['company_id', 'type', 'entity_type', 'entity_id', 'status'])

def downgrade():
    op.drop_index('idx_exception_tenant_type_entity', table_name='operational_exceptions')
    op.drop_index('idx_exception_tenant_status', table_name='operational_exceptions')
    op.drop_index('idx_exception_company_id', table_name='operational_exceptions')
    op.drop_table('operational_exceptions')
