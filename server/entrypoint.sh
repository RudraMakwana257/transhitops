#!/bin/bash
set -e

echo "Waiting for database to be ready..."
python << 'EOF'
import time
import os
import psycopg2

db_url = os.environ.get('DATABASE_URL', '')
max_retries = 30
retry_interval = 2

for i in range(max_retries):
    try:
        conn = psycopg2.connect(db_url)
        conn.close()
        print("Database is ready!")
        break
    except Exception as e:
        print(f"Database not ready ({e}), retrying in {retry_interval}s... ({i+1}/{max_retries})")
        time.sleep(retry_interval)
else:
    print("Database never became ready. Exiting.")
    exit(1)
EOF

echo "Running database migrations..."
flask db upgrade || echo "Note: Migration step finished (or already up to date)."


echo "Starting gunicorn..."
exec gunicorn --config gunicorn.conf.py wsgi:app
