import os
import logging
import redis

logger = logging.getLogger(__name__)

_redis_client = None
_in_memory_blocklist = set()

def get_redis_client():
    global _redis_client
    if _redis_client is None:
        redis_url = os.environ.get('REDIS_URL')
        if redis_url:
            try:
                _redis_client = redis.from_url(redis_url, decode_responses=True)
                _redis_client.ping()
            except Exception as e:
                logger.warning(f"Redis connection failed for token blocklist, falling back to memory: {e}")
                _redis_client = False
        else:
            _redis_client = False
    return _redis_client if _redis_client else None

def block_token(jti: str, ttl_seconds: int = 28800) -> bool:
    """Add a JWT jti identifier to the revocation blocklist."""
    if not jti:
        return False
    
    client = get_redis_client()
    if client:
        try:
            client.setex(f"jwt:revoked:{jti}", ttl_seconds, "revoked")
            return True
        except Exception as e:
            logger.error(f"Failed to record token revocation in Redis: {e}")
    
    _in_memory_blocklist.add(jti)
    return True

def is_token_blocked(jti: str) -> bool:
    """Check if a JWT jti identifier has been revoked."""
    if not jti:
        return False
    
    client = get_redis_client()
    if client:
        try:
            val = client.get(f"jwt:revoked:{jti}")
            if val is not None:
                return True
        except Exception as e:
            logger.error(f"Failed to check token revocation in Redis: {e}")
            
    return jti in _in_memory_blocklist
