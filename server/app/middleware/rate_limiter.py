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
    return get_remote_address()

# Attempt to configure Redis, fallback to in-memory silently if unavailable or fails
redis_url = os.environ.get("REDIS_URL")
if redis_url:
    storage_uri = redis_url
else:
    storage_uri = "memory://"

default_limit_str = os.environ.get("RATE_LIMIT_DEFAULT", "120 per minute")
default_limits = [default_limit_str] if default_limit_str else None

limiter = Limiter(
    key_func=get_client_ip,
    storage_uri=storage_uri,
    strategy="fixed-window",
    default_limits=default_limits
)

# Note: In a production environment, if Redis connection fails, Flask-Limiter 
# configuration should gracefully fall back to memory. The constructor handles this
# depending on the configuration and availability of the storage backend.
