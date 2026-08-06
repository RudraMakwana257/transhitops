#!/bin/bash
echo "Running pre-demo checks..."

# Check backend is up
STATUS=$(curl -s http://localhost/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','error'))")

if [ "$STATUS" != "ok" ]; then
  echo "❌ Backend is DOWN"
  exit 1
fi
echo "✅ Backend is up"

# Refresh demo data
[ -d "server" ] && cd server
venv/bin/flask seed-demo || flask seed-demo
echo "✅ Demo data refreshed"

# Test demo login
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@transitops.com","password":"Demo@12345"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('access_token','FAIL'))")

if [ "$TOKEN" = "FAIL" ]; then
  echo "❌ Demo login FAILED"
  exit 1
fi
echo "✅ Demo login works"

echo ""
echo "✅ All checks passed. Ready to demo."
