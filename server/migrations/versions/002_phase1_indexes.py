"""Phase 1 indexes

Revision ID: 002_phase1_indexes
Revises: 001_phase1_schema_bootstrap
Create Date: 2026-07-18 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_phase1_indexes'
down_revision = '001_phase1_schema_bootstrap'
branch_labels = None
depends_on = None

def upgrade():
    # Example empty migration for indexes if they were already created in 001,
    # or you can put actual index creation here.
    pass

def downgrade():
    pass
