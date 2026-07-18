"""add onboarding flag

Revision ID: 003_add_onboarding_flag
Revises: 002_phase1_indexes
Create Date: 2026-07-18 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_add_onboarding_flag'
down_revision = '002_phase1_indexes'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('users', sa.Column('onboarding_completed', sa.Boolean(), server_default='false', nullable=True))

def downgrade():
    op.drop_column('users', 'onboarding_completed')
