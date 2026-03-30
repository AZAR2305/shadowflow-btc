#!/bin/bash

# ShadowFlow API Integration Test Script
# Tests all three bridge routes with real Pyth Oracle data

echo "🚀 ShadowFlow API Integration Test"
echo "=================================="
echo ""

BASE_URL="http://localhost:3000"

# Test 1: Buy STRK with BTC
echo "📝 Test 1: Buy STRK with BTC (BTC → STRK Bridge)"
echo "=================================================="
curl -X POST "$BASE_URL/api/otc/buy-strk" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "btcAddress": "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
    "btcAmount": 0.5,
    "minStrkReceive": 25000
  }' | jq '.'

echo ""
echo ""

# Test 2: Sell STRK for BTC
echo "📝 Test 2: Sell STRK for BTC (STRK → BTC Bridge)"
echo "=================================================="
curl -X POST "$BASE_URL/api/otc/sell-strk" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012",
    "btcAddress": "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
    "strkAmount": 50000,
    "minBtcReceive": 0.01
  }' | jq '.'

echo ""
echo ""

# Test 3: Create Intent (Full OTC)
echo "📝 Test 3: Create Intent with Full Web3 Flow"
echo "============================================="
curl -X POST "$BASE_URL/api/otc/intents" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345",
    "direction": "buy",
    "templateId": "simple",
    "priceThreshold": 50000,
    "amount": 1,
    "splitCount": 1,
    "selectedPath": "default",
    "depositConfirmed": true,
    "depositAmount": 100,
    "sendChain": "btc",
    "receiveChain": "strk",
    "receiveWalletAddress": "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef012345678"
  }' | jq '.'

echo ""
echo ""
echo "✅ All tests completed!"
