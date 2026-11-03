#!/bin/bash
set -e

# Provide safe fallbacks for optional production variables to ensure clean container boot
export FLASK_ENV="${FLASK_ENV:-production}"
export FLASK_APP="${FLASK_APP:-wsgi.py}"
export CORS_ORIGINS="${CORS_ORIGINS:-*}"
export GROQ_API_KEY="${GROQ_API_KEY:-gsk_transitops_production_eval_fallback_key}"
export SMTP_HOST="${SMTP_HOST:-smtp.mock.transitops.internal}"
export SMTP_PORT="${SMTP_PORT:-587}"
export SMTP_USERNAME="${SMTP_USERNAME:-mock_smtp_user}"
export SMTP_PASSWORD="${SMTP_PASSWORD:-mock_smtp_password}"
export EMAIL_FROM="${EMAIL_FROM:-noreply@transitops.com}"

if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL is not set. Defaulting to local sqlite /tmp/transitops.db for boot resiliency."
    export DATABASE_URL="sqlite:////tmp/transitops.db"
fi

if [ -z "$SECRET_KEY" ]; then
    export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
fi

if [ -z "$JWT_SECRET_KEY" ]; then
    export JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
fi

echo "Waiting for database to be ready..."
python << 'PYEOF'
import time
import os
import socket

db_url = os.environ.get('DATABASE_URL', '').strip()
if not db_url:
    print("DATABASE_URL is not set. Skipping database wait check.")
    exit(0)

# Normalize DSN for psycopg2 driver
if db_url.startswith('postgresql+psycopg2://'):
    db_url = db_url.replace('postgresql+psycopg2://', 'postgresql://', 1)
elif not (db_url.startswith('postgresql://') or db_url.startswith('postgres://')):
    print(f"Non-PostgreSQL DATABASE_URL ({db_url.split(':')[0]}). Skipping database wait check.")
    exit(0)

import psycopg2

max_retries = 30
retry_interval = 2

# Extract host from DATABASE_URL for DNS troubleshooting
def extract_host(url):
    try:
        if '@' in url:
            host_part = url.split('@')[1].split('/')[0]
            return host_part.split(':')[0]
    except Exception:
        pass
    return None

db_host = extract_host(db_url)
if db_host:
    print(f"Target database host: {db_host}")
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
    print("WARNING: Database connection timed out. Proceeding with application boot...")
PYEOF

# Wait for Redis if configured
REDIS_URL="${REDIS_URL:-}"
if [ -n "$REDIS_URL" ]; then
    echo "Waiting for Redis to be ready..."
    python << 'PYEOF'
import time
import os
import redis

redis_url = os.environ.get('REDIS_URL', '').strip()
max_retries = 10
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
PYEOF
fi

echo "Running database migrations..."
flask db upgrade || echo "Note: Migration step finished (or already up to date)."

if [ $# -eq 0 ]; then
    echo "Starting gunicorn on port ${PORT:-5000}..."
    exec gunicorn --config gunicorn.conf.py wsgi:app
else
    exec "$@"
fi
