import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 10 * 1024 * 1024))  # 10 MB payload ceiling
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': int(os.environ.get('DB_POOL_SIZE', '10')),
        'max_overflow': int(os.environ.get('DB_MAX_OVERFLOW', '20')),
        'pool_timeout': int(os.environ.get('DB_POOL_TIMEOUT', '30')),
        'pool_recycle': int(os.environ.get('DB_POOL_RECYCLE', '300')),
        'pool_pre_ping': True,
    }
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 28800))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES', 604800))
    )
    REDIS_URL = os.environ.get('REDIS_URL')
    GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
    APP_VERSION = os.environ.get('APP_VERSION', '1.0.0')
    APP_URL = os.environ.get('APP_URL')

class DevelopmentConfig(Config):
    DEBUG = True
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-key')
    APP_URL = os.environ.get('APP_URL', 'http://localhost:5000')
    JWT_COOKIE_SECURE = False
    SESSION_COOKIE_SECURE = False
    JWT_COOKIE_CSRF_PROTECT = False

class TestingConfig(Config):
    TESTING = True
    SECRET_KEY = os.environ.get('SECRET_KEY', 'test-secret-key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'test-jwt-secret-key')
    APP_URL = os.environ.get('APP_URL', 'http://localhost:5000')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'TEST_DATABASE_URL', 
        os.environ.get('DATABASE_URL', '') + '_test'
    )
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_CSRF_PROTECT = False

class ProductionConfig(Config):
    DEBUG = False
    JWT_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    JWT_COOKIE_CSRF_PROTECT = True
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': int(os.environ.get('DB_POOL_SIZE', '3')),
        'max_overflow': int(os.environ.get('DB_MAX_OVERFLOW', '5')),
        'pool_timeout': int(os.environ.get('DB_POOL_TIMEOUT', '20')),
        'pool_recycle': int(os.environ.get('DB_POOL_RECYCLE', '280')),
        'pool_pre_ping': True,
    }

    def __init__(self):
        insecure_keys = {'dev-secret-key', 'dev-jwt-key', 'change-this', 'changeme', ''}
        secret = os.environ.get('SECRET_KEY', '')
        jwt_secret = os.environ.get('JWT_SECRET_KEY', '')
        pg_password = os.environ.get('POSTGRES_PASSWORD', '')
        db_url = os.environ.get('DATABASE_URL', '')
        if secret in insecure_keys or jwt_secret in insecure_keys:
            raise ValueError(
                "CRITICAL CONFIGURATION ERROR: Production environment requires secure, explicit "
                "SECRET_KEY and JWT_SECRET_KEY environment variables."
            )
        if pg_password in insecure_keys or 'changeme' in db_url:
            raise ValueError(
                "CRITICAL CONFIGURATION ERROR: Production environment requires secure, explicit "
                "POSTGRES_PASSWORD and DATABASE_URL without default credentials."
            )
        cors_origins = os.environ.get('CORS_ORIGINS', '')
        if cors_origins and any(p in cors_origins.lower() for p in ['<replace', 'replace-with', 'changeme']):
            raise ValueError(
                "CRITICAL CONFIGURATION ERROR: Production environment requires a real, valid "
                "CORS_ORIGINS environment variable (placeholder detected)."
            )