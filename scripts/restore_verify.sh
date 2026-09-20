#!/bin/bash
set -eo pipefail

# ==============================================================================
# TransitOps Automated PostgreSQL Restore & Integrity Verification Script
# ==============================================================================

ENCRYPTED_FILE="$1"
: "${BACKUP_ENCRYPTION_KEY:?ERROR: BACKUP_ENCRYPTION_KEY must be set — refusing to decrypt backups with no default}"
ENCRYPTION_PASSPHRASE="${BACKUP_ENCRYPTION_KEY}"

if [ -z "${ENCRYPTED_FILE}" ] || [ ! -f "${ENCRYPTED_FILE}" ]; then
    echo "Usage: $0 <path_to_encrypted_backup_file>"
    exit 1
fi

TEMP_RESTORE_DB="transitops_restore_test_$(date +%s)"
DECRYPTED_FILE="${ENCRYPTED_FILE%.enc}"
SQL_FILE="${DECRYPTED_FILE%.gz}"

PGHOST="${POSTGRES_HOST:-${POSTGRES_SERVER:-localhost}}"
PGPORT="${POSTGRES_PORT:-5435}"
PGUSER="${POSTGRES_USER:-transitops}"
: "${POSTGRES_PASSWORD:?ERROR: POSTGRES_PASSWORD must be set — refusing to run with no default}"
PGPASSWORD="${POSTGRES_PASSWORD}"

echo "=========================================="
echo "🧪 Starting TransitOps Restore Verification"
echo "Target Backup: ${ENCRYPTED_FILE}"
echo "Host/Port:     ${PGHOST}:${PGPORT}"
echo "Test DB:       ${TEMP_RESTORE_DB}"
echo "=========================================="

# Helper function for executing SQL commands
run_sql() {
    local db="$1"
    local sql="$2"
    if command -v psql >/dev/null 2>&1 && PGPASSWORD="${PGPASSWORD}" pg_isready -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" >/dev/null 2>&1; then
        PGPASSWORD="${PGPASSWORD}" psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${db}" -t -c "${sql}"
    elif docker ps --format '{{.Names}}' | grep -q "transitops-postgres-1"; then
        docker exec transitops-postgres-1 psql -U "${PGUSER}" -d "${db}" -t -c "${sql}"
    else
        echo "❌ ERROR: Cannot connect to PostgreSQL"
        exit 1
    fi
}

run_sql_file() {
    local db="$1"
    local sql_file="$2"
    if command -v psql >/dev/null 2>&1 && PGPASSWORD="${PGPASSWORD}" pg_isready -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" >/dev/null 2>&1; then
        PGPASSWORD="${PGPASSWORD}" psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${db}" < "${sql_file}"
    elif docker ps --format '{{.Names}}' | grep -q "transitops-postgres-1"; then
        docker exec -i transitops-postgres-1 psql -U "${PGUSER}" -d "${db}" < "${sql_file}"
    else
        echo "❌ ERROR: Cannot connect to PostgreSQL"
        exit 1
    fi
}

# 1. Decrypt Backup
echo "1. Decrypting backup file..."
openssl enc -d -aes-256-cbc -pbkdf2 -in "${ENCRYPTED_FILE}" -out "${DECRYPTED_FILE}" -pass pass:"${ENCRYPTION_PASSPHRASE}"

# 2. Decompress Backup
echo "2. Decompressing SQL dump..."
gunzip -f "${DECRYPTED_FILE}"

# 3. Create Temporary Database
echo "3. Creating temporary database '${TEMP_RESTORE_DB}'..."
run_sql "postgres" "CREATE DATABASE ${TEMP_RESTORE_DB};"

# 4. Restore Dump into Test Database
echo "4. Restoring schema and data into '${TEMP_RESTORE_DB}'..."
run_sql_file "${TEMP_RESTORE_DB}" "${SQL_FILE}"

# 5. Verify Integrity
echo "5. Verifying database table counts..."
TABLE_COUNT=$(run_sql "${TEMP_RESTORE_DB}" "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
USER_COUNT=$(run_sql "${TEMP_RESTORE_DB}" "SELECT count(*) FROM users;")

echo "Restored Tables Count: $(echo ${TABLE_COUNT} | tr -d ' ')"
echo "Restored Users Count:  $(echo ${USER_COUNT} | tr -d ' ')"

if [ "$(echo ${TABLE_COUNT} | tr -d ' ')" -lt 10 ]; then
    echo "❌ ERROR: Restore verification failed - Table count less than expected threshold!"
    run_sql "postgres" "DROP DATABASE ${TEMP_RESTORE_DB};"
    rm -f "${SQL_FILE}"
    exit 1
fi

# 6. Cleanup
echo "6. Cleaning up test database and unencrypted temporary files..."
run_sql "postgres" "DROP DATABASE ${TEMP_RESTORE_DB};"
rm -f "${SQL_FILE}"

echo "=========================================="
echo "✅ Backup Integrity & Restore Verification PASSED!"
echo "=========================================="
