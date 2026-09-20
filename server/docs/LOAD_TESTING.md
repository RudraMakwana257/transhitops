# TransitOps Load Testing Guide

This guide describes how to run reproducible load tests against TransitOps staging environments using [k6](https://k6.io/).

> [!NOTE]
> Performance characteristics and concurrency limits must be measured on real infrastructure. Do not claim arbitrary concurrency capacities without executing the test suite against a provisioned environment.

---

## 1. Prerequisites

Install `k6` on your local machine or CI runner:

```bash
# Ubuntu / Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D34EE14C
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install -y k6

# macOS (Homebrew)
brew install k6
```

---

## 2. Test Execution

The k6 test script is located at [`scripts/load_test.js`](file:///home/zayron/Main/Hackathon/transitops/scripts/load_test.js) and covers:
1. `POST /api/auth/login` (Authentication & JWT retrieval)
2. `GET /api/dashboard/stats` (Multi-tenant aggregate queries)
3. `POST /api/ai/chat` (LLM inference or service fallback)

### Standard Staging Run (50 Concurrent Users, 2 Minutes)

```bash
k6 run scripts/load_test.js \
  -e BASE_URL="https://staging.transitops.internal" \
  -e DEMO_EMAIL="admin@transitops.internal" \
  -e DEMO_PASSWORD="<staging_password>" \
  --vus 50 \
  --duration 2m
```

### Quick Sanity Check (5 Users, 30 Seconds)

```bash
k6 run scripts/load_test.js \
  -e BASE_URL="http://localhost:5000" \
  --vus 5 \
  --duration 30s
```

---

## 3. Thresholds and Problem Indicators

The test defines fail thresholds representing production-grade SLA violations:

| Metric | Target Threshold | Problem Indicator | Severity |
|---|---|---|---|
| **Error Rate** (`http_req_failed`) | `< 1.0%` | `> 1.0%` HTTP 5xx errors or timeouts | High / Blocker |
| **P95 Latency** (`http_req_duration p(95)`) | `< 1000ms` | `> 1000ms` for 95th percentile requests | High / Degradation |
| **P99 Latency** (`http_req_duration p(99)`) | `< 2000ms` | `> 2500ms` indicates database pool exhaustion | Medium / Review |
| **Login Latency** | `< 800ms` | `> 1500ms` indicates bcrypt CPU starvation | Medium / Tuning |

If thresholds are violated, investigate:
1. **Database connection pooling**: verify `SQLALCHEMY_POOL_SIZE` and `MAX_OVERFLOW` settings.
2. **Gunicorn worker concurrency**: adjust `-w (2 * CPU + 1)` and worker thread counts.
3. **Redis caching**: verify Redis hit rate for frequent KPI queries.
