import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-change-in-prod')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-dev-secret-change-in-prod')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://transitops_user:transit123@localhost:5432/transitops_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = 8 * 60 * 60
    JWT_REFRESH_TOKEN_EXPIRES = 7 * 24 * 60 * 60
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_CSRF_PROTECT = False

class ProductionConfig(Config):
    SECRET_KEY = os.getenv('SECRET_KEY')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_CSRF_PROTECT = True
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'