import os
import pytest
import sqlalchemy.sql.sqltypes

original_bind_processor = sqlalchemy.sql.sqltypes.UUID.bind_processor

def patched_bind_processor(self, dialect):
    if dialect.name == 'sqlite':
        def process(value):
            if value is None:
                return None
            import uuid
            if isinstance(value, str):
                try:
                    value = uuid.UUID(value)
                except ValueError:
                    pass
            if isinstance(value, uuid.UUID):
                return value.hex
            return value
        return process
    return original_bind_processor(self, dialect)

sqlalchemy.sql.sqltypes.UUID.bind_processor = patched_bind_processor

os.environ['FLASK_ENV'] = 'testing'
os.environ['DATABASE_URL'] = os.environ.get('TEST_DATABASE_URL', 'sqlite:///:memory:')

from app import create_app, db
from app.models.user import User
from app.models.company import Company
from app.models.company_feature import CompanyFeature
from flask_jwt_extended import create_access_token

@pytest.fixture(scope='session')
def app():
    from app.middleware.rate_limiter import limiter
    limiter.enabled = False
    app = create_app()
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': os.environ['DATABASE_URL'],
        'JWT_SECRET_KEY': 'test-jwt-secret-key-do-not-use-in-prod',
        'SECRET_KEY': 'test-secret-key',
        'RATELIMIT_ENABLED': False
    })

    with app.app_context():
        # Only create all if sqlite, else rely on migrations
        if 'sqlite' in os.environ['DATABASE_URL']:
            db.create_all()
        else:
            # Drop all and run flask-migrate? Better to just create_all
            db.drop_all()
            db.create_all()

        yield app

        db.session.remove()
        db.drop_all()

from sqlalchemy.orm import scoped_session, sessionmaker

@pytest.fixture(autouse=True)
def db_session_isolation(app, seed_data, request):
    if 'sqlite' in os.environ.get('DATABASE_URL', ''):
        yield
        try:
            db.session.rollback()
        except Exception:
            pass
        try:
            db.session.remove()
        except Exception:
            pass
        return

    if 'concurrent' in request.node.name:
        yield
        with app.app_context():
            try:
                from app.models.operational_exception import OperationalException
                from app.models.driver import Driver
                OperationalException.query.filter(
                    OperationalException.title.ilike('%expired%') | OperationalException.type.ilike('%expired%')
                ).delete(synchronize_session=False)
                Driver.query.filter_by(name="Concurrent Expired Driver").delete(synchronize_session=False)
                db.session.commit()
            except Exception:
                db.session.rollback()
            finally:
                db.session.remove()
        return

    with app.app_context():
        conn = db.engine.connect()
        trans = conn.begin()
        orig_session = db.session
        db.session = scoped_session(
            sessionmaker(bind=conn, join_transaction_mode='create_savepoint')
        )
        yield
        try:
            db.session.remove()
        except Exception:
            pass
        try:
            trans.rollback()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass
        db.session = orig_session

@pytest.fixture
def client(app):
    return app.test_client()

from app.models.subscription_plan import SubscriptionPlan
from app.models.company_subscription import CompanySubscription

@pytest.fixture(scope='session')
def seed_data(app):
    with app.app_context():
        # Subscription Plans
        plan_free = SubscriptionPlan(name='Free', slug='free', price_monthly=0, limits={'user_limit': 2, 'vehicle_limit': 3, 'driver_limit': 3, 'active_trip_limit': 5})
        plan_starter = SubscriptionPlan(name='Starter', slug='starter', price_monthly=49, limits={'user_limit': 5, 'vehicle_limit': 10, 'driver_limit': 10, 'active_trip_limit': 20})
        plan_growth = SubscriptionPlan(name='Growth', slug='growth', price_monthly=199, limits={'user_limit': 15, 'vehicle_limit': 50, 'driver_limit': 50, 'active_trip_limit': 100})
        plan_business = SubscriptionPlan(name='Business', slug='business', price_monthly=499, limits={'user_limit': 50, 'vehicle_limit': 200, 'driver_limit': 200, 'active_trip_limit': 500})
        plan_ent = SubscriptionPlan(name='Enterprise', slug='enterprise', price_monthly=999, limits={'user_limit': -1, 'vehicle_limit': -1, 'driver_limit': -1, 'active_trip_limit': -1})
        db.session.add_all([plan_free, plan_starter, plan_growth, plan_business, plan_ent])
        db.session.flush()

        # Super Admin
        super_admin = User(name='Super Admin', email='super@transitops.com', role='super_admin', is_active=True)
        super_admin.set_password('Admin@123')
        db.session.add(super_admin)

        # Companies
        company_a = Company(name='Company A', slug='company-a', email='a@company.com')
        company_b = Company(name='Company B', slug='company-b', email='b@company.com')
        db.session.add_all([company_a, company_b])
        db.session.flush()

        # Subscriptions
        sub_a = CompanySubscription(company_id=company_a.id, plan_id=plan_growth.id, status='active')
        sub_b = CompanySubscription(company_id=company_b.id, plan_id=plan_starter.id, status='active')
        db.session.add_all([sub_a, sub_b])

        # Company Features
        for feature in ['vehicles', 'drivers', 'trips', 'maintenance', 'fuel', 'expenses', 'dashboard', 'analytics', 'ai_chat', 'exceptions']:
            db.session.add(CompanyFeature(company_id=company_a.id, feature_key=feature, is_enabled=True))
            db.session.add(CompanyFeature(company_id=company_b.id, feature_key=feature, is_enabled=True))

        # Company A Admin
        admin_a = User(name='Admin A', email='admin@companya.com', role='fleet_manager', company_id=company_a.id, is_active=True)
        admin_a.set_password('Admin@123')
        
        # Company B Admin
        admin_b = User(name='Admin B', email='admin@companyb.com', role='fleet_manager', company_id=company_b.id, is_active=True)
        admin_b.set_password('Admin@123')
        
        db.session.add_all([admin_a, admin_b])
        db.session.commit()

        return {
            'super_admin_id': str(super_admin.id),
            'company_a_id': str(company_a.id),
            'company_b_id': str(company_b.id),
            'admin_a_id': str(admin_a.id),
            'admin_b_id': str(admin_b.id)
        }

@pytest.fixture
def super_admin_token(app, seed_data):
    with app.app_context():
        return create_access_token(identity=seed_data['super_admin_id'], additional_claims={'role': 'super_admin', 'company_id': None})

@pytest.fixture
def company_a_token(app, seed_data):
    with app.app_context():
        return create_access_token(identity=seed_data['admin_a_id'], additional_claims={'role': 'fleet_manager', 'company_id': seed_data['company_a_id']})

@pytest.fixture
def company_b_token(app, seed_data):
    with app.app_context():
        return create_access_token(identity=seed_data['admin_b_id'], additional_claims={'role': 'fleet_manager', 'company_id': seed_data['company_b_id']})

@pytest.fixture
def company_a_id(seed_data):
    return seed_data['company_a_id']

@pytest.fixture
def company_b_id(seed_data):
    return seed_data['company_b_id']

@pytest.fixture
def super_admin_user_id(seed_data):
    return seed_data['super_admin_id']
