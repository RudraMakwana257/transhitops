import os
import sys
import logging

logger = logging.getLogger(__name__)

def validate_environment():
    """
    Validates that all required environment variables are present and secure.
    If production required variables are missing, raises RuntimeError.
    Warnings are printed for insecure default values.
    """
    env = os.environ.get('FLASK_ENV', 'development').lower()
    is_production = env == 'production'

    # Required vars everywhere
    required_vars = [
        'DATABASE_URL',
        'SECRET_KEY',
        'JWT_SECRET_KEY'
    ]

    # Additional vars required only in production
    if is_production:
        required_vars.extend([
            'GROQ_API_KEY',
            'CORS_ORIGINS'
        ])

    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        msg = f"Missing required environment variables: {', '.join(missing_vars)}"
        if is_production:
            raise RuntimeError(msg)
        else:
            logger.warning(msg)

    # Warn or raise on obvious defaults
    secret_key = os.environ.get('SECRET_KEY', '')
    jwt_secret = os.environ.get('JWT_SECRET_KEY', '')
    pg_password = os.environ.get('POSTGRES_PASSWORD', '')

    insecure_patterns = ['change-this', 'dev-secret-key', 'dev-jwt-key', 'changeme']

    for pattern in insecure_patterns:
        if pattern in secret_key.lower() or secret_key == 'dev-secret-key':
            msg = 'CRITICAL SECURITY ERROR: SECRET_KEY is set to an insecure default value!'
            if is_production:
                raise RuntimeError(msg)
            logger.warning(msg)
            
        if pattern in jwt_secret.lower() or jwt_secret == 'dev-jwt-key':
            msg = 'CRITICAL SECURITY ERROR: JWT_SECRET_KEY is set to an insecure default value!'
            if is_production:
                raise RuntimeError(msg)
            logger.warning(msg)
            
        if pattern in pg_password.lower() and is_production:
            logger.warning('WARNING: POSTGRES_PASSWORD uses an insecure default in production!')
