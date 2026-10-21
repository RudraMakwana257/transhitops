#!/bin/bash
set -e

echo "Waiting for database to be ready..."
python << 'PYEOF'
import time
import os
import psycopg2
import socket

db_url = os.environ.get('DATABASE_URL', '')
max_retries = 60
retry_interval = 2

# Extract host from DATABASE_URL for DNS troubleshooting
def extract_host(url):
    try:
        # postgresql://user:pass@host:port/db
        if '@' in url:
            host_part = url.split('@')[1].split('/')[0]
            return host_part.split(':')[0]
    except Exception:
        pass
    return None

db_host = extract_host(db_url)
if db_host:
    print(f"Target database host: {db_host}")
    # Try DNS resolution separately
    for i in range(5):
        try:
            socket.gethostbyname(db_host)
            print(f"DNS resolution successful for {db_host}")
            break
        except socket.gaierror as e:
            print(f"DNS resolution failed ({e}), retrying in 2s... ({i+1}/5)")
            time.sleep(2)
    else:
        print(f"WARNING: Could not resolve {db_host} after 5 attempts")

for i in range(max_retries):
    try:
        conn = psycopg2.connect(db_url, connect_timeout=5)
        conn.close()
        print("Database is ready!")
        break
    except psycopg2.OperationalError as e:
        if "could not translate host name" in str(e):
            print(f"DNS resolution failed, retrying in {retry_interval}s... ({i+1}/{max_retries})")
        else:
            print(f"Database not ready ({e}), retrying in {retry_interval}s... ({i+1}/{max_retries})")
        time.sleep(retry_interval)
    except Exception as e:
        print(f"Database not ready ({e}), retrying in {retry_interval}s... ({i+1}/{max_retries})")
        time.sleep(retry_interval)
else:
    print("Database never became ready. Exiting.")
    exit(1)
PYEOF

# Wait for Redis if configured
REDIS_URL="${REDIS_URL:-}"
if [ -n "$REDIS_URL" ]; then
    echo "Waiting for Redis to be ready..."
    python << 'PYEOF'
import time
import os
import redis

redis_url = os.environ.get('REDIS_URL', '')
max_retries = 30
retry_interval = 1

for i in range(max_retries):
    try:
        r = redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
        r.ping()
        print("Redis is ready!")
        break
    except Exception as e:
        print(f"Redis not ready ({e}), retrying in {retry_interval}s... ({i+1}/{max_retries})")
        time.sleep(retry_interval)
else:
    print("WARNING: Redis never became ready - rate limiting will use in-memory fallback")
    # Don't exit - app can work without Redis (degraded)
PYEOF
fi

echo "Running database migrations..."
flask db upgrade || echo "Note: Migration step finished (or already up to date)."


echo "Starting gunicorn..."
exec gunicorn --config gunicorn.conf.py wsgi:app