#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
VK_ID="${VK_ID:-test_stage1_f4fdfab2}"
HDR=(-H "X-Vk-Id: $VK_ID")

echo "=== Smoke test: $API_URL ==="

echo "1. Health check..."
curl -sf "$API_URL/api/health" | grep -q '"status":"ok"'
echo "   OK"

echo "2. Login..."
LOGIN=$(curl -sf -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"vk_id\":\"$VK_ID\"}")
echo "$LOGIN" | grep -q '"registered"'
echo "   OK"

echo "3. Home..."
curl -sf "$API_URL/api/home" "${HDR[@]}" | grep -q '"user"'
echo "   OK"

echo "4. Events..."
curl -sf "$API_URL/api/events?track=all" "${HDR[@]}" | grep -q '"events"'
echo "   OK"

echo "5. Tasks..."
curl -sf "$API_URL/api/tasks" "${HDR[@]}" | grep -q '"tasks"'
echo "   OK"

echo "6. Exchange feed..."
curl -sf "$API_URL/api/exchange/feed" "${HDR[@]}" | grep -q '"feed"'
echo "   OK"

echo "7. State checkin..."
curl -sf -X POST "$API_URL/api/state/checkin" "${HDR[@]}" \
  -H "Content-Type: application/json" \
  -d '{"emotion":"ok","energy_level":4}' | grep -q '"checkin"'
echo "   OK"

if [ -n "${CRON_SECRET:-}" ]; then
  echo "8. Cron jobs..."
  curl -sf "$API_URL/api/cron/jobs" -H "X-Cron-Secret: $CRON_SECRET" | grep -q '"jobs"'
  echo "   OK"
  echo "9. Cron morning-greeting..."
  curl -sf -X POST "$API_URL/api/cron/morning-greeting" \
    -H "X-Cron-Secret: $CRON_SECRET" | grep -q '"ok"'
  echo "   OK"
else
  echo "8-9. Cron tests skipped (set CRON_SECRET to test)"
fi

echo "=== All smoke tests passed ==="
