# ShadowFlow OTC P2P Atomic Swap - Test Flow

## Overview

This test script simulates a complete P2P atomic swap between two users:
- **User A (Bitcoin)**: Sends 0.0001 BTC → Receives STRK
- **User B (Starknet)**: Sends STRK → Receives 0.0001 BTC

The script validates the entire flow including:
✅ Intent submission & validation  
✅ Price oracle verification  
✅ Wallet signature collection  
✅ Intent matching (P2P discovery)  
✅ Atomic swap execution via Starknet contracts  
✅ Cross-chain settlement  

## Prerequisites

1. **Development server running**:
   ```bash
   npm run dev
   ```
   This must be running in a separate terminal before executing the test.

2. **Environment variables set** (`.env.local`):
   ```
   STARKNET_RPC_URL=<your_rpc_endpoint>
   STARKNET_ACCOUNT_ADDRESS=<executor_account>
   STARKNET_ACCOUNT_PRIVATE_KEY=<executor_private_key>
   ESCROW_CONTRACT_ADDRESS=0x06cd7225fbf6ffc2c0ad8261a076214e2d8b52f87c312485c46033048c80cf9c
   BUY_STRK_CONTRACT_ADDRESS=0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b
   SELL_STRK_CONTRACT_ADDRESS=0x0282fc99f24ec08d9ad5d23f36871292b91e7f9b75c1a56e08604549d9402325
   ```

## Quick Start

### 1. Terminal 1 - Start Development Server
```bash
npm run dev
```
You should see:
```
▲ Next.js 14.2.35
  - Local:        http://localhost:3000
```

### 2. Terminal 2 - Run Test Script
```bash
npm run test:otc
```

## Test Output Example

The script produces detailed output showing each phase:

```
╔════════════════════════════════════════════════════════════╗
║          ShadowFlow OTC P2P Atomic Swap Test              ║
║     Cross-Chain Exchange: Bitcoin ↔ Starknet              ║
╚════════════════════════════════════════════════════════════╝

⏳ Waiting for server to be ready...

════════════════════════════════════════════════════════════
📍 PHASE 1: USER A - SUBMIT INTENT
════════════════════════════════════════════════════════════

📤 Submitting validation request...
✅ Validation passed for User A
  Intent ID: 1a2b3c4d5e6f7g8h...
  Oracle Rate: 1948966.7 BTC/STRK
  Stated Rate: 1948966.7 BTC/STRK
  Deviation: 1.08% (Max: ✅)

════════════════════════════════════════════════════════════
📍 PHASE 2: USER A - EXECUTE WITH SIGNATURE
════════════════════════════════════════════════════════════

📝 Simulating wallet signature...
  Signature: 0x0000000000101a2b3c4d5e6f7g8h...
✅ User A execution completed
  Status: WAITING_FOR_MATCH

... (continues through all phases)

💾 TEST SUMMARY
🎉 SUCCESSFUL P2P ATOMIC SWAP EXECUTED! ✅

📊 SWAP DETAILS:
  User A (Bitcoin):
    ├─ Sent: 0.0001 BTC
    ├─ Received: ~194.89 STRK
    └─ Status: ✅ Matched & Executed

  User B (Starknet):
    ├─ Sent: ~197 STRK
    ├─ Received: ~0.0001 BTC
    └─ Status: ✅ Matched & Executed
```

## Test Phases Explained

### Phase 1️⃣: User A Submits Intent (BTC→STRK)
- Creates intent: 0.0001 BTC → STRK
- Validates price with oracle
- Generates ZK proof (server-side)
- Returns intentId for user to sign

**Expected Response**:
```json
{
  "intentId": "1a2b3c...",
  "status": "INTENT_CREATED",
  "priceVerification": {
    "oracleRate": 1948966.7,
    "statedRate": 1948966.7,
    "deviation": 1.08,
    "verified": true
  }
}
```

### Phase 2️⃣: User A Signs & Executes
- Wallet signs the intent (simulated)
- Submits signature to `/api/otc/intents` with `step: execute`
- Server re-validates price
- Stores intent in matching engine
- Waits for counterparty (returns `WAITING_FOR_MATCH`)

**Expected Response**:
```json
{
  "status": "WAITING_FOR_MATCH",
  "message": "Waiting for a matching peer"
}
```

### Phase 3️⃣: Check Intent Status
- Polls `/api/otc/intents/status?intentId=...`
- Returns: found, not found, or matched
- Shows which intent it matched with

### Phase 4️⃣: User B Submits Intent (STRK→BTC)
- Creates complementary intent: STRK → 0.0001 BTC
- Amount calculated from oracle: 197 STRK for 0.0001 BTC
- Same validation flow as User A

### Phase 5️⃣: User B Signs & Executes
- Signs intent (simulated)
- Submits with signature
- **Matching engine finds User A's intent**
- **Atomic swap is triggered**

**Expected Response** (on match):
```json
{
  "status": "MATCHED",
  "message": "✅ MATCHED! Found a peer!",
  "transactionHash": "0x5c7482...",
  "escrowAddress": "0x06cd7225fbf6...",
  "steps": [
    { "description": "Escrow contract called" },
    { "description": "BuyStrk contract invoked" },
    { "description": "SellStrk contract invoked" },
    { "description": "Swap completed" }
  ]
}
```

### Phase 6️⃣: Verify Final State
- Check both intents' final status
- Confirm both show as matched
- Verify transaction details

## Expected Success Criteria

✅ **Both intents successfully created**  
✅ **Both submit with valid signatures**  
✅ **Matching engine finds complementary pair**  
✅ **Atomic swap executes without errors**  
✅ **Contract calls complete (real or graceful fallback)**  
✅ **Both intents show matched status**  

## Troubleshooting

### ❌ "Cannot find server at localhost:3000"
- Make sure `npm run dev` is running in another terminal
- Check that Next.js is fully started (look for "ready" message)
- Wait 30 seconds and try again

### ❌ "Cannot read properties of undefined"
- Check `.env.local` has all contract addresses
- Verify `STARKNET_ACCOUNT_ADDRESS` and `STARKNET_ACCOUNT_PRIVATE_KEY` are set
- Check that Starknet RPC is accessible

### ❌ "Price deviation too high"
- Oracle rate may have changed between requests
- Tolerance is set to ±2% (see `/api/otc/intents` route)
- Retry after a few seconds

### ❌ "No matching peer found"
- Make sure both users submit intents (~2 second window)
- Check that amounts are complementary (0.0001 BTC ↔ 197 STRK)
- Verify matching engine is storing intents (check logs for `[SUBMIT-STORE]`)

## Understanding the Logs

The server generates logs tagged with phases:

```
[VALIDATE-START] User A begins validation → [VALIDATE-RESPONSE] Success
[SUBMIT-START] User A signs → [SUBMIT-STORE] Intent stored in matching engine
[SUBMIT-PENDING] Waiting for match
[MATCH-FOUND] User B's intent found as match!
[EXECUTE-START] Atomic swap begins
[CONTRACT-CALL] BuyStrk invoked
[CONTRACT-CALL] SellStrk invoked
[EXECUTE-COMPLETE] Swap finished
```

Monitor `npm run dev` window to see these logs in real-time.

## Next Steps

After successful test run:

1. **Modify Wallet Values**: Update USER_A and USER_B objects with your real testnet wallets
2. **Test Different Amounts**: Change sendAmount and receiveAmount values
3. **Add Error Cases**: Test with wrong signatures, mismatched amounts, invalid wallets
4. **Monitor Contract Execution**: Check Starknet testnet explorer to see actual transactions
5. **Load Testing**: Run multiple concurrent intents to test matching at scale

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT USERS                         │
├──────────────────────┬──────────────────────────────────┤
│   USER A (Bitcoin)   │      USER B (Starknet)          │
│   Wants: STRK        │      Wants: BTC                 │
│   Sends: 0.0001 BTC  │      Sends: 197 STRK            │
└──────────┬───────────┴────────────┬─────────────────────┘
           │                        │
           ▼                        ▼
    ┌──────────────────────────────────────┐
    │   /api/otc/intents (Next.js Route)  │
    │  [VALIDATE] [SUBMIT] [EXECUTE]      │
    └──────────┬─────────────────────┬────┘
               │                     │
        ┌──────▼────────────────────▼──────┐
        │  OtcMatchingService (Singleton)  │
        │   Global intent storage Map      │
        │   ├─ submitIntent(intent)        │
        │   ├─ findMatch(intent)           │
        │   └─ getIntent(id)               │
        └──────┬─────────────────────┬─────┘
               │ MATCH FOUND!         │
               └─────────────┬────────┘
                             ▼
        ┌────────────────────────────────┐
        │  OtcEscrowService              │
        │  executeAtomicSwap()           │
        │  ├─ callBuyStrk()              │
        │  └─ callSellStrk()             │
        └────────────┬───────────────────┘
                     ▼
        ┌────────────────────────────────┐
        │   Starknet Smart Contracts     │
        │  (Sepolia Testnet)             │
        │  ├─ EscrowContract             │
        │  ├─ BuyStrkContract            │
        │  └─ SellStrkContract           │
        └────────────────────────────────┘
```

## Key Learnings

- ✅ P2P matching works via in-memory engine with global persistence
- ✅ Intent signatures collected outside critical path (async)
- ✅ Atomic swap coordination via contract calls
- ✅ Price oracle prevents bad trades (±2% tolerance)
- ✅ Cross-chain settlement via Starknet bridge contracts

---

**Last Updated**: 2024  
**Test Script**: `scripts/test-otc-flow.js`  
**Run Command**: `npm run test:otc`
