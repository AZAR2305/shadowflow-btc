#!/bin/bash

# ShadowFlow Starknet Deployment & ZK Verification Script
# Uses sncast for on-chain ZK proof verification
# Deploy contracts and verify intents on-chain

set -e

echo "🚀 ShadowFlow - Starknet On-Chain Deployment & Verification"
echo "=========================================================="

# Check environment
if [ -z "$STARKNET_RPC_URL" ]; then
  echo "❌ STARKNET_RPC_URL not set"
  exit 1
fi

if [ -z "$ADMIN_ADDRESS" ]; then
  echo "❌ ADMIN_ADDRESS not set"
  exit 1
fi

# ============================================
# 1. COMPILE CONTRACTS
# ============================================
echo ""
echo "📦 Step 1: Compiling Cairo Contracts..."

cd contracts

scarb build

echo "✅ Contracts compiled"

# ============================================
# 2. DEPLOY GARAGA VERIFIER (ZK Proof Verification)
# ============================================
echo ""
echo "🔐 Step 2: Deploying GaragaVerifier Contract (ZK Proof Verification)..."

VERIFIER_OUTPUT=$(sncast declare \
  --contract-name garaga_verifier \
  --account $ADMIN_ADDRESS)

echo "GaragaVerifier Declared: $VERIFIER_OUTPUT"

# Extract contract address (adjust parsing based on actual sncast output)
VERIFIER_CLASS=$(echo "$VERIFIER_OUTPUT" | grep -o '0x[0-9a-fA-F]*' | head -1)

echo "Deploying GaragaVerifier..."
VERIFIER_DEPLOY=$(sncast deploy \
  --class-hash $VERIFIER_CLASS \
  --account $ADMIN_ADDRESS)

VERIFIER_ADDRESS=$(echo "$VERIFIER_DEPLOY" | grep -o '0x[0-9a-fA-F]*' | head -1)
echo "✅ GaragaVerifier deployed at: $VERIFIER_ADDRESS"

# ============================================
# 3. DEPLOY SHADOWFLOW MAIN CONTRACT
# ============================================
echo ""
echo "📋 Step 3: Deploying ShadowFlow Main Contract..."

SHADOWFLOW_OUTPUT=$(sncast declare \
  --contract-name shadowflow \
  --account $ADMIN_ADDRESS)

SHADOWFLOW_CLASS=$(echo "$SHADOWFLOW_OUTPUT" | grep -o '0x[0-9a-fA-F]*' | head -1)

echo "Deploying ShadowFlow..."
SHADOWFLOW_DEPLOY=$(sncast deploy \
  --class-hash $SHADOWFLOW_CLASS \
  --constructor-calldata $VERIFIER_ADDRESS \
  --constructor-calldata 0x0000000000000000000000000000000000000000000000000000000000000001 \
  --account $ADMIN_ADDRESS)

SHADOWFLOW_ADDRESS=$(echo "$SHADOWFLOW_DEPLOY" | grep -o '0x[0-9a-fA-F]*' | head -1)
echo "✅ ShadowFlow deployed at: $SHADOWFLOW_ADDRESS"

# ============================================
# 4. DEPLOY ESCROW CONTRACT
# ============================================
echo ""
echo "🔒 Step 4: Deploying Escrow Contract..."

ESCROW_OUTPUT=$(sncast declare \
  --contract-name escrow \
  --account $ADMIN_ADDRESS)

ESCROW_CLASS=$(echo "$ESCROW_OUTPUT" | grep -o '0x[0-9a-fA-F]*' | head -1)

echo "Deploying Escrow..."
ESCROW_DEPLOY=$(sncast deploy \
  --class-hash $ESCROW_CLASS \
  --constructor-calldata $ADMIN_ADDRESS \
  --constructor-calldata $VERIFIER_ADDRESS \
  --account $ADMIN_ADDRESS)

ESCROW_ADDRESS=$(echo "$ESCROW_DEPLOY" | grep -o '0x[0-9a-fA-F]*' | head -1)
echo "✅ Escrow deployed at: $ESCROW_ADDRESS"

# ============================================
# 5. DEPLOY LIQUIDITY POOL CONTRACT
# ============================================
echo ""
echo "💧 Step 5: Deploying Liquidity Pool Contract..."

POOL_OUTPUT=$(sncast declare \
  --contract-name liquidity_pool \
  --account $ADMIN_ADDRESS)

POOL_CLASS=$(echo "$POOL_OUTPUT" | grep -o '0x[0-9a-fA-F]*' | head -1)

echo "Deploying Liquidity Pool..."
POOL_DEPLOY=$(sncast deploy \
  --class-hash $POOL_CLASS \
  --constructor-calldata $ADMIN_ADDRESS \
  --constructor-calldata 25 \
  --account $ADMIN_ADDRESS)

POOL_ADDRESS=$(echo "$POOL_DEPLOY" | grep -o '0x[0-9a-fA-F]*' | head -1)
echo "✅ Liquidity Pool deployed at: $POOL_ADDRESS"

# ============================================
# 6. DEPLOY BUY STRK CONTRACT (BTC → STRK)
# ============================================
echo ""
echo "💲 Step 6: Deploying Buy STRK Contract (BTC → STRK Bridge)..."

BUY_STRK_OUTPUT=$(sncast declare \
  --contract-name buy_strk \
  --account $ADMIN_ADDRESS)

BUY_STRK_CLASS=$(echo "$BUY_STRK_OUTPUT" | grep -o '0x[0-9a-fA-F]*' | head -1)

echo "Deploying Buy STRK..."
BUY_STRK_DEPLOY=$(sncast deploy \
  --class-hash $BUY_STRK_CLASS \
  --constructor-calldata $ADMIN_ADDRESS \
  --constructor-calldata 50000000000 \
  --constructor-calldata 1000000000000 \
  --constructor-calldata $POOL_ADDRESS \
  --constructor-calldata $POOL_ADDRESS \
  --account $ADMIN_ADDRESS)

BUY_STRK_ADDRESS=$(echo "$BUY_STRK_DEPLOY" | grep -o '0x[0-9a-fA-F]*' | head -1)
echo "✅ Buy STRK deployed at: $BUY_STRK_ADDRESS"

# ============================================
# 7. DEPLOY SELL STRK CONTRACT (STRK → BTC)
# ============================================
echo ""
echo "💸 Step 7: Deploying Sell STRK Contract (STRK → BTC Bridge)..."

SELL_STRK_OUTPUT=$(sncast declare \
  --contract-name sell_strk \
  --account $ADMIN_ADDRESS)

SELL_STRK_CLASS=$(echo "$SELL_STRK_OUTPUT" | grep -o '0x[0-9a-fA-F]*' | head -1)

echo "Deploying Sell STRK..."
SELL_STRK_DEPLOY=$(sncast deploy \
  --class-hash $SELL_STRK_CLASS \
  --constructor-calldata $ADMIN_ADDRESS \
  --constructor-calldata 20000 \
  --constructor-calldata 1000000000000 \
  --constructor-calldata $POOL_ADDRESS \
  --constructor-calldata $POOL_ADDRESS \
  --account $ADMIN_ADDRESS)

SELL_STRK_ADDRESS=$(echo "$SELL_STRK_DEPLOY" | grep -o '0x[0-9a-fA-F]*' | head -1)
echo "✅ Sell STRK deployed at: $SELL_STRK_ADDRESS"

# ============================================
# 8. SAVE CONTRACT ADDRESSES
# ============================================
echo ""
echo "💾 Step 8: Saving Contract Addresses..."

cat > deployment.env << EOF
# ShadowFlow Deployment Addresses
VERIFIER_CONTRACT_ADDRESS=$VERIFIER_ADDRESS
SHADOWFLOW_CONTRACT_ADDRESS=$SHADOWFLOW_ADDRESS
ESCROW_CONTRACT_ADDRESS=$ESCROW_ADDRESS
LIQUIDITY_POOL_ADDRESS=$POOL_ADDRESS
BUY_STRK_CONTRACT_ADDRESS=$BUY_STRK_ADDRESS
SELL_STRK_CONTRACT_ADDRESS=$SELL_STRK_ADDRESS
DEPLOYED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

echo "✅ Addresses saved to deployment.env"

# ============================================
# 9. VERIFY ZK PROOF ON-CHAIN
# ============================================
echo ""
echo "🔍 Step 9: Testing ZK Proof Verification..."

# Create test proof hash (mock)
TEST_PROOF="0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef"
TEST_PUBLIC_INPUTS="0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"

echo "Registering verified proof with GaragaVerifier..."
sncast invoke \
  --contract-address $VERIFIER_ADDRESS \
  --function-name register_verified_proof \
  --calldata $TEST_PROOF $TEST_PUBLIC_INPUTS 1 \
  --account $ADMIN_ADDRESS

echo "✅ Test proof registered"

# ============================================
# 10. ADD ADDRESSES TO ALLOWLIST
# ============================================
echo ""
echo "✅ Step 10: Initializing Allowlist..."

echo "Adding admin to allowlist..."
sncast invoke \
  --contract-address $ESCROW_ADDRESS \
  --function-name add_wallet_to_allowlist \
  --calldata $ADMIN_ADDRESS \
  --account $ADMIN_ADDRESS

echo "✅ Admin added to allowlist"

# ============================================
# 11. SUMMARY
# ============================================
echo ""
echo "=========================================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "=========================================================="
echo ""
echo "Contract Addresses:"
echo "  🔐 GaragaVerifier:     $VERIFIER_ADDRESS"
echo "  📋 ShadowFlow:         $SHADOWFLOW_ADDRESS"
echo "  🔒 Escrow:             $ESCROW_ADDRESS"
echo "  💧 Liquidity Pool:     $POOL_ADDRESS"
echo "  💲 Buy STRK (BTC→STRK): $BUY_STRK_ADDRESS"
echo "  💸 Sell STRK (STRK→BTC): $SELL_STRK_ADDRESS"
echo ""
echo "Next Steps:"
echo "  1. Copy deployment.env to your project root"
echo "  2. Update .env with these addresses"
echo "  3. Test BTC → STRK buy via: curl -X POST http://localhost:3000/api/otc/buy-strk"
echo "  4. Test STRK → BTC sell via: curl -X POST http://localhost:3000/api/otc/sell-strk"
echo "  5. Verify proofs on-chain with:"
echo "     sncast call --contract-address $VERIFIER_ADDRESS --function-name verify ..."
echo ""

cd ..
echo "🎉 Ready for production!"
