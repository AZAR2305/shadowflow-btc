# 🔄 Matching Logic - Visual Breakdown

## The Core Algorithm

```
INPUT: New Intent from User B
  {
    intentId: "0xabc123...",
    senderWallet: "0xuser_b_wallet",
    sendAmount: "194.90",
    sendChain: "strk",
    receiveAmount: "0.0001",
    receiveChain: "btc"
  }

═══════════════════════════════════════════════════════════════

ALGORITHM: Loop through all pending intents

  FOR EACH pending intent "other" {
  
    STEP 1: Skip self matches
    ─────────────────────────────
    if (other.intentId == new_intent.intentId)
      → continue to next intent
    
    
    STEP 2: Skip non-pending intents
    ─────────────────────────────
    if (other.status != "pending")
      → continue to next intent
    
    
    STEP 3: Check chain complementarity ✨
    ─────────────────────────────
    Is this a complementary pair?
    
    Define: isComplementary = (
      other.sendChain === new_intent.receiveChain  AND
      other.receiveChain === new_intent.sendChain
    )
    
    EXAMPLE - User A's stored intent:
    ┌────────────────┐
    │ sendChain: btc │  ← They're sending Bitcoin
    │ recChain: strk │  ← They expect Starknet
    └────────────────┘
    
    EXAMPLE - User B's new intent:
    ┌────────────────┐
    │ sendChain: strk│  ← They're sending Starknet
    │ recChain: btc  │  ← They expect Bitcoin
    └────────────────┘
    
    CHECK:
    ✓ other.sendChain (btc) === new.receiveChain (btc) 
    ✓ other.receiveChain (strk) === new.sendChain (strk)
    
    Result: isComplementary = TRUE ✅
    
    if (!isComplementary)
      → continue to next intent
    
    
    STEP 4: Check amount compatibility ✨
    ─────────────────────────────
    Tolerance = 5% (allows small price variations)
    
    Get amounts:
    • otherSendNum = 194.90 (STRK)
    • newReceiveNum = 194.90 (STRK)
    
    Calculate difference:
    tolerance = |194.90 - 194.90| / 194.90
    tolerance = 0 / 194.90 = 0%
    
    Allowed range: ±5% = [185.15 - 204.65]
    
    Actual difference: 0%
    Is 0% < 5%? YES ✅
    
    if (difference >= 5%)
      → continue to next intent
    
    
    🎉 MATCH FOUND!
    ═════════════════════════════════════════════
    RETURN {
      intentA: "0xabc123...",      (User A's original intent)
      intentB: "0xdef456...",      (User B's new intent)
      
      partyA: {
        wallet: "0xuser_a_wallet",
        sendAmount: "0.0001",
        sendChain: "btc",
        receiveAmount: "194.90",
        receiveChain: "strk"
      },
      
      partyB: {
        wallet: "0xuser_b_wallet",
        sendAmount: "194.90",
        sendChain: "strk",
        receiveAmount: "0.0001",
        receiveChain: "btc"
      }
    }
  
  } // End of FOR loop
  
  If no match found after checking all intents:
  RETURN null

═══════════════════════════════════════════════════════════════

OUTPUT: Match object or null
```

---

## Decision Tree

```
                    ┌─ New Intent Received
                    │
                    ├─ Store in pendingIntents
                    │
                    ├─ Try to find match
                    │
                    ▼
          ┌─────────────────────┐
          │ For each pending    │
          │ intent in pool      │
          └─────────────────────┘
                    │
                    ├─ Same as incoming intent?
                    │  ├─ YES → Skip (continue)
                    │  └─ NO → Continue
                    │
                    ├─ Status == "pending"?
                    │  ├─ NO → Skip (continue)
                    │  └─ YES → Continue
                    │
                    ├─ Chain complementary?
                    │  │
                    │  ├─ Other sends: btc, receives: strk
                    │  ├─ New sends: strk, receives: btc
                    │  │
                    │  ├─ YES → Check amounts
                    │  └─ NO → Skip (continue)
                    │
                    ├─ Amounts within 5%?
                    │  │
                    │  ├─ Other sends: 194.90
                    │  ├─ New receives: 194.90
                    │  ├─ Difference: 0% ✓
                    │  │
                    │  ├─ YES → 🎉 MATCH FOUND
                    │  └─ NO → Skip (continue)
                    │
                    ▼
          ┌─────────────────────┐
          │ Loop done for all   │
          │ intents             │
          └─────────────────────┘
                    │
                    ├─ Match found?
                    │  ├─ YES → Create OtcMatch + update statuses
                    │  └─ NO → Intent stays "pending"
                    │
                    ▼
          Return match or null
```

---

## State Transition Diagram

```
                    INTENT SUBMISSION
                            │
                            ▼
                    ┌─────────────────┐
                    │   NEW INTENT    │
                    │ status: pending │
                    └─────────────────┘
                            │
                            ├─ Matching algorithm runs
                            │
                    ┌───────┴────────┐
                    │                │
                    ▼                ▼
            ┌──────────────┐  ┌──────────────┐
            │  MATCH FOUND │  │ NO MATCH YET │
            └──────────────┘  └──────────────┘
                    │                │
                    ▼                ▼
            ┌──────────────┐  ┌──────────────┐
            │   MATCHED    │  │   PENDING    │
            │ (both users) │  │(wait for B)  │
            └──────────────┘  └──────────────┘
                    │                │
                    │                ├─ [5 min passes]
                    │                │
                    │                ▼
                    │        ┌──────────────┐
                    │        │   EXPIRED    │
                    │        │ (cleaned up) │
                    │        └──────────────┘
                    │
                    ├─ Both users sign
                    │
                    ▼
            ┌──────────────┐
            │ APPROVED BY  │
            │ BOTH PARTIES │
            └──────────────┘
                    │
                    ├─ Funds to escrow
                    │
                    ▼
            ┌──────────────┐
            │ ESCROW       │
            │ FUNDED       │
            └──────────────┘
                    │
                    ├─ Execute atomic swap
                    │
                    ▼
            ┌──────────────┐
            │ EXECUTED ✅  │
            └──────────────┘
```

---

## Code Location & Files

### Main Matching Service
**File:** `lib/server/otcMatchingService.ts`

**Key Methods:**
```typescript
submitIntent()          // Add new intent + try to match
findMatch()             // Core matching algorithm (LINES 210-240)
getMatch()              // Retrieve a match
getIntent()             // Retrieve an intent
clearAllIntents()       // [DEV] Reset all data
getState()              // [DEV] View current state
```

### API Endpoints

**Admin Endpoint:** `app/api/otc/admin/clear/route.ts`
```
POST   /api/otc/admin/clear       → Clear all intents
GET    /api/otc/admin/clear       → Get current state
```

**Main Flow:** `app/api/otc/intents/route.ts`
```
POST   /api/otc/intents/validate  → Validate & submit intent
POST   /api/otc/intents/execute   → Execute matched swap

```

---

## Memory Model

### Data Structure

```typescript
class OtcMatchingService {
  
  // ✅ All pending intents (waiting for match)
  private pendingIntents: Map<
    intentId: string,      // Key
    OtcIntent             // Value
  > = new Map()
  
  // ✅ All active matches (paired intents)
  private matches: Map<
    matchId: string,       // Key
    OtcMatch              // Value
  > = new Map()
  
  // ✅ Global reference for hot-reload persistence
  // Survives Next.js dev server restarts
  global._otcMatchingServiceInstance
  
}
```

### Instance Retrieval

```typescript
const service = OtcMatchingService.getInstance();
// USE GLOBAL: Survives hot-reloads ✅
// Same instance across requests ✅
```

---

## Example Walkthrough

### Scenario: Fresh Start

```
TIME: 0s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

System state:
  pendingIntents: {}
  matches: {}


TIME: 1s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USER A submits intent:
  {
    sendAmount: "0.0001",
    sendChain: "btc",
    receiveAmount: "194.90",
    receiveChain: "strk"
  }

System action:
  ✓ Store in pendingIntents
  ✓ Try findMatch() - no other intents yet
  ✓ Return: no match found

System state:
  pendingIntents: { a123: {...User A intent...} }
  matches: {}


TIME: 5s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USER B submits intent:
  {
    sendAmount: "194.90",
    sendChain: "strk",
    receiveAmount: "0.0001",
    receiveChain: "btc"
  }

System action:
  ✓ Store in pendingIntents
  ✓ Try findMatch()
    
    Loop iteration 1: Check against User A
    ├─ Different intent? YES ✓
    ├─ Pending status? YES ✓
    ├─ Complementary chains?
    │  ├─ B.send (strk) == A.receive (strk)? YES ✓
    │  ├─ B.receive (btc) == A.send (btc)? YES ✓
    │  ├─ Result: isComplementary = TRUE
    │
    ├─ Amount match?
    │  ├─ B.send (194.90) vs A.receive (194.90)
    │  ├─ |194.90 - 194.90| / 194.90 = 0%
    │  ├─ 0% < 5%? YES ✓
    │  ├─ Result: sendMatch = TRUE
    │
    └─ 🎉 MATCH FOUND!
    
  ✓ Create OtcMatch object
  ✓ Update intent statuses: pending → matched
  ✓ Return match

System state:
  pendingIntents: {
    a123: {status: "matched", matchedWith: "b456"},
    b456: {status: "matched", matchedWith: "a123"}
  }
  matches: { match789: {partyA, partyB, status: "pending"} }


TIME: 6s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Both users sign intents:
  User A signature: 0x...
  User B signature: 0x...

System action:
  ✓ Update intent signatures
  ✓ Update match status: pending → both_approved

System state:
  pendingIntents: {
    a123: {status: "matched", signature: "0x..."},
    b456: {status: "matched", signature: "0x..."}
  }
  matches: { match789: {status: "both_approved"} }


TIME: 7s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Execute atomic swap:
  Step 1: Approve STRK transfer
  Step 2: Lock funds in escrow
  Step 3: Buy STRK (BTC → STRK conversion)
  Step 4: Sell STRK (STRK → BTC conversion)

System action:
  ✓ Call Starknet contracts
  ✓ Update match status: both_approved → executed

System state:
  pendingIntents: {
    a123: {status: "matched"},
    b456: {status: "matched"}
  }
  matches: { match789: {status: "executed", txHash: "0x..."} }


TIME: 8s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Result: ✅ SWAP COMPLETED
  User A: Sent 0.0001 BTC → Received ~194.90 STRK
  User B: Sent ~194.90 STRK → Received 0.0001 BTC
```

---

## Summary

| Component | Responsibility |
|-----------|-----------------|
| **Matching Algorithm** | Finds complementary intent pairs |
| **Chain Check** | Ensures opposite direction (BTC↔STRK) |
| **Amount Check** | Validates within 5% tolerance |
| **Status Management** | Tracks intent lifecycle |
| **Serialization** | Converts to blockchain transaction |
| **Storage** | Maintains state across hot-reloads |

The matching engine is **deterministic**, **fast** (<1ms), and **stateless** (works with any pair of complementary intents).
