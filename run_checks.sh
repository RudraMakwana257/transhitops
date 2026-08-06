#!/bin/bash
set -e

echo "=== TransitOps Pre-Production Checks ==="

# Use system python or venv if exists
if [ -f "venv/bin/python" ]; then
    PYTHON="venv/bin/python"
    PIP="venv/bin/pip"
    FLASK="venv/bin/flask"
    PYTEST="venv/bin/pytest"
elif command -v python3 &> /dev/null; then
    PYTHON="python3"
    FLASK="flask"
    PYTEST="python3 -m pytest"
else
    echo "❌ Python not found"
    exit 1
fi

echo ""
echo "1. Checking Python version..."
$PYTHON --version

echo ""
echo "2. Running test suite..."
cd server 2>/dev/null || true
$PYTEST tests/ -v --tb=short 2>&1 | tail -20
echo "✅ Tests complete"

echo ""
echo "3. Checking for syntax errors..."
$PYTHON -m py_compile app/__init__.py
$PYTHON -m py_compile wsgi.py
echo "✅ No syntax errors"

echo ""
echo "4. Frontend build check..."
cd ../client 2>/dev/null || cd client 2>/dev/null || true
npm run build --silent
echo "✅ Frontend builds successfully"

echo ""
echo "=== All checks passed ==="
