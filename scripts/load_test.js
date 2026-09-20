import http from 'k6/http';
import { check, sleep } from 'k6';

// Load testing configuration for TransitOps Staging Environment
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // ramp up to 20 users
    { duration: '1m', target: 50 },  // sustain 50 concurrent virtual users
    { duration: '30s', target: 0 },  // ramp down to 0
  ],
  thresholds: {
    // Problem indicators: fail run if error rate exceeds 1% or p95 latency exceeds 1s
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const DEMO_EMAIL = __ENV.DEMO_EMAIL || 'super@transitops.com';
const DEMO_PASSWORD = __ENV.DEMO_PASSWORD || 'SuperAdmin2026!';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 1. Authenticate user
  const loginPayload = JSON.stringify({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, params);
  const loginOk = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'has access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && (body.access_token || (body.data && body.data.access_token));
      } catch (e) {
        return false;
      }
    },
  });

  if (!loginOk) {
    sleep(1);
    return;
  }

  const loginData = JSON.parse(loginRes.body);
  const token = loginData.access_token || (loginData.data && loginData.data.access_token);
  const authParams = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  // 2. Fetch Dashboard Statistics
  const statsRes = http.get(`${BASE_URL}/api/dashboard/stats`, authParams);
  check(statsRes, {
    'dashboard stats status is 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // 3. AI Chat Query (handles 200 OK or 503 if GROQ_API_KEY is not provisioned in dev/test)
  const chatPayload = JSON.stringify({
    message: 'How many vehicles are currently available for dispatch?',
  });

  const chatRes = http.post(`${BASE_URL}/api/ai/chat`, chatPayload, authParams);
  check(chatRes, {
    'ai chat responds 200 or 503 (service unavailable)': (r) => r.status === 200 || r.status === 503,
  });

  sleep(1);
}
