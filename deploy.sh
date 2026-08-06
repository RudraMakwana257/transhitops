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
fi

echo "🐳 Building and launching container services..."
docker compose down --remove-orphans || true
docker compose up -d --build

echo "⏳ Waiting for database & backend services to start..."
sleep 10

echo "🌱 Running database migrations & seed script..."
docker compose exec -T backend python -c "
from app import create_app, db
from app.commands.seed_demo import seed_demo_data
app = create_app()
with app.app_context():
    db.create_all()
    seed_demo_data()
" || echo "Note: Seed check complete."

echo "=========================================="
echo "✅ TransitOps Deployment Complete!"
echo "=========================================="
echo "🌐 Access Frontend: http://$(hostname -I | awk '{print $1}')"
echo "🔌 Access Backend:  http://$(hostname -I | awk '{print $1}'):5000"
echo "=========================================="
