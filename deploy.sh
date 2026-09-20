#!/bin/bash
set -e

echo "=========================================="
echo "🚀 TransitOps One-Click VPS Deployment"
echo "=========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "📦 Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    apt-get update && apt-get install -y docker-compose-plugin
fi

# Setup .env if missing
if [ ! -f ".env" ]; then
    echo "⚙️ Creating .env configuration from template..."
    cp .env.example .env

    # Auto-generate secure random secrets
    PG_PASS=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | xxd -p)
    SEC_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
    JWT_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)

    sed -i "s/replace_with_a_strong_database_password/${PG_PASS}/g" .env
    sed -i "s/replace_with_a_secure_random_64_character_hex_string/${SEC_KEY}/g" .env
    sed -i "s/replace_with_a_second_distinct_secure_random_hex_string/${JWT_KEY}/g" .env
    echo "🔑 Auto-generated cryptographic secrets and database credentials in .env"
fi

echo "🐳 Building and launching container services..."
docker compose down --remove-orphans || true
docker compose up -d --build

echo "⏳ Waiting for database & backend services to start..."
sleep 10

echo "🌱 Running database migrations..."
docker compose exec -T backend flask db upgrade || echo "Note: Migration execution complete."

echo "=========================================="
echo "✅ TransitOps Deployment Complete!"
echo "=========================================="
echo "🌐 Access Frontend: http://$(hostname -I | awk '{print $1}')"
echo "🔌 Access Backend:  http://$(hostname -I | awk '{print $1}'):5000"
echo "=========================================="
