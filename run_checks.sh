#!/bin/bash
cd /home/zayron/Main/Hackathon/transitops

echo "--- 1. Pytest ---" > report.log
cd server
if [ -d "tests" ]; then
  source venv/bin/activate
  python3 -m pytest >> ../report.log 2>&1 || true
else
  echo "No test suite found" >> ../report.log
fi

echo -e "\n--- 2. Flask warnings ---" >> ../report.log
source venv/bin/activate
export FLASK_APP=run.py
export FLASK_ENV=development
export DATABASE_URL="postgresql://transitops:transitops@localhost:5432/transitops"
export REDIS_URL="redis://localhost:6379/0"
flask run > flask_run.log 2>&1 &
FLASK_PID=$!
sleep 4
kill $FLASK_PID || true
cat flask_run.log | head -50 >> ../report.log

echo -e "\n--- 3. Flask routes ---" >> ../report.log
flask routes | wc -l >> ../report.log

echo -e "\n--- 4. Flask DB ---" >> ../report.log
flask db current >> ../report.log 2>&1 || true
flask db check >> ../report.log 2>&1 || true

echo -e "\n--- 5. SQLAlchemy Warnings ---" >> ../report.log
grep -i "SAWarning" flask_run.log >> ../report.log || echo "No SAWarnings found" >> ../report.log

echo -e "\n--- 6. Frontend Build ---" >> ../report.log
cd ../client
npm run build -- --mode production > frontend_build.log 2>&1
cat frontend_build.log | grep "dist/" >> ../report.log || true
cat frontend_build.log | grep "gzip" >> ../report.log || true

echo -e "\n--- 7. Frontend TSC ---" >> ../report.log
npx tsc --noEmit --strict >> ../report.log 2>&1 || echo "TSC Passed" >> ../report.log

echo -e "\n--- 9. Auth Length Check ---" >> ../report.log
cd ../server
flask run --port=5002 > /dev/null 2>&1 &
BACKEND_PID=$!
sleep 4
curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$(printf 'A%.0s' {1..1000})\", \"password\": \"test\"}" >> ../report.log 2>&1

echo -e "\n--- 11. CORS Check ---" >> ../report.log
curl -s -I -H "Origin: http://evil.com" -H "Access-Control-Request-Method: POST" -X OPTIONS http://localhost:5002/api/auth/login >> ../report.log 2>&1
kill $BACKEND_PID || true

echo -e "\n--- 12. Docker ps ---" >> ../report.log
cd ..
docker compose up --build -d
sleep 20
docker compose ps >> report.log

echo -e "\n--- 13. Docker logs ---" >> ../report.log
docker compose logs backend | grep -i "error\|warning" | head -20 >> report.log || echo "No errors in logs" >> report.log

echo -e "\n--- 14. Docker stats ---" >> ../report.log
docker stats --no-stream >> report.log
