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

    # Warn on obvious defaults
    secret_key = os.environ.get('SECRET_KEY', '')
    jwt_secret = os.environ.get('JWT_SECRET_KEY', '')
    pg_password = os.environ.get('POSTGRES_PASSWORD', '')

    if 'change-this' in secret_key.lower():
        logger.warning('WARNING: SECRET_KEY contains "change-this". This is insecure!')
        
    if 'change-this' in jwt_secret.lower():
        logger.warning('WARNING: JWT_SECRET_KEY contains "change-this". This is insecure!')
        
    if pg_password == 'changeme':
        logger.warning('WARNING: POSTGRES_PASSWORD is "changeme". This is insecure!')
