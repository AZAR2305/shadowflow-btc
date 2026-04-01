# OTC Peer-to-Peer Atomic Swap Flow - Detailed Walkthrough

## Overview: Two Users, Cross-Chain Swap, Escrow-Guaranteed

**User A**: Has Bitcoin wallet (Xverse/Unisat), Wants STRK
**User B**: Has Starknet wallet (Argent X/Braavos), Wants BTC

**Goal**: Atomic swap where both parties' funds exchange simultaneously via escrow

---

## Complete Flow Breakdown

### **PHASE 1: USER A SUBMITS INTENT (BTC → STRK)**

**Step 1.1 - User A Visits OTC Page**
```
URL: http://localhost:3002/otc-intent
```

**Step 1.2 - User A Connects Bitcoin Wallet**
- Clicks "Connect Wallet"
- Selects Xverse or Unisat
- Bitcoin wallet address connected (e.g., `bc1qw508d6qejxtdg...`)

**Step 1.3 - Auto-Detection: Sends BTC**
```typescript
// System detects Bitcoin wallet automatically
if (wallet.provider === 'xverse' || wallet.provider === 'unisat') {
  setIntent({
    sendChain: 'btc',      // ← Auto-set
    receiveChain: 'strk'   // ← Auto-set
  })
}
```

**Step 1.4 - User A Fills Form**
```
Direction: BUY (wants to receive STRK)
Send Amount: 0.001 BTC (from User A's Bitcoin wallet)
Send Wallet: bc1qw508d6qejxtdg... (Bitcoin address)
Receive Wallet: 0x123...abc (User A's Starknet address)
```

**Step 1.5 - Calculate Expected Receive (Price Oracle)**
```
BTC Price: $43,000
STRK Price: $2.18

Exchange Rate = $43,000 / $2.18 = 19,725 STRK per BTC

User A sending: 0.001 BTC
Expected to receive: 0.001 × 19,725 ≈ 19.725 STRK

(Let's say system rounds/adds slippage tolerance = ~197 STRK for 0.0001 BTC)
```

**Step 1.6 - User A Clicks "Generate Intent"**
```
POST /api/otc/intents?step=validate
Body: {
  intentId: "intent_123abc",
  sendChain: "btc",
  sendAmount: "0.001",          // in BTC units
  receiveChain: "strk",
  receiveAmount: "19.725",      // in STRK units
  walletAddress: "bc1qw508d6qejxtdg...",
  receiveWalletAddress: "0x456...xyz"
}
```

**Step 1.7 - Server Generates ZK Proof (Ownership Verification)**
```typescript
ZKProof = {
  proofHash: "0xabc123...",
  commitment: "verified_ownership_of_BTC_amount",
  nullifier: "prevents_double_spending",
  verified: true  // On-chain verification
}
// ↑ This proves User A has 0.001 BTC without revealing private key
```

**Step 1.8 - Server Submits to OTC Matching Engine**
```typescript
OtcMatchingService.submitIntent({
  intentId: "intent_123abc",
  senderWallet: "bc1qw508d6qejxtdg...",
  sendAmount: "0.001",
  sendChain: "btc",
  receiveAmount: "19.725",
  receiveChain: "strk",
  zkProof: { ... }
})
```

**Step 1.9 - Search for Complementary Intent**
```
Matching Engine looks for:
✓ Intent that sends STRK (opposite of BTC)
✓ Intent that receives BTC (opposite of STRK) 
✓ Amount within 5% slippage tolerance
```

**Step 1.10 - Response to User A**
```
❌ No match found yet

Response: {
  step: "validate",
  status: "pending",
  matchStatus: {
    status: "pending",
    message: "⏳ Your intent is waiting in order book. Waiting for matching peer..."
  },
  transactionHash: null   // No execution yet
}
```

---

### **PHASE 2: USER B SUBMITS COMPLEMENTARY INTENT (STRK → BTC)**

**Step 2.1 - User B Opens OTC Page (Different Browser/Device)**
```
URL: http://localhost:3002/otc-intent
```

**Step 2.2 - User B Connects Starknet Wallet**
- Clicks "Connect Wallet"
- Selects Argent X or Braavos
- Starknet wallet address connected (e.g., `0x789...def`)

**Step 2.3 - Auto-Detection: Sends STRK**
```typescript
// System detects Starknet wallet automatically
if (wallet.provider === 'argent-x' || wallet.provider === 'braavos') {
  setIntent({
    sendChain: 'strk',     // ← Auto-set
    receiveChain: 'btc'    // ← Auto-set
  })
}
```

**Step 2.4 - User B Fills Form (Opposite of User A)**
```
Direction: SELL (wants to receive BTC)
Send Amount: 19.725 STRK (from User B's Starknet wallet)
Send Wallet: 0x789...def (Starknet address)
Receive Wallet: 1A1z...zzz (User B's Bitcoin address)
```

**Step 2.5 - Submit to Matching Engine**
```
POST /api/otc/intents?step=validate
Body: {
  intentId: "intent_456def",
  sendChain: "strk",
  sendAmount: "19.725",         // STRK
  receiveChain: "btc",
  receiveAmount: "0.001",       // BTC
  walletAddress: "0x789...def",
  receiveWalletAddress: "1A1z...zzz"
}
```

**Step 2.6 - Matching Engine Finds User A's Intent**
```typescript
// User A's intent:
IntentA = {
  intentId: "intent_123abc",
  sendChain: "btc",
  sendAmount: "0.001",
  receiveChain: "strk",
  receiveAmount: "19.725"
}

// User B's intent:
IntentB = {
  intentId: "intent_456def",
  sendChain: "strk",
  sendAmount: "19.725",
  receiveChain: "btc",
  receiveAmount: "0.001"
}

// ✅ MATCH FOUND!
// User A wants: STRK ← User B wants to give: STRK ✓
// User B wants: BTC ← User A wants to give: BTC ✓
// Amounts match within 5% tolerance ✓
```

**Step 2.7 - Create OTC Match Record**
```typescript
OtcMatch = {
  matchId: "match_789ghi",
  intentA: "intent_123abc",
  intentB: "intent_456def",
  
  partyA: {
    wallet: "bc1qw508d6qejxtdg...",  // User A Bitcoin
    sendAmount: "0.001",
    sendChain: "btc",
    receiveAmount: "19.725",
    receiveChain: "strk"
  },
  
  partyB: {
    wallet: "0x789...def",           // User B Starknet
    sendAmount: "19.725",
    sendChain: "strk",
    receiveAmount: "0.001",
    receiveChain: "btc"
  },
  
  status: "pending"  // Waiting for both to sign
}
```

**Step 2.8 - Response to User B: ✅ MATCHED!**
```json
{
  step: "validate",
  status: "matched",
  match: {
    matchId: "match_789ghi",
    matchedWith: "intent_123abc",
    partyA: {
      wallet: "bc1qw508d6qejxtdg...",  // User A (masked or partial)
      offer: "Sending 0.001 BTC, Receiving 19.725 STRK"
    },
    status: "pending",
    message: "✅ MATCHED! Found peer. Both parties must sign to proceed."
  }
}
```

---

### **PHASE 3: BOTH USERS SIGN (AUTHORIZATION)**

**Step 3.1 - User A Receives Match Notification**
```
Frontend polls GET /api/otc/matches?view=matches
or WebSocket subscription alerts:

MESSAGE: "✅ MATCHED! A peer wants to swap with you!"
Details:
  • Peer Wallet: 0x789...def (masked)
  • They're sending: 19.725 STRK
  • You'll receive: 19.725 STRK ✓
  • They want: 0.001 BTC
  • You'll send: 0.001 BTC ✓
```

**Step 3.2 - User A Clicks "Sign Intent"**
- Browser asks: "Sign this swap intent?"
- User A confirms in Bitcoin wallet
- Signature created: `sig_userA = sign(intentId + amount + chains)`

**Step 3.3 - User A's Signature Endpoint**
```
POST /api/otc/intents?step=execute
Body: {
  intentId: "intent_123abc",
  signature: "sig_userA_3f4e7a9c...",
  walletAddress: "bc1qw508d6qejxtdg..."
}
```

**Step 3.4 - Server Records User A's Signature**
```typescript
OtcMatchingService.updateIntentSignature(
  "intent_123abc",
  "sig_userA_3f4e7a9c..."
)

// Check if both signed
areIntentsApproved(matchId) {
  intentA = getIntent("intent_123abc")     // ✓ signed
  intentB = getIntent("intent_456def")     // ? not yet
  return intentA.signature && intentB.signature  // false
}
```

**Step 3.5 - Response to User A: Waiting for Peer**
```json
{
  step: "execute",
  status: "partial",
  mode: "otc_peer_to_peer",
  matchId: "match_789ghi",
  message: "✓ Your signature recorded! Waiting for peer (0x789...def) to sign..."
}
```

**Step 3.6 - User B Receives Notification: "Your Turn to Sign"**
```
Frontend polling updates:

MESSAGE: "⏳ Both Signatures Needed"
User A: ✅ Signed
User B: ⏳ Waiting for you...
```

**Step 3.7 - User B Clicks "Sign Intent"**
- Browser asks: "Sign this swap intent?"
- User B confirms in Starknet wallet
- Signature created: `sig_userB = sign(intentId + amount + chains)`

**Step 3.8 - User B's Signature Endpoint**
```
POST /api/otc/intents?step=execute
Body: {
  intentId: "intent_456def",
  signature: "sig_userB_8k2j5l9p...",
  walletAddress: "0x789...def"
}
```

**Step 3.9 - Server Detects Both Signed! 🎯**
```typescript
// Server updates User B's signature
OtcMatchingService.updateIntentSignature(
  "intent_456def",
  "sig_userB_8k2j5l9p..."
)

// Check if both signed
areIntentsApproved("match_789ghi") {
  intentA = getIntent("intent_123abc")     // ✓ sig_userA
  intentB = getIntent("intent_456def")     // ✓ sig_userB
  return true  // ✅ BOTH SIGNED!
}
```

---

### **PHASE 4: ATOMIC ESCROW EXECUTION (6-STEP SWAP)**

**Step 4.0 - Server Triggers Escrow Service**
```
Both signatures present → Execute atomic swap

OtcEscrowService.executeAtomicSwap(
  matchId: "match_789ghi",
  sigA: "sig_userA_3f4e7a9c...",
  sigB: "sig_userB_8k2j5l9p...",
  account: executorAccount
)
```

**Step 4.1 - Verify ZK Proofs On-Chain**
```
Escrow Contract Action 1/6:
├─ Load User A's proof: proofHash_A
├─ Load User B's proof: proofHash_B (STRK amount ownership)
├─ Call Starknet verifier contract
├─ Confirm: User A can prove ownership of 0.001 BTC ✓
└─ Confirm: User B can prove ownership of 19.725 STRK ✓

Status: ✅ Both parties proven to have funds
```

**Step 4.2 - Validate Signatures**
```
Escrow Contract Action 2/6:
├─ Recover signer from sig_userA
├─ Confirm: Signed by User A's wallet ✓
├─ Recover signer from sig_userB
├─ Confirm: Signed by User B's wallet ✓

Status: ✅ Both party signatures authentic
```

**Step 4.3 - Lock Escrow Contract**
```
Escrow Contract Action 3/6:
├─ Create escrow with two amount compartments
│  ├─ Compartment A: 0.001 BTC (locked from User A)
│  └─ Compartment B: 19.725 STRK (locked from User B)
├─ Set escrow status: LOCKED
├─ Record match ID + expiry timestamp

Status: ✅ Both amounts locked, no cheating possible
```

**Step 4.4 - Transfer User A's Funds to User B**
```
Escrow Contract Action 4/6:
├─ Source: User A's Bitcoin wallet (bc1qw508d6qejxtdg...)
├─ Destination: User B's Bitcoin address (1A1z...zzz)
├─ Amount: 0.001 BTC
├─ Bridge: BTC → Starknet Bridge (if needed) OR direct Bitcoin transfer
├─ Confirm on-chain: tx_hash_btc = "0xabc123..."

Status: ✅ User A's BTC in flight to User B
```

**Step 4.5 - Transfer User B's Funds to User A**
```
Escrow Contract Action 5/6:
├─ Source: User B's Starknet wallet (0x789...def)
├─ Destination: User A's Starknet address (0x456...xyz)
├─ Amount: 19.725 STRK
├─ Execution: Starknet STRK transfer
├─ Confirm on-chain: tx_hash_strk = "0xdef456..."

Status: ✅ User B's STRK in flight to User A
```

**Step 4.6 - Release Escrow & Finalize**
```
Escrow Contract Action 6/6:
├─ Check both transfers confirmed ✓
├─ Mark escrow as EXECUTED
├─ Release any collateral/insurance
├─ Emit event: SwapCompleted(matchId, txA, txB)
└─ Update match status: "executed"

Status: ✅ ATOMIC SWAP COMPLETE
```

---

## Result: Both Users Got Their Swap ✅

### **User A's Wallet State Change:**
```
BEFORE:
  Bitcoin Wallet: 0.001 BTC ⬅️ (ready to send)
  Starknet Wallet: 0 STRK

AFTER (Step 4.5 completes):
  Bitcoin Wallet: 0 BTC (sent to User B)
  Starknet Wallet: 19.725 STRK ✅ (received from User B)
```

### **User B's Wallet State Change:**
```
BEFORE:
  Starknet Wallet: 19.725 STRK ⬅️ (ready to send)
  Bitcoin Wallet: 0 BTC

AFTER (Step 4.4 completes):
  Starknet Wallet: 0 STRK (sent to User A)
  Bitcoin Wallet: 0.001 BTC ✅ (received from User A)
```

### **Both Users See On Frontend:**
```
✅ Swap Executed!
Transaction Hashes:
  • BTC Transfer: 0xabc123... (Step 4.4)
  • STRK Transfer: 0xdef456... (Step 4.5)
  
Match ID: match_789ghi
Status: COMPLETED
Timestamp: 2026-03-31 14:25:00 UTC
```

---

## Why This Is Atomic (Guaranteed)

### **Without Escrow (Problems):**
```
User A sends 0.001 BTC → User B receives it
User B could then: "Thanks! Not sending STRK now!" 💀
User A is stuck with no STRK ❌
```

### **With Escrow (Solution):**
```
Step 1: Both ZK proofs verified (can't fake funds) ✓
Step 2: Both signatures valid (can't repudiate later) ✓
Step 3: Escrow locks BOTH amounts simultaneously ✓
Step 4-5: Both transfers happen in same transaction ✓
Step 6: Released only after BOTH complete ✓

If User B's STRK transfer fails? → Entire swap reverts ✅
User A's BTC returns to their wallet automatically ✅
```

---

## Summary Table

| Phase | Action | User A | User B | Status |
|-------|--------|---------|---------|--------|
| 1 | Submit Intent (BTC→STRK) | Creates intent_123abc | — | Pending |
| 2 | Submit Intent (STRK→BTC) | — | Creates intent_456def | **MATCHED!** ⚡ |
| 3a | Sign Intent | Signs sig_userA | — | Waiting |
| 3b | Sign Intent | — | Signs sig_userB | **Both Signed!** 🔐 |
| 4 | Atomic Swap | Sends 0.001 BTC | Sends 19.725 STRK | **EXECUTED!** ✅ |
| Done | Wallets Updated | +19.725 STRK | +0.001 BTC | **COMPLETE** 🎉 |

---

## Key Guarantees

1. **ZK Proofs**: Users prove they have the funds without sharing private keys
2. **Atomic**: Both transfers succeed or both fail (no partial execution)
3. **Escrow-Locked**: Funds can't be spent elsewhere once committed
4. **Peer-to-Peer**: No intermediary takes a cut
5. **Cross-Chain**: BTC ↔ STRK swap in one transaction
