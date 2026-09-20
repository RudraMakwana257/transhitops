"""Create manual_payments ledger table

Revision ID: 009_create_manual_payments
Revises: 008_fix_driver_tripevent
Create Date: 2026-08-12 01:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '009_create_manual_payments'
down_revision = '008_fix_driver_tripevent'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'manual_payments',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', sa.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('plan_id', sa.UUID(as_uuid=True), sa.ForeignKey('subscription_plans.id'), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='INR', nullable=False),
        sa.Column('payment_method', sa.String(length=30), nullable=False),
        sa.Column('payment_date', sa.DateTime(), nullable=False),
        sa.Column('period_start', sa.DateTime(), nullable=False),
        sa.Column('period_end', sa.DateTime(), nullable=False),
        sa.Column('billing_period_months', sa.Integer(), server_default='1', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='CONFIRMED', nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recorded_by_user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('reversal_reason', sa.Text(), nullable=True),
        sa.Column('reversed_at', sa.DateTime(), nullable=True),
        sa.Column('reversed_by_user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    op.create_index('idx_manual_payments_company_id', 'manual_payments', ['company_id'], unique=False)
    op.create_index('idx_manual_payments_status', 'manual_payments', ['status'], unique=False)

def downgrade():
    op.drop_index('idx_manual_payments_status', table_name='manual_payments')
    op.drop_index('idx_manual_payments_company_id', table_name='manual_payments')
    op.drop_table('manual_payments')
