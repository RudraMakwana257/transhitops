"""Phase 3 Logistics Domain and Globalization Units Schema Upgrade

Revision ID: 006_phase3_logistics
Revises: 005_phase3_compound_indexes
Create Date: 2026-08-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '006_phase3_logistics'
down_revision = '005_phase3_compound_indexes'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('companies', sa.Column('distance_unit', sa.String(length=10), server_default='km', nullable=True))
    op.add_column('companies', sa.Column('fuel_unit', sa.String(length=10), server_default='liters', nullable=True))

def downgrade():
    op.drop_column('companies', 'fuel_unit')
    op.drop_column('companies', 'distance_unit')
