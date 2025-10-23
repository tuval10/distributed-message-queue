#!/bin/bash

# Test script for Distributed Message Queue API
# Usage: ./test-api.sh [base_url]

BASE_URL=${1:-http://localhost:3000}

echo "🧪 Testing Distributed Message Queue API"
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
curl -s "$BASE_URL/health" | jq '.'
echo ""

# Test 2: Simple Enqueue (API Controller)
echo -e "${BLUE}Test 2: Simple Enqueue (API Controller)${NC}"
curl -s -X POST "$BASE_URL/api/test-queue" \
  -H "Content-Type: application/json" \
  -d '{"text": "Simple test message", "timestamp": "2025-10-23"}' | jq '.'
echo ""

# Test 3: Simple Dequeue (API Controller)
echo -e "${BLUE}Test 3: Simple Dequeue (API Controller)${NC}"
curl -s "$BASE_URL/api/test-queue?timeout=2000" | jq '.'
echo ""

# Test 4: Enhanced Enqueue (Internal Controller)
echo -e "${BLUE}Test 4: Enhanced Enqueue (Internal Controller)${NC}"
curl -s -X POST "$BASE_URL/internal/queues/orders/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Order #12345",
    "priority": "high",
    "metadata": {
      "source": "test-script",
      "orderId": 12345
    }
  }' | jq '.'
echo ""

# Test 5: Bulk Enqueue
echo -e "${BLUE}Test 5: Bulk Enqueue${NC}"
curl -s -X POST "$BASE_URL/internal/queues/notifications/messages/bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"message": "Notification 1", "priority": "low"},
      {"message": "Notification 2", "priority": "medium"},
      {"message": "Notification 3", "priority": "high"}
    ]
  }' | jq '.'
echo ""

# Test 6: List All Queues
echo -e "${BLUE}Test 6: List All Queues${NC}"
curl -s "$BASE_URL/internal/queues" | jq '.'
echo ""

# Test 7: Get Queue Info
echo -e "${BLUE}Test 7: Get Queue Info (orders)${NC}"
curl -s "$BASE_URL/internal/queues/orders" | jq '.'
echo ""

# Test 8: Peek at Messages
echo -e "${BLUE}Test 8: Peek at Messages (notifications)${NC}"
curl -s "$BASE_URL/internal/queues/notifications/messages/peek?count=3" | jq '.'
echo ""

# Test 9: Dequeue Message
echo -e "${BLUE}Test 9: Dequeue Message (notifications)${NC}"
curl -s "$BASE_URL/internal/queues/notifications/messages?timeout=2000" | jq '.'
echo ""

# Test 10: System Stats
echo -e "${BLUE}Test 10: System Stats${NC}"
curl -s "$BASE_URL/api/stats" | jq '.'
echo ""

# Test 11: Queue Metrics
echo -e "${BLUE}Test 11: Queue Metrics (orders)${NC}"
curl -s "$BASE_URL/internal/queues/orders/metrics" | jq '.'
echo ""

# Test 12: Purge Queue
echo -e "${BLUE}Test 12: Purge Queue (notifications)${NC}"
curl -s -X DELETE "$BASE_URL/internal/queues/notifications/messages" | jq '.'
echo ""

# Test 13: Delete Queue
echo -e "${BLUE}Test 13: Delete Queue (orders)${NC}"
curl -s -X DELETE "$BASE_URL/internal/queues/orders" | jq '.'
echo ""

# Final: List Queues Again
echo -e "${BLUE}Test 14: List All Queues (after cleanup)${NC}"
curl -s "$BASE_URL/internal/queues" | jq '.'
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"

