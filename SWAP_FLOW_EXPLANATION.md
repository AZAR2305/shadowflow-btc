# Complete OTC Swap Flow: Signing → Transfer → Escrow → Execution

## Overview

After two users are matched on the `/otc-waiting` page, they are navigated to `/swap-matching` page where the atomic swap execution begins. The flow follows this sequence:

```
User A & B on /swap-matching
  ↓
1️⃣ SIGN PHASE (Both parties)
  - User signs intent with wallet (Starknet or Bitcoin)
  - Signature submitted to /api/otc/intents with step=execute
  - Intent status updated to "signed"
  - ✓ Signature recorded
  ↓
2️⃣ ESCROW FUNDING PHASE (Both parties sequentially)
  - After both signed: "Fund Escrow" button appears
  - User transfers their amount:
    • If BTC sender: Signs message via Xverse/Unisat, transfers BTC
    • If STRK sender: Signs message via Starknet wallet, transfers STRK
  - Backend calls /api/otc/escrow/fund endpoint
  - Escrow service locks funds in contract
  - Status updated to "fundedToEscrow: true"
  ↓
3️⃣ AUTO-EXECUTION PHASE (When both funded)
  - Second user funds escrow
  - Backend detects both parties now funded
  - Automatically triggers executeAtomicSwap()
  - Starknet contract executes atomic exchange
  - Status updated to "executing" → "executed"
  ↓
✅ SWAP COMPLETED
  - Both parties' funds exchanged
  - Transaction hash displayed
```

---

## Detailed Phase Breakdown

### Phase 1️⃣: SIGNING (At /swap-matching)

**Location:** `components/swap-matching-interface-new.tsx` → `handleSignMatch()`

**What Happens:**
1. User clicks "✓ Sign This Match" button
2. Component detects blockchain type and requests signature:
   - **If STRK chain:** Opens Starknet wallet (Argent X/Braavos)
   - **If BTC chain:** Opens Bitcoin wallet (Xverse/Unisat)
3. Signature message format:
   ```
   MATCH:{first 10 chars of matchId}
   ```
4. Frontend sends signature to backend:
   ```
   POST /api/otc/intents
   {
     intentId: string,
     signature: string,          // Signed message
     walletAddress: string,      // User's wallet
     step: "execute"             // Explicit execute step
   }
   ```

**Backend Processing:** (`app/api/otc/intents/route.ts` → `executeIntentStep()`)
1. Validates intentId exists
2. Stores signature using `matchingService.updateIntentSignature()`
3. Checks if intent is matched (`intent.matchedWith` property)
4. **If not both signed yet:**
   - Returns: `{ status: "partial", message: "Your signature recorded! Waiting for other party..." }`
5. **If both partners signed:**
   - Proceeds to Phase 2️⃣

**Frontend State Update:** (`handleSignMatch()`)
- Sets `step: "signed"`
- Shows: ✓ "You've Signed!"
- Enables: "Fund Escrow" button (when both are signed)
- Polling every 2s detects when other party signs

---

### Phase 2️⃣: ESCROW FUNDING (Amount Transfer & Lock)

**Location:** `components/swap-matching-interface-new.tsx` → `handleFundToEscrow()`

**What Happens:**
1. Both users must sign first (prerequisite)
2. "✓ Fund Escrow with 0.0001 BTC" button appears
3. User clicks button to initiate transfer

**Sub-Phase 2a: Get Signature for Transfer**

```
If sendChain === "btc":
  - Opens Bitcoin wallet (Xverse/Unisat)
  - Message to sign: "OTC_ESCROW_FUND:{intentId}:{matchId}:{amount}:btc"
  - Result: Bitcoin signature (proves authorization to transfer)

Else (sendChain === "strk"):
  - Opens Starknet wallet (Argent X/Braavos)
  - Message to sign: "OTC_ESCROW_FUND:{intentId}:{matchId}:{amount}:strk"
  - Result: Starknet signature (proves authorization to transfer)
```

**Sub-Phase 2b: Lock Funds in Escrow Contract**

Frontend sends to `/api/otc/escrow/fund`:
```json
{
  "intentId": "intent_123",
  "matchId": "match_456",
  "walletAddress": "0x...",
  "signature": "0x...",
  "fundAmount": "0.0001",
  "sendChain": "btc"
}
```

**Backend Processing:** (`app/api/otc/escrow/fund/route.ts`)

1. **Validation Phase:**
   - Verify signature matches wallet + message hash
   - Check user hasn't already funded
   - Verify fundAmount matches agreed amount

2. **Escrow Locking Phase:** Calls `OtcEscrowService.lockFundsInEscrow()`
   ```
   await escrowService.lockFundsInEscrow(
     intentId,
     matchId,
     walletAddress,
     fundAmount,
     sendChain  // 'btc' or 'strk'
   )
   ```

   **What gets locked:**
   - **BTC flow:** Bitcoin UTXOs locked in Starknet escrow bridge contract
   - **STRK flow:** STRK tokens transferred to escrow contract
   - Returns: `{ transactionHash: "0x..." }`

3. **Match Status Update:** Calls `otcService.updateMatchFundingStatus()`
   - Sets `partyA.fundedToEscrow: true` OR `partyB.fundedToEscrow: true`
   - Stores escrow transaction hash

4. **AUTO-TRIGGER SWAP (if both funded):**
   ```typescript
   if (updatedMatch.partyA.fundedToEscrow && updatedMatch.partyB.fundedToEscrow) {
     // BOTH PARTIES HAVE FUNDED - TIME FOR ATOMIC SWAP!
     try {
       const executeResult = await escrowService.executeAtomicSwap(
         intentId,
         matchId,
         updatedMatch
       );
       // Returns real transaction hashes from Starknet contract execution
       return { success: true, swapInProgress: true, ... }
     } catch {
       // Mark as "escrow_funded" and queue for retry
       return { success: true, swapInProgress: false, executionPending: true, ... }
     }
   }
   ```

**Frontend Response Handling:**

```typescript
// Scenario 1: Only this party funded so far
if (!fundData.swapInProgress) {
  setSuccess(`Your funds locked in escrow!\nEscrow TX: ${fundData.fundingTxHash}...`)
  setStep("escrow_funding")  // Still waiting for other party
}

// Scenario 2: Both now funded - Swap auto-executing
if (fundData.swapInProgress) {
  setSuccess(`Funds locked... Atomic swap executing...`)
  setStep("executing")  // Shows "⏳ Executing Atomic Swap..." banner
}
```

---

### Phase 3️⃣: ATOMIC SWAP EXECUTION (Contract-Level)

**Location:** `lib/server/otcEscrowService.ts` → `executeAtomicSwap()`

**Triggered When:** Both parties have called `/api/otc/escrow/fund` successfully

**What Happens:**

1. **Determine Swap Direction:**
   - If `partyA.sendChain === "strk"`:
     - PartyA is STRK seller → PartyB is STRK buyer
     - Use `SellStrkContract.sell_strk_for_btc()`
   - Else:
     - PartyA is BTC sender → PartyB is BTC receiver
     - Use `BuyStrkContract.buy_strk_with_btc()`

2. **Execute on Starknet:**
   ```
   Step 1: Get quotes on both tokens to ensure price match
   Step 2: Lock both users' funds in escrow contract
   Step 3: Execute atomic swap:
     - Transfer PartyA's amount to PartyB
     - Transfer PartyB's amount to PartyA
     - All in single transaction (atomicity guaranteed)
   Step 4: Return transaction hashes
   ```

3. **Contract Details:**
   - **EscrowContract:** `0x06cd7225fbf6ffc2c0ad8261a076214e2d8b52f87c312485c46033048c80cf9c`
   - **BuyStrkContract:** `0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b`
   - **SellStrkContract:** `0x0282fc99f24ec08d9ad5d23f36871292b91e7f9b75c1a56e08604549d9402325`
   - **Network:** Starknet Sepolia testnet

4. **Return Value:**
   ```json
   {
     "transactionHash": "0x...",
     "escrowAddress": "0x...",
     "steps": [
       { action: "lock_partyA_funds", txHash: "0x..." },
       { action: "lock_partyB_funds", txHash: "0x..." },
       { action: "execute_atomic_swap", txHash: "0x..." }
     ]
   }
   ```

5. **Backend Updates Match Status:**
   ```
   otcService.updateMatchStatus(intentId, matchId, "executing")
   // Later, after confirmation:
   otcService.updateMatchStatus(intentId, matchId, "executed")
   ```

---

## UI/UX Timeline

```
TIME 0s:    User lands on /swap-matching
            ├─ Timeline shows: ○ Waiting → ○ Funding → ○ Executing
            ├─ Button: "✓ Sign This Match"
            └─ Status: "Waiting for Signatures"

TIME 30s:   [User clicks sign button]
            ├─ Starknet wallet pops up
            ├─ User confirms message signature
            └─ Button shows: "Signing..." (loading)

TIME 35s:   Signature submitted successfully
            ├─ Button changes to: "✓ You've Signed!"
            ├─ Status changes to: "Waiting for other party to sign"
            ├─ Timeline: ✓ Step 1 (green checkmark)
            └─ Step 2 box changes from gray to blue

TIME 60s:   [Other user also signs]
            ├─ Component detects both signed (polling /api/otc/matches)
            ├─ Button changes to: "✓ Fund Escrow with 0.0001 BTC"
            ├─ Status: "Both Signed! Ready to fund."
            └─ Timeline Step 2: Shows blue (in progress)

TIME 70s:   [User clicks "Fund Escrow" button]
            ├─ Message shown: "Funding Escrow..."
            ├─ Bitcoin wallet pops up
            ├─ User confirms transfer signature
            └─ Transaction submits to escrow contract

TIME 80s:   This user's funds locked
            ├─ Button shows: "✓ Funds locked in escrow!"
            ├─ Shows: "Escrow TX: 0x1234..."
            ├─ Status: "Waiting for other party to fund escrow..."
            └─ Timeline: Still on Step 2, blue

TIME 100s:  [Other user also funds escrow]
            ├─ AUTOMATIC: Backend detects both funded
            ├─ AUTOMATIC: Triggers executeAtomicSwap()
            ├─ Button changes to: "⏳ Executing Atomic Swap..."
            ├─ Status: "Both funds in escrow, processing exchange"
            ├─ Timeline: ✓ Step 2 (green), → Step 3 (blue + animated)
            └─ Shows pulsing "⏳ Executing Atomic Swap..." banner

TIME 120s:  Atomic swap completes on Starknet
            ├─ Button shows: "✓ Swap Executed Successfully!"
            ├─ Shows: "Transaction: 0x5678..."
            ├─ Timeline: ✓ All 3 steps completed (green)
            ├─ User A receives partyB's amount (in their wallet)
            ├─ User B receives partyA's amount (in their wallet)
            └─ Success message displayed
```

---

## Error Handling & Retries

**If Signing Fails:**
- Error message shown: "Failed to sign match"
- User can retry clicking the Sign button again

**If Escrow Funding Fails:**
- Error message: "Failed to lock funds in escrow contract"
- User can retry after 30 seconds
- Funds returned if escrow locking fails

**If Atomic Swap Fails After Both Funded:**
- Match status: ` escrow_funded` (both have funds locked)
- Status message: "Swap execution queued for retry"
- Backend will auto-retry execution
- User can wait or refresh page

---

## Contract Interaction Summary

### Starknet Smart Contract Calls

When both parties have funded escrow, the following contract calls execute in sequence:

```cairo
// 1. Approve token spend (if needed)
Token.approve(
  spender: EscrowContract,
  amount: partyAmount
)

// 2. Lock funds in escrow
EscrowContract.lock_funds(
  intent_id: intentId,
  amount: partyAmount,
  token_type: 0 (STRK) or 1 (BTC),
  owner: partyWallet
)

// 3a. If PartyA sends STRK:
SellStrkContract.sell_strk_for_btc(
  seller_address: partyA,
  strk_amount: partyA.sendAmount,
  buyer_address: partyB,
  btc_recipient_address: partyA.bitcoinAddress
)

// 3b. If PartyA sends BTC:
BuyStrkContract.buy_strk_with_btc(
  buyer_address: partyB,
  btc_amount_sats: partyA.sendAmount,
  seller_address: partyA
)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `app/swap-matching/page.tsx` | Route wrapper for swap matching page |
| `components/swap-matching-interface-new.tsx` | **Main component** - handles signing, escrow funding UI |
| `app/api/otc/intents/route.ts` | Signature submission & match verification |
| `app/api/otc/escrow/fund/route.ts` | **Escrow funding endpoint** - locks funds & triggers swap |
| `lib/server/otcEscrowService.ts` | **Core escrow engine** - executes atomic swap on Starknet |
| `lib/server/otcMatchingService.ts` | Match storage & status tracking |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Sign This Match" button disabled | Other party hasn't signed yet | Wait for other user |
| "Fund Escrow" button doesn't appear | Not both signed yet | Both users must sign first |
| Signing fails with wallet error | Wallet not connected | Open Argent X / Xverse extension |
| "Failed to fund escrow" error | Insufficient balance | Ensure 0.0001 BTC / ~200 STRK available |
| Swap stuck on "Executing..." | Starknet RPC timeout | Refresh page, backend retries automatically |
| Transaction shows but funds not received | Contract execution failed | Check Starknet Sepolia block explorer |

---

## Summary

The flow is now **fully functional** with:
✅ Wallet signature verification  
✅ Escrow fund locking (BTC & STRK support)  
✅ Automatic atomic swap execution when both funded  
✅ Real Starknet smart contract integration  
✅ Error handling & retry logic  
✅ Polling-based UI updates every 2 seconds  
