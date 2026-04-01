# ShadowFlow OTC Bridge Diagnostics & Iteration Guide

## Overview

The diagnostic system provides real-time monitoring and iterative debugging for OTC bridge swap failures. When a swap fails with a 502 error, you receive:

1. **Exact failure reason** - Which step reverted and why
2. **Failure categorization** - Liquidity, calldata, approval, proof, escrow, network, etc.
3. **Actionable recommendations** - Specific steps to resolve the issue
4. **Iteration URLs** - Direct links to debug and fix the problem

## API Endpoints

### 1. Submit Intent (with automatic diagnostics)
```
POST /api/otc/intents
```
**Request:**
```json
{
  "walletAddress": "0x...",
  "direction": "buy",
  "sendChain": "btc",
  "receiveChain": "strk",
  "amount": 0.1,
  "depositConfirmed": true,
  "receiveWalletAddress": "0x..."
}
```

**On Failure (502):**
```json
{
  "error": "Bridge execution did not produce a real on-chain transaction.",
  "diagnostics": {
    "failureCategory": "insufficient_liquidity",
    "failureDetails": "Liquidity pool has insufficient reserves...",
    "rawError": "...actual error message...",
    "failedStepName": "Execute Bridge Swap (Liquidity Pool)",
    "failedStepNumber": 6
  },
  "executionFlow": {
    "steps": [
      {"step": 1, "name": "Validate Allowlist", "status": "completed"},
      {"step": 2, "name": "Generate ZK Proof", "status": "completed"},
      {"step": 3, "name": "Verify Proof On-chain", "status": "completed"},
      {"step": 4, "name": "Create Escrow Deposit", "status": "completed"},
      {"step": 5, "name": "Lock Escrow with Proof", "status": "completed"},
      {"step": 6, "name": "Execute Bridge Swap", "status": "failed", "error": "..."}
    ]
  },
  "recommendations": [
    "Check liquidity pool reserves...",
    "Reduce swap amount or wait for liquidity to replenish...",
    "Admin: Run liquidity pool faucet..."
  ],
  "iteration": {
    "debugUrl": "/api/otc/diagnostics?action=report",
    "faucetUrl": "/api/otc/diagnostics?action=faucets&chain=strk",
    "exportUrl": "/api/otc/diagnostics?action=export"
  }
}
```

---

### 2. Get Iteration Report
```
GET /api/otc/diagnostics?action=report
```

**Response:**
```json
{
  "totalIssues": 5,
  "resolved": 2,
  "unresolved": 3,
  "patterns": {
    "categoryCount": {
      "insufficient_liquidity": 3,
      "network_error": 1,
      "proof_verification_failed": 1
    },
    "commonErrors": [
      "Liquidity pool has insufficient BTC reserves",
      "RPC timeout after 30s",
      "Merkle proof verification failed"
    ]
  },
  "nextSteps": [
    "Priority: Increase liquidity pool reserves",
    "Continue monitoring for patterns"
  ]
}
```

---

### 3. Get Faucet Recommendations
```
GET /api/otc/diagnostics?action=faucets&chain=strk
```

**Response:**
```json
{
  "currentStatus": {
    "chain": "strk",
    "token": "STRK",
    "reserveAmount": "unknown",
    "isLow": true,
    "recommendation": "Fund strk account and retry swap."
  },
  "faucets": [
    {
      "name": "Starknet Official Faucet",
      "url": "https://faucet.starknet.io",
      "chains": ["strk"],
      "minAmount": "0.1",
      "maxAmount": "1000",
      "cooldown": "12h per address"
    },
    {
      "name": "Braavos Testnet Faucet",
      "url": "https://braavos.app/faucet",
      "chains": ["strk"],
      "minAmount": "0.1",
      "maxAmount": "100"
    },
    {
      "name": "Argent Testnet Faucet",
      "url": "https://argent.xyz/faucet",
      "chains": ["strk"],
      "minAmount": "0.1",
      "maxAmount": "100"
    }
  ],
  "suggestions": [
    "Fund STRK account via available faucets",
    "Minimum required amount: 0 STRK",
    "For larger amounts, consider the Starkware Playground testnet..."
  ]
}
```

---

### 4. Export Full Diagnostics
```
GET /api/otc/diagnostics?action=export
```

**Response:** JSON file with full issue history, patterns, and analysis.

```bash
# Download as file
curl /api/otc/diagnostics?action=export > diagnostics.json
```

---

### 5. Log a New Issue (Manual)
```
POST /api/otc/diagnostics
```

**Request:**
```json
{
  "category": "insufficient_liquidity",
  "error": "Liquidity pool insufficient for 1000 STRK swap",
  "sendChain": "strk",
  "receiveChain": "btc",
  "amount": 1000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Issue logged and liquidity suggestions generated",
  "suggestions": {
    "currentStatus": {...},
    "faucets": [...],
    "suggestions": [...]
  }
}
```

---

### 6. Resolve an Issue
```
POST /api/otc/diagnostics
```

**Request:**
```json
{
  "action": "resolve",
  "issueId": "issue_1704067200000_abc123",
  "resolution": "Added 50 STRK to liquidity pool, retry successful"
}
```

---

## Failure Categories & Recovery

### 1. **insufficient_liquidity**
- **What:** Liquidity pool doesn't have enough reserves
- **Why:** Pool was drained or never funded
- **Fix:**
  - Check pool balance: `GET /api/otc/diagnostics?action=faucets&chain=btc` or `&chain=strk`
  - Add liquidity via admin function
  - Use testnet faucets to get funds

### 2. **calldata_error**
- **What:** Parameters couldn't be encoded for contract call
- **Why:** Type mismatch or size overflow
- **Fix:**
  - Verify amount is valid u256
  - Check wallet addresses are valid for their chains
  - Review contract parameter types

### 3. **approval_error**
- **What:** Token transfer failed (no approval or insufficient balance)
- **Why:** Contract not approved to spend tokens, or insufficient balance
- **Fix:**
  - Approve contract to spend token
  - Fund wallet via faucet: `/api/otc/diagnostics?action=faucets&chain=...`
  - Check balance before attempting swap

### 4. **proof_verification_failed**
- **What:** ZK proof didn't verify on-chain
- **Why:** Proof generation or verifier contract issue
- **Fix:**
  - Regenerate proof from scratch
  - Check Garaga verifier contract is deployed
  - Verify proof generation parameters

### 5. **escrow_error**
- **What:** Escrow contract operation failed
- **Why:** Wallet not allowlisted, or escrow state issue
- **Fix:**
  - Add wallet to escrow allowlist (admin)
  - Verify escrow contract deployment
  - Check allowlist status

### 6. **network_error**
- **What:** RPC timeout or connection issue
- **Why:** Network congestion or RPC unavailable
- **Fix:**
  - Retry after a moment
  - Check RPC endpoint status
  - Use alternate RPC if configured

### 7. **execution_error**
- **What:** Contract execution reverted on-chain
- **Why:** Contract logic rejected the operation
- **Fix:**
  - Review error message for revert reason
  - Check contract state and permissions
  - Verify all contract addresses in config

---

## Iteration Workflow

### Step 1: Attempt Swap
```bash
curl -X POST http://localhost:3000/api/otc/intents \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x123...",
    "direction": "buy",
    "sendChain": "btc",
    "receiveChain": "strk",
    "amount": 0.1,
    "depositConfirmed": true,
    "receiveWalletAddress": "0x456..."
  }'
```

### Step 2: Read Failure Details
```
{
  "diagnostics": {
    "failureCategory": "insufficient_liquidity",
    "failureDetails": "Liquidity pool has insufficient reserves...",
    "rawError": "Pool balance 0.5 < required 2.0"
  }
}
```

### Step 3: Get Faucets for Resolution
```bash
curl http://localhost:3000/api/otc/diagnostics?action=faucets&chain=strk
```

### Step 4: Fund Account
- Visit recommended faucet from Step 3
- Fund both sender and liquidity pool as needed

### Step 5: Check Patterns
```bash
curl http://localhost:3000/api/otc/diagnostics?action=report
```

### Step 6: Retry Swap
- Go back to Step 1 after funding

---

## Testnet Faucets Quick Reference

### STRK Faucets
| Name | URL | Min | Max | Cooldown |
|------|-----|-----|-----|----------|
| Starknet Official | https://faucet.starknet.io | 0.1 | 1000 | 12h |
| Braavos | https://braavos.app/faucet | 0.1 | 100 | - |
| Argent | https://argent.xyz/faucet | 0.1 | 100 | - |

### BTC Testnet Faucets
| Name | URL | Min | Max | Cooldown |
|------|-----|-----|-----|----------|
| testnet-faucet.mempool.space | https://testnet-faucet.mempool.space/ | 0.00001 | 0.5 | 1h |
| bitcoinfaucet.uo1.net | https://bitcoinfaucet.uo1.net | 0.00001 | 0.3 | - |
| coinfaucet.eu | https://coinfaucet.eu/en/btc-testnet/ | 0.0001 | 0.1 | - |

---

## Admin Operations

### Check Diagnostics Summary
```bash
curl http://localhost:3000/api/otc/diagnostics?action=patterns
```

### Export for External Analysis
```bash
curl http://localhost:3000/api/otc/diagnostics?action=export > diagnostics.json
```

### Monitor Recurring Issues
- Review `patterns.categoryCount` for most common failures
- Review `nextSteps` for recommended actions
- Keep first 100 issues in memory for pattern detection

---

## Development Mode

In development, full stack traces are included in error responses:

```json
{
  "error": "...",
  "diagnostics": {...},
  "stack": "Error: ...\n    at ..."
}
```

In production, stack traces are omitted for security.

---

## Integration with Frontend

Frontend should display failure details and recommendations:

```javascript
const response = await fetch('/api/otc/intents', {...});
const data = await response.json();

if (!response.ok) {
  // Display diagnostics
  console.log('Category:', data.diagnostics?.failureCategory);
  console.log('Details:', data.diagnostics?.failureDetails);
  console.log('Recommendations:', data.recommendations);
  
  // Provide iteration links
  if (data.iteration) {
    console.log('Debug Report:', data.iteration.debugUrl);
    console.log('Get Faucets:', data.iteration.faucetUrl);
  }
}
```

---

## Continuous Iteration Process

1. **Attempt** → Swap fails with diagnostic payload
2. **Analyze** → Read failure category and error details
3. **Research** → Get faucet recommendations or check patterns
4. **Act** → Fund account, allowlist wallet, add liquidity, etc.
5. **Retry** → Submit new swap with corrected parameters
6. **Monitor** → Track patterns to identify systemic issues
7. **Improve** → Fix root causes identified in patterns

This cycle ensures you can iterate quickly and identify both one-off issues and systemic problems.
