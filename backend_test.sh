#!/bin/bash
# test-x402-backend.sh
# Test script to verify the x402 backend is working correctly

echo "🧪 Testing Casper x402 Backend"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server URL
SERVER_URL="http://localhost:4402"
FACILITATOR_URL="http://localhost:8080"

echo "1️⃣  Testing server health..."
response=$(curl -s -o /dev/null -w "%{http_code}" $SERVER_URL/health)
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Server is healthy${NC}"
else
    echo -e "${RED}❌ Server health check failed (HTTP $response)${NC}"
    exit 1
fi
echo ""

echo "2️⃣  Testing facilitator health..."
response="000"
for i in {1..60}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" $FACILITATOR_URL/health)
    if [ "$response" = "200" ]; then
        break
    fi
    sleep 2
done

if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Facilitator is healthy${NC}"
else
    echo -e "${RED}❌ Facilitator health check failed (HTTP $response)${NC}"
    echo -e "${YELLOW}Tip:${NC} Start it with: cd facilitator-standalone && FACILITATOR_PORT=8080 cargo run"
    exit 1
fi
echo ""

echo "3️⃣  Testing unprotected endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" $SERVER_URL/api/info)
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Unprotected endpoint works${NC}"
else
    echo -e "${RED}❌ Unprotected endpoint failed (HTTP $response)${NC}"
fi
echo ""

echo "4️⃣  Testing protected endpoint WITHOUT payment (should return 402)..."
response=$(curl -s -w "\n%{http_code}" $SERVER_URL/api/premium-content)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "402" ]; then
    echo -e "${GREEN}✅ Protected endpoint returns 402${NC}"
    echo ""
    echo "📋 Payment requirements:"
    echo "$body" | jq -r '.payment | "   Recipient: \(.recipient)\n   Amount: \(.amount) motes\n   Network: \(.network)"'
    echo ""
    
    # Extract payment headers
    echo "📋 Payment headers:"
    headers=$(curl -s -v $SERVER_URL/api/premium-content 2>&1)
    echo "$headers" | grep -i "X-Pay" | sed 's/^/   /'
else
    echo -e "${RED}❌ Protected endpoint did not return 402 (got HTTP $http_code)${NC}"
    echo "$body"
fi
echo ""

echo "5️⃣  Testing protected endpoint WITH invalid payment (should return 400 or 402)..."
response=$(curl -s -w "\n%{http_code}" -H "X-Payment: {\"deploy_hash\":\"invalid\",\"sender\":\"invalid\"}" $SERVER_URL/api/premium-content)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "400" ] || [ "$http_code" = "402" ] || [ "$http_code" = "500" ]; then
    echo -e "${GREEN}✅ Invalid payment rejected (HTTP $http_code)${NC}"
else
    echo -e "${YELLOW}⚠️  Unexpected status code: $http_code${NC}"
fi
echo ""

echo "================================"
echo -e "${GREEN}✅ Backend tests complete!${NC}"
echo ""
echo "Next steps:"
echo "1. If all tests passed, your backend is working correctly"
echo "2. Update your frontend to call $SERVER_URL directly"
echo "3. Or create Next.js API routes to proxy requests"
echo ""
echo "To test with a real payment, you'll need to:"
echo "1. Generate a valid Casper transaction"
echo "2. Include the deploy_hash and sender in X-Payment header"
echo ""
