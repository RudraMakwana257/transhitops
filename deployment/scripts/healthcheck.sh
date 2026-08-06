#!/usr/bin/env bash
set -eo pipefail

HOST="${1:-http://localhost:5000}"

echo "=== Running Production Health & Probes Check on $HOST ==="

# 1. Liveness Probe
LIVENESS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HOST/api/ai/health/liveness")
if [ "$LIVENESS_STATUS" -eq 200 ]; then
  echo "✓ Liveness Probe: HEALTHY (200 OK)"
else
  echo "✗ Liveness Probe FAILED (HTTP $LIVENESS_STATUS)"
  exit 1
fi

# 2. Readiness Probe
READINESS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HOST/api/ai/health/readiness")
if [ "$READINESS_STATUS" -eq 200 ]; then
  echo "✓ Readiness Probe: HEALTHY (200 OK)"
else
  echo "✗ Readiness Probe FAILED (HTTP $READINESS_STATUS)"
  exit 1
fi

echo "=== All Probes PASSED Successfully ==="
