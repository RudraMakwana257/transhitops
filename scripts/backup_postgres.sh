#!/bin/bash
set -eo pipefail

# ==============================================================================
# TransitOps Automated PostgreSQL Backup Script
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/var/backups/transitops}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/transitops_backup_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"

PGHOST="${POSTGRES_HOST:-${POSTGRES_SERVER:-localhost}}"
PGPORT="${POSTGRES_PORT:-5435}"
PGUSER="${POSTGRES_USER:-transitops}"
PGDATABASE="${POSTGRES_DB:-transitops}"
: "${POSTGRES_PASSWORD:?ERROR: POSTGRES_PASSWORD must be set — refusing to run with no default}"
: "${BACKUP_ENCRYPTION_KEY:?ERROR: BACKUP_ENCRYPTION_KEY must be set — refusing to encrypt backups with no default}"
PGPASSWORD="${POSTGRES_PASSWORD}"
ENCRYPTION_PASSPHRASE="${BACKUP_ENCRYPTION_KEY}"

mkdir -p "${BACKUP_DIR}"

echo "=========================================="
echo "📦 Starting TransitOps PostgreSQL Backup"
echo "Timestamp: ${TIMESTAMP}"
echo "Host/Port: ${PGHOST}:${PGPORT}"
echo "Database:  ${PGDATABASE}"
echo "=========================================="

# 1. Perform database dump with Gzip compression
echo "1. Generating compressed pg_dump..."
if command -v pg_dump >/dev/null 2>&1 && PGPASSWORD="${PGPASSWORD}" pg_isready -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" >/dev/null 2>&1; then
    PGPASSWORD="${PGPASSWORD}" pg_dump -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" -F p | gzip -9 > "${BACKUP_FILE}"
elif docker ps --format '{{.Names}}' | grep -q "transitops-postgres-1"; then
    echo "   (Using Docker container execution fallback)"
    docker exec transitops-postgres-1 pg_dump -U "${PGUSER}" -d "${PGDATABASE}" -F p | gzip -9 > "${BACKUP_FILE}"
else
    echo "❌ ERROR: Cannot connect to PostgreSQL on ${PGHOST}:${PGPORT} or via docker container"
    exit 1
fi

# 2. Encrypt backup using AES-256-CBC
echo "2. Encrypting backup file..."
openssl enc -aes-256-cbc -salt -pbkdf2 -in "${BACKUP_FILE}" -out "${ENCRYPTED_FILE}" -pass pass:"${ENCRYPTION_PASSPHRASE}"
rm -f "${BACKUP_FILE}"

echo "Backup generated successfully: ${ENCRYPTED_FILE}"
echo "Size: $(du -h "${ENCRYPTED_FILE}" | cut -f1)"

# 3. Apply Retention Policy (Purge backups older than RETENTION_DAYS)
echo "3. Enforcing ${RETENTION_DAYS}-day retention policy..."
find "${BACKUP_DIR}" -name "transitops_backup_*.sql.gz.enc" -type f -mtime +${RETENTION_DAYS} -delete

echo "=========================================="
echo "✅ TransitOps Backup Completed Successfully"
echo "=========================================="
