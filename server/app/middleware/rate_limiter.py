import os
import logging
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import request

logger = logging.getLogger(__name__)

# Named limit constants
AUTH_LIMIT = "5 per minute"
GENERAL_LIMIT = "100 per minute"
AI_LIMIT = "10 per minute"
ADMIN_LIMIT = "200 per minute"
EXPORT_LIMIT = "10 per hour"

def get_client_ip():
    """Extract true client IP normalized via ProxyFix reverse proxy configuration."""
    # Flask-Limiter's get_remote_address respects X-Forwarded-For when ProxyFix is configured
    return get_remote_address()

# Configure storage backend - Redis preferred, memory fallback for local dev
redis_url = os.environ.get("REDIS_URL")
if redis_url:
    # Use Redis with connection pooling for production
    storage_uri = redis_url
    logger.info("Rate limiter using Redis backend")
else:
    # Memory storage ONLY for local development (single worker)
    storage_uri = "memory://"
    logger.warning("Rate limiter using in-memory storage - NOT suitable for production with multiple workers")

default_limit_str = os.environ.get("RATE_LIMIT_DEFAULT", "120 per minute")
default_limits = [default_limit_str] if default_limit_str else None

# Create limiter with proper configuration
limiter = Limiter(
    key_func=get_client_ip,
    storage_uri=storage_uri,
    strategy="fixed-window",
    default_limits=default_limits,
    # Storage options for Redis
    storage_options={
        "socket_connect_timeout": 1,
        "socket_timeout": 1,
        "retry_on_timeout": True,
    } if redis_url else {},
    # Disable headers in development for cleaner testing
    headers_enabled=os.environ.get('FLASK_ENV', 'development').lower() != 'development',
)

# Note: In production with Redis, Flask-Limiter handles connection failures gracefully.
# If Redis is unavailable, it will log errors but continue operating (may allow some requests through).
# For strict enforcement, ensure Redis is healthy and monitored.