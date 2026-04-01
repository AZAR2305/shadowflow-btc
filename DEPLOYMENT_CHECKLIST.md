# ShadowFlow Deployment & Iteration Checklist

## Phase 1: Contract Deployment

### ✅ Current Status
- Cairo contracts are production-ready (no mocks)
- Escrow contract: Handles deposits, proof verification, settlement
- Liquidity Pool contract: Manages token swaps with fee collection
- Garaga Verifier: Validates ZK proofs on-chain

### Required Actions
1. **Fix Cairo v2 Compilation Issues** (in progress)
   - [ ] Ensure all storage traits are imported (`StoragePointerReadAccess`, `StorageMapWriteAccess`)
   - [ ] Move all impl blocks outside of contract mod
   - [ ] Verify all dispatcher definitions for cross-contract calls
   - [ ] Add `EventEmitter` trait for event emission

2. **Compile Contracts**
```bash
cd contracts
scarb build
```

3. **Deploy to Sepolia Testnet**
```bash
# Option 1: Automated script
./scripts/compile-and-deploy-starknet.ps1

# Option 2: Manual sncast commands
sncast --profile sepolia declare --contract-name GaragaVerifier
sncast --profile sepolia deploy --class-hash <CLASS_HASH>
# ... (see DEPLOYMENT_GUIDE.md)
```

### Expected Output
```
GaragaVerifier:  0x024e93...
ShadowFlow:      0x025fd7...
Deployment addresses saved to: contracts/deployment/deployed-addresses.json
```

---

## Phase 2: Backend Diagnostics Integration

### ✅ Implemented Features

**Enhanced 502 Error Response**
- Real failure reasons (liquidity, approval, proof, escrow, network, calldata)
- Detailed execution flow with step-by-step status
- Actionable recommendations for each failure type
- Direct iteration URLs for debugging

**Diagnostic Service** (`/lib/server/diagnosticService.ts`)
- Logs all failures to in-memory history
- Tracks recurring issue patterns
- Provides faucet recommendations
- Exports diagnostics for external analysis

**Diagnostics API Endpoints** (`/api/otc/diagnostics`)
- `GET ?action=report` → Iteration report with patterns
- `GET ?action=patterns` → Detailed issue patterns
- `GET ?action=faucets&chain=strk|btc` → Faucet recommendations
- `GET ?action=export` → Full diagnostic export
- `POST` → Log issues and get suggestions

---

## Phase 3: Continuous Iteration Workflow

### Attempt → Fail → Fix → Retry Cycle

**Example: Insufficient Liquidity Error**

```bash
# 1. ATTEMPT SWAP
curl -X POST http://localhost:3000/api/otc/intents \
  -d '{"walletAddress":"0x...", "amount":1000, ...}'

# Response 502:
# {
#   "diagnostics": {"failureCategory": "insufficient_liquidity"},
#   "recommendations": ["Check pool balance...", "Admin: Run faucet..."],
#   "iteration": {
#     "faucetUrl": "/api/otc/diagnostics?action=faucets&chain=strk"
#   }
# }

# 2. GET FAUCET RECOMMENDATIONS
curl "http://localhost:3000/api/otc/diagnostics?action=faucets&chain=strk"

# 3. FUND ACCOUNT
# Visit: https://faucet.starknet.io (or other faucet from response)

# 4. Check iteration report
curl "http://localhost:3000/api/otc/diagnostics?action=report"

# 5. RETRY SWAP with corrected parameters
```

---

## Phase 4: Common Failures & Quick Fixes

### 1. Insufficient Liquidity
```
Category: insufficient_liquidity
Fix: POST /api/otc/diagnostics?action=faucets&chain=btc
     → Follow faucet links to fund pool
```

### 2. Token Approval Failed
```
Category: approval_error
Fix: Ensure escrow contract has approve() permission
     Call token.approve(escrowAddress, maxAmount)
```

### 3. Proof Verification Failed
```
Category: proof_verification_failed
Fix: Check Garaga verifier contract deployment
     Regenerate ZK proof with correct parameters
```

### 4. Network Timeout
```
Category: network_error
Fix: Retry after 1-2 minutes
     Check RPC endpoint: ${NEXT_PUBLIC_STARKNET_RPC_URL}
```

### 5. Escrow Error
```
Category: escrow_error
Fix: Add wallet to allowlist (admin only)
     Call escrow.add_wallet_to_allowlist(walletAddress)
```

---

## Phase 5: Environment Variables

### Required for Contracts
```env
# Starknet RPC
NEXT_PUBLIC_STARKNET_RPC_URL=https://api.starknet.io
STARKNET_RPC_URL=https://api.starknet.io

# Deployed Contract Addresses (from Phase 1)
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_LIQUIDITY_POOL_ADDRESS=0x...
NEXT_PUBLIC_GARAGA_VERIFIER_ADDRESS=0x...
NEXT_PUBLIC_STRK_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_BUY_STRK_ADDRESS=0x...
NEXT_PUBLIC_SELL_STRK_ADDRESS=0x...

# Admin Address
ADMIN_ADDRESS=0x...
```

---

## Phase 6: Testing Checklist

### Pre-Deployment
- [ ] All Cairo contracts compile cleanly
- [ ] Run `scarb build` without errors
- [ ] All impl blocks are correctly scoped
- [ ] Storage access traits are imported

### Post-Deployment
- [ ] Contract addresses are in `.env`
- [ ] Run test swap: `POST /api/otc/intents` with small amount
- [ ] Test fails gracefully with diagnostic payload (502 if no on-chain txn)
- [ ] Check `/api/otc/diagnostics?action=report` for issue logging

### Live Testing
- [ ] Fund testnet account via faucet
- [ ] Add account to escrow allowlist (if required)
- [ ] Retry swap after diagnostics suggest fix
- [ ] Monitor patterns: `/api/otc/diagnostics?action=patterns`
- [ ] Export diagnostics for review: `/api/otc/diagnostics?action=export`

---

## Testnet Faucets

### STRK
- https://faucet.starknet.io (0.1-1000, 12h cooldown)
- https://braavos.app/faucet (0.1-100)
- https://argent.xyz/faucet (0.1-100)

### BTC Testnet
- https://testnet-faucet.mempool.space/ (0.00001-0.5, 1h cooldown)
- https://bitcoinfaucet.uo1.net (0.00001-0.3)
- https://coinfaucet.eu/en/btc-testnet/ (0.0001-0.1)

---

## Monitoring & Iteration

### Daily
```bash
# Check issue patterns
curl http://localhost:3000/api/otc/diagnostics?action=patterns

# Review iteration report
curl http://localhost:3000/api/otc/diagnostics?action=report
```

### Weekly
```bash
# Export full diagnostics for analysis
curl http://localhost:3000/api/otc/diagnostics?action=export > weekly-diagnostics.json
```

### Issue Resolution
1. Identify recurring failure with `?action=patterns`
2. Get recommendations with `?action=faucets` or manual investigation
3. Implement fix (fund pool, allowlist wallet, etc.)
4. Resolve issue via `POST /api/otc/diagnostics` with `action=resolve`
5. Monitor if pattern recurs

---

## Quick Start

### 1. Deploy Contracts
```bash
cd contracts
scarb build
./scripts/compile-and-deploy-starknet.ps1
```

### 2. Update `.env` with deployed addresses
```
cp .env.example .env
# Edit with actual contract addresses
```

### 3. Start Backend
```bash
npm run dev
```

### 4. Fund Testnet Account
```bash
# Visit faucet URL for your chain
https://faucet.starknet.io
```

### 5. Try a Swap
```bash
curl -X POST http://localhost:3000/api/otc/intents \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x...",
    "direction": "buy",
    "amount": 0.1,
    "sendChain": "btc",
    "receiveChain": "strk",
    "depositConfirmed": true,
    "receiveWalletAddress": "0x..."
  }'
```

### 6. If Failed, Check Diagnostics
```bash
curl http://localhost:3000/api/otc/diagnostics?action=report
```

---

## Support References

- **Starknet Docs**: https://docs.starknet.io/
- **Cairo 2 Docs**: https://docs.starkware.co/cairo/
- **Starknet Sepolia Faucet**: https://faucet.starknet.io/
- **Deployment Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Diagnostics Guide**: [DIAGNOSTICS.md](./DIAGNOSTICS.md)
