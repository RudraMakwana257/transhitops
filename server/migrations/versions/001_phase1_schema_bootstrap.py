"""Phase 1 Schema Bootstrap — multi-tenancy foundation + auth hardening + soft-delete

Revision ID: 001_phase1_schema_bootstrap
Revises:
Create Date: 2026-07-16
"""

import uuid
import json
from datetime import datetime, timedelta

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_phase1_schema_bootstrap'
down_revision = None
branch_labels = None
depends_on = None

SEED_COMPANY_ID   = 'a0000000-0000-0000-0000-000000000001'
PLAN_STARTER_ID   = 'b0000000-0000-0000-0000-000000000001'
PLAN_PRO_ID       = 'b0000000-0000-0000-0000-000000000002'
PLAN_ENT_ID       = 'b0000000-0000-0000-0000-000000000003'
PLAN_CUSTOM_ID    = 'b0000000-0000-0000-0000-000000000004'
SEED_SUB_ID       = 'c0000000-0000-0000-0000-000000000001'

def upgrade():
    op.create_table('companies',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('slug', sa.String(length=100), nullable=False),
    sa.Column('domain', sa.String(length=150), nullable=True),
    sa.Column('logo_url', sa.String(length=500), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('gst_number', sa.String(length=50), nullable=True),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('email', sa.String(length=150), nullable=True),
    sa.Column('timezone', sa.String(length=50), nullable=True),
    sa.Column('language', sa.String(length=20), nullable=True),
    sa.Column('currency', sa.String(length=10), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('trial_ends_at', sa.DateTime(), nullable=True),
    sa.Column('vehicle_limit', sa.Integer(), nullable=True),
    sa.Column('driver_limit', sa.Integer(), nullable=True),
    sa.Column('user_limit', sa.Integer(), nullable=True),
    sa.Column('storage_used', sa.Numeric(precision=14, scale=2), nullable=True),
    sa.Column('settings', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('domain'),
    sa.UniqueConstraint('slug')
    )
    op.create_table('subscription_plans',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('slug', sa.String(length=100), nullable=False),
    sa.Column('price_monthly', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('price_yearly', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('features', sa.JSON(), nullable=True),
    sa.Column('limits', sa.JSON(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('slug')
    )
    op.create_table('users',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=True),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('email', sa.String(length=150), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('role', sa.String(length=50), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('last_login_at', sa.DateTime(), nullable=True),
    sa.Column('failed_login_count', sa.Integer(), nullable=False),
    sa.Column('locked_until', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_company_id'), ['company_id'], unique=False)

    op.create_table('vehicles',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=True),
    sa.Column('reg_number', sa.String(length=20), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('type', sa.String(length=50), nullable=False),
    sa.Column('capacity_kg', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('acquisition_cost', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('odometer_km', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('purchase_date', sa.Date(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=True),
    sa.Column('region', sa.String(length=100), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('reg_number')
    )
    with op.batch_alter_table('vehicles', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_vehicles_company_id'), ['company_id'], unique=False)

    op.create_table('drivers',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=True),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('license_number', sa.String(length=50), nullable=False),
    sa.Column('license_category', sa.String(length=10), nullable=False),
    sa.Column('license_expiry', sa.Date(), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=False),
    sa.Column('safety_score', sa.Numeric(precision=4, scale=2), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('license_number')
    )
    with op.batch_alter_table('drivers', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_drivers_company_id'), ['company_id'], unique=False)

    op.create_table('trips',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=True),
    sa.Column('trip_number', sa.String(length=20), nullable=False),
    sa.Column('vehicle_id', sa.UUID(), nullable=False),
    sa.Column('driver_id', sa.UUID(), nullable=False),
    sa.Column('source', sa.String(length=200), nullable=False),
    sa.Column('destination', sa.String(length=200), nullable=False),
    sa.Column('cargo_weight_kg', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('planned_distance_km', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('actual_distance_km', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=True),
    sa.Column('start_odometer', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('end_odometer', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('fuel_consumed_l', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('revenue', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('dispatched_at', sa.DateTime(), nullable=True),
    sa.Column('completed_at', sa.DateTime(), nullable=True),
    sa.Column('cancelled_at', sa.DateTime(), nullable=True),
    sa.Column('created_by', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['driver_id'], ['drivers.id'], ),
    sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('trip_number')
    )
    with op.batch_alter_table('trips', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_trips_company_id'), ['company_id'], unique=False)

    op.create_table('trip_events',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=True),
    sa.Column('trip_id', sa.UUID(), nullable=False),
    sa.Column('event_type', sa.String(length=50), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_by', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('trip_events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_trip_events_company_id'), ['company_id'], unique=False)

    op.create_table('maintenance_logs',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=True),
    sa.Column('vehicle_id', sa.UUID(), nullable=False),
    sa.Column('type', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=True),
    sa.Column('cost', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('technician', sa.String(length=100), nullable=True),
    sa.Column('scheduled_date', sa.Date(), nullable=True),
    sa.Column('completed_date', sa.Date(), nullable=True),
    sa.Column('odometer_at_service', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('created_by', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('maintenance_logs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_maintenance_logs_company_id'), ['company_id'], unique=False)

    op.create_table('fuel_logs',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=True),
    sa.Column('vehicle_id', sa.UUID(), nullable=False),
    sa.Column('driver_id', sa.UUID(), nullable=True),
    sa.Column('trip_id', sa.UUID(), nullable=True),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('liters', sa.Numeric(precision=8, scale=2), nullable=False),
    sa.Column('price_per_liter', sa.Numeric(precision=8, scale=2), nullable=False),
    sa.Column('total_cost', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('odometer_reading', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('fuel_station', sa.String(length=200), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['driver_id'], ['drivers.id'], ),
    sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ),
    sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('fuel_logs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_fuel_logs_company_id'), ['company_id'], unique=False)

    op.create_table('expenses',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=True),
    sa.Column('vehicle_id', sa.UUID(), nullable=True),
    sa.Column('trip_id', sa.UUID(), nullable=True),
    sa.Column('type', sa.String(length=50), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('created_by', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ),
    sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('expenses', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_expenses_company_id'), ['company_id'], unique=False)

    op.create_table('vehicle_health',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=True),
    sa.Column('vehicle_id', sa.UUID(), nullable=False),
    sa.Column('health_score', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('fuel_efficiency_score', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('maintenance_score', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('utilization_score', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('age_score', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('cost_score', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('last_calculated', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('vehicle_id')
    )
    with op.batch_alter_table('vehicle_health', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_vehicle_health_company_id'), ['company_id'], unique=False)

    op.create_table('notifications',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=True),
    sa.Column('user_id', sa.UUID(), nullable=True),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('type', sa.String(length=50), nullable=True),
    sa.Column('is_read', sa.Boolean(), nullable=True),
    sa.Column('entity_type', sa.String(length=50), nullable=True),
    sa.Column('entity_id', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_notifications_company_id'), ['company_id'], unique=False)

    op.create_table('audit_logs',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=True),
    sa.Column('user_id', sa.UUID(), nullable=True),
    sa.Column('action', sa.String(length=100), nullable=False),
    sa.Column('entity_type', sa.String(length=50), nullable=True),
    sa.Column('entity_id', sa.UUID(), nullable=True),
    sa.Column('old_value', sa.JSON(), nullable=True),
    sa.Column('new_value', sa.JSON(), nullable=True),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_audit_logs_company_id'), ['company_id'], unique=False)

    op.create_table('company_subscriptions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('plan_id', sa.UUID(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('current_period_start', sa.DateTime(), nullable=True),
    sa.Column('current_period_end', sa.DateTime(), nullable=True),
    sa.Column('trial_ends_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['plan_id'], ['subscription_plans.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('company_subscriptions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_company_subscriptions_company_id'), ['company_id'], unique=False)

    op.create_table('company_features',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('feature_key', sa.String(length=100), nullable=False),
    sa.Column('is_enabled', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('company_id', 'feature_key', name='uq_company_feature')
    )
    with op.batch_alter_table('company_features', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_company_features_company_id'), ['company_id'], unique=False)

    op.create_table('login_attempts',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(length=150), nullable=False),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('success', sa.Boolean(), nullable=False),
    sa.Column('attempted_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('login_attempts', schema=None) as batch_op:
        batch_op.create_index('idx_login_attempts_email_time', ['email', 'attempted_at'], unique=False)
        batch_op.create_index('idx_login_attempts_ip_time', ['ip_address', 'attempted_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_login_attempts_email'), ['email'], unique=False)

    op.create_table('password_reset_tokens',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('token', sa.String(length=255), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('used_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('password_reset_tokens', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_password_reset_tokens_token'), ['token'], unique=True)
        batch_op.create_index(batch_op.f('ix_password_reset_tokens_user_id'), ['user_id'], unique=False)


    # ── 10. DATA BACKFILL ─────────────────────────────────────────────────────
    now_str       = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    trial_end_str = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')

    def _exec(sql: str) -> None:
        bind = op.get_bind()
        bind.exec_driver_sql(sql)

    # 10a. Insert seed company
    _exec(
        f"INSERT INTO companies "
        f"(id, name, slug, email, timezone, language, currency, "
        f" is_active, vehicle_limit, driver_limit, user_limit, storage_used, "
        f" settings, created_at, updated_at) "
        f"VALUES ("
        f"'{SEED_COMPANY_ID}', 'TransitOps Seed Company', 'transitops-seed', "
        f"'admin@transitops.com', 'Asia/Kolkata', 'en', 'INR', "
        f"true, 100, 100, 20, 0, "
        f"'{{}}'::jsonb, "
        f"'{now_str}', '{now_str}'"
        f") ON CONFLICT (id) DO NOTHING;"
    )

    # 10b. Seed subscription plans
    plans = [
        {
            'id': PLAN_STARTER_ID, 'name': 'Starter', 'slug': 'starter',
            'price_monthly': 4999, 'price_yearly': 49999,
            'features': {
                'ai_chat': False, 'analytics': True, 'maintenance': True,
                'fuel': True, 'expenses': True, 'gps': False, 'payroll': False,
                'inventory': False, 'accounting': False, 'documents': False,
                'public_api': False, 'white_label': False,
            },
            'limits': {'vehicle_limit': 5, 'driver_limit': 10, 'user_limit': 3,
                       'storage_gb': 5, 'ai_calls_per_month': 0},
        },
        {
            'id': PLAN_PRO_ID, 'name': 'Professional', 'slug': 'professional',
            'price_monthly': 9999, 'price_yearly': 99999,
            'features': {
                'ai_chat': True, 'analytics': True, 'maintenance': True,
                'fuel': True, 'expenses': True, 'gps': True, 'payroll': False,
                'inventory': False, 'accounting': False, 'documents': True,
                'public_api': False, 'white_label': False,
            },
            'limits': {'vehicle_limit': 25, 'driver_limit': 50, 'user_limit': 10,
                       'storage_gb': 25, 'ai_calls_per_month': 500},
        },
        {
            'id': PLAN_ENT_ID, 'name': 'Enterprise', 'slug': 'enterprise',
            'price_monthly': 19999, 'price_yearly': 199999,
            'features': {
                'ai_chat': True, 'analytics': True, 'maintenance': True,
                'fuel': True, 'expenses': True, 'gps': True, 'payroll': True,
                'inventory': True, 'accounting': True, 'documents': True,
                'public_api': True, 'white_label': False,
            },
            'limits': {'vehicle_limit': 100, 'driver_limit': 200, 'user_limit': 50,
                       'storage_gb': 100, 'ai_calls_per_month': 5000},
        },
        {
            'id': PLAN_CUSTOM_ID, 'name': 'Custom', 'slug': 'custom',
            'price_monthly': 0, 'price_yearly': 0,
            'features': {
                'ai_chat': True, 'analytics': True, 'maintenance': True,
                'fuel': True, 'expenses': True, 'gps': True, 'payroll': True,
                'inventory': True, 'accounting': True, 'documents': True,
                'public_api': True, 'white_label': True,
            },
            'limits': {'vehicle_limit': 9999, 'driver_limit': 9999, 'user_limit': 9999,
                       'storage_gb': 1000, 'ai_calls_per_month': 99999},
        },
    ]

    for plan in plans:
        features_json = json.dumps(plan['features']).replace("'", "''")
        limits_json   = json.dumps(plan['limits']).replace("'", "''")
        _exec(
            f"INSERT INTO subscription_plans "
            f"(id, name, slug, price_monthly, price_yearly, features, limits, "
            f" is_active, created_at, updated_at) "
            f"VALUES ("
            f"'{plan['id']}', '{plan['name']}', '{plan['slug']}', "
            f"{plan['price_monthly']}, {plan['price_yearly']}, "
            f"'{features_json}'::jsonb, '{limits_json}'::jsonb, "
            f"true, '{now_str}', '{now_str}'"
            f") ON CONFLICT (id) DO NOTHING;"
        )

    # 10d. Subscribe seed company to Professional plan (trialing 30 days)
    _exec(
        f"INSERT INTO company_subscriptions "
        f"(id, company_id, plan_id, status, "
        f" current_period_start, current_period_end, trial_ends_at, "
        f" created_at, updated_at) "
        f"VALUES ("
        f"'{SEED_SUB_ID}', '{SEED_COMPANY_ID}', '{PLAN_PRO_ID}', 'trialing', "
        f"'{now_str}', NULL, '{trial_end_str}', "
        f"'{now_str}', '{now_str}'"
        f") ON CONFLICT (id) DO NOTHING;"
    )

    # 10e. Enable all features for seed company
    all_features = [
        'ai_chat', 'analytics', 'maintenance', 'fuel', 'expenses',
        'gps', 'payroll', 'inventory', 'accounting', 'documents',
        'public_api', 'white_label',
    ]
    import uuid
    for feature_key in all_features:
        feature_id = str(uuid.uuid4())
        _exec(
            f"INSERT INTO company_features "
            f"(id, company_id, feature_key, is_enabled, created_at) "
            f"VALUES ('{feature_id}', '{SEED_COMPANY_ID}', '{feature_key}', true, '{now_str}') "
            f"ON CONFLICT ON CONSTRAINT uq_company_feature DO NOTHING;"
        )

    # 10f. Seed Super Admin User
    super_admin_id = str(uuid.uuid4())
    pw_hash = '$2b$12$4RROGrV8r.fXmJgPbyqbuOjajxtkgvw1sBX.rvObYPPDaFLQQh1BG'
    _exec(
        f"INSERT INTO users "
        f"(id, name, email, password_hash, role, is_active, failed_login_count, created_at, updated_at) "
        f"VALUES ('{super_admin_id}', 'Super Admin', 'admin@transitops.com', '{pw_hash}', 'super_admin', true, 0, '{now_str}', '{now_str}') "
        f"ON CONFLICT (email) DO NOTHING;"
    )
def downgrade():

    def _exec(sql: str) -> None:
        bind = op.get_bind()
        bind.exec_driver_sql(sql)

    _exec(f"DELETE FROM company_features WHERE company_id = '{SEED_COMPANY_ID}';")
    _exec("DELETE FROM users WHERE email = 'admin@transitops.com';")
    _exec(f"DELETE FROM company_subscriptions WHERE company_id = '{SEED_COMPANY_ID}';")
    _exec(
        f"DELETE FROM subscription_plans WHERE id IN ("
        f"'{PLAN_STARTER_ID}','{PLAN_PRO_ID}','{PLAN_ENT_ID}','{PLAN_CUSTOM_ID}');"
    )
    _exec(f"DELETE FROM companies WHERE id = '{SEED_COMPANY_ID}';")
    with op.batch_alter_table('password_reset_tokens', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_password_reset_tokens_user_id'))
        batch_op.drop_index(batch_op.f('ix_password_reset_tokens_token'))

    op.drop_table('password_reset_tokens')
    with op.batch_alter_table('login_attempts', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_login_attempts_email'))
        batch_op.drop_index('idx_login_attempts_ip_time')
        batch_op.drop_index('idx_login_attempts_email_time')

    op.drop_table('login_attempts')
    with op.batch_alter_table('company_features', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_company_features_company_id'))

    op.drop_table('company_features')
    with op.batch_alter_table('company_subscriptions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_company_subscriptions_company_id'))

    op.drop_table('company_subscriptions')
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_audit_logs_company_id'))

    op.drop_table('audit_logs')
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notifications_company_id'))

    op.drop_table('notifications')
    with op.batch_alter_table('vehicle_health', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_vehicle_health_company_id'))

    op.drop_table('vehicle_health')
    with op.batch_alter_table('expenses', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_expenses_company_id'))

    op.drop_table('expenses')
    with op.batch_alter_table('fuel_logs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_fuel_logs_company_id'))

    op.drop_table('fuel_logs')
    with op.batch_alter_table('maintenance_logs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_maintenance_logs_company_id'))

    op.drop_table('maintenance_logs')
    with op.batch_alter_table('trip_events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_trip_events_company_id'))

    op.drop_table('trip_events')
    with op.batch_alter_table('trips', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_trips_company_id'))

    op.drop_table('trips')
    with op.batch_alter_table('drivers', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_drivers_company_id'))

    op.drop_table('drivers')
    with op.batch_alter_table('vehicles', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_vehicles_company_id'))

    op.drop_table('vehicles')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_company_id'))

    op.drop_table('users')
    op.drop_table('subscription_plans')
    op.drop_table('companies')
