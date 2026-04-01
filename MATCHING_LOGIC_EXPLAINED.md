# OTC Matching Logic Explained

## Overview
The ShadowFlow OTC (Over-the-Counter) matching engine connects two users who want to swap complementary assets:
- **User A**: Wants to send **BTC** → Receive **STRK**
- **User B**: Wants to send **STRK** → Receive **BTC**

## How Matching Works

### Step 1: Intent Submission
When a user submits a swap intent, it contains:

```typescript
interface OtcIntent {
  intentId: string;           // Unique identifier
  senderWallet: string;       // User's wallet address
  sendAmount: string;         // Amount they're offering
  sendChain: 'btc' | 'strk';  // Which blockchain asset
  receiveAmount: string;      // Amount they expect to receive
  receiveChain: 'btc' | 'strk'; // Desired receive asset
  status: 'pending' | ...;    // Current state
}
```

**Example:**
- **User A's Intent**: 
  - Send: 0.0001 BTC
  - Receive: ~194.90 STRK

- **User B's Intent** (arrives later):
  - Send: ~194.90 STRK
  - Receive: 0.0001 BTC

### Step 2: Matching Algorithm

The matching engine (`findMatch()` in otcMatchingService.ts) checks each pending intent against all other pending intents:

```
FOR each pending intent (let's call it "intent"):
  FOR each other pending intent in the pool:
    
    ✅ CHECK 1: Is this complementary?
       - Their send chain === Our receive chain?
       - Our send chain === Their receive chain?
       
    ✅ CHECK 2: Do amounts match (within 5% tolerance)?
       - Their send amount ≈ Our receive amount?
       
    IF both checks pass:
       → MATCH FOUND! ✅
       → Create OtcMatch object
       → Update both intents to "matched" status
       → Return match
```

### Step 3: Match Creation

Once a match is found, the service creates an **OtcMatch** object:

```typescript
interface OtcMatch {
  matchId: string;        // Unique match identifier
  intentA: string;        // User A's intent ID
  intentB: string;        // User B's intent ID
  matchedAt: number;      // Timestamp
  
  partyA: {
    wallet: string;
    sendAmount: string;
    sendChain: 'btc' | 'strk';
    receiveAmount: string;
    receiveChain: 'btc' | 'strk';
    signed?: boolean;           // Wallet signature collected
    fundedToEscrow?: boolean;   // Funds locked in escrow
  };
  
  partyB: {
    // Same structure as partyA
  };
  
  status: 'pending' | 'both_approved' | 'escrow_funded' | 'executing' | 'executed';
}
```

## Visual Flow

```
╔═══════════════════════════════════════════════════════════╗
║                    OTC MATCHING FLOW                      ║
╚═══════════════════════════════════════════════════════════╝

1️⃣  USER A SUBMITS INTENT
    ┌─────────────────────┐
    │ I want to send:     │
    │ → 0.0001 BTC        │
    │ ← ~194.90 STRK      │
    └─────────────────────┘
            ↓
    [stored in pendingIntents Map]
    Status: "pending"


2️⃣  USER B SUBMITS INTENT
    ┌─────────────────────┐
    │ I want to send:     │
    │ → ~194.90 STRK      │
    │ ← 0.0001 BTC        │
    └─────────────────────┘
            ↓
    [MATCHING ALGORITHM RUNS]
            ↓


3️⃣  COMPLEMENTARY CHECK
    ┌──────────────────────────────────────┐
    │ User A's send chain (BTC)            │
    │ == User B's receive chain (BTC)?  ✅ │
    │                                      │
    │ User A's receive chain (STRK)        │
    │ == User B's send chain (STRK)?    ✅ │
    └──────────────────────────────────────┘


4️⃣  AMOUNT TOLERANCE CHECK
    ┌──────────────────────────────────────┐
    │ User A wants: ~194.90 STRK           │
    │ User B sends: ~194.90 STRK           │
    │ Difference: 0% (within 5% tolerance) │
    │ Result: ✅ MATCH!                    │
    └──────────────────────────────────────┘


5️⃣  MATCH CREATED
    ┌─────────────────────────────────────┐
    │ OtcMatch {                          │
    │   matchId: "match_abc123..."        │
    │   intentA: User A's intent ID       │
    │   intentB: User B's intent ID       │
    │   status: "pending"                 │
    │ }                                   │
    │                                     │
    │ User A Status: "matched" ✅         │
    │ User B Status: "matched" ✅         │
    └─────────────────────────────────────┘


6️⃣  ATOMIC SWAP EXECUTION
    ┌─────────────────────────────────────┐
    │ Both users sign transaction          │
    │ ↓                                    │
    │ Funds locked in escrow contract     │
    │ ↓                                    │
    │ Step 1: Approve STRK transfer      │
    │ Step 2: Lock in escrow               │
    │ Step 3: Buy STRK (BTC → STRK)       │
    │ Step 4: Sell STRK (STRK → BTC)      │
    │ ↓                                    │
    │ ✅ Both receive their assets!       │
    └─────────────────────────────────────┘
```

## Key Mechanisms

### 1. **Pending Intent Pool**
Maintains a Map of all unmatched intents:
```typescript
private pendingIntents: Map<string, OtcIntent>
```

### 2. **Complementary Pair Detection**
```typescript
const isComplementary =
  other.sendChain === intent.receiveChain &&     // They send what I receive
  other.receiveChain === intent.sendChain;       // I send what they receive
```

### 3. **Amount Tolerance (5% Slippage)**
```typescript
const slippageTolerance = 0.05; // 5%
const sendMatch = 
  Math.abs(otherSendNum - intentReceiveNum) / intentReceiveNum < slippageTolerance;
```

This allows small price variations due to:
- Blockchain confirmations
- Oracle price updates
- Network conditions

### 4. **Singleton Pattern with Hot-Reload Persistence**
```typescript
const globalAny = global as any;
if (!globalAny._otcMatchingServiceInstance) {
  globalAny._otcMatchingServiceInstance = new OtcMatchingService();
}
return globalAny._otcMatchingServiceInstance;
```

Ensures the same intent pool survives across Next.js dev server hot-reloads.

## Status Progression

```
User A Intent:
pending → matched → [User A & B sign] → matched → [escrow execution] → executed

User B Intent:  
pending → matched → [User A & B sign] → matched → [escrow execution] → executed

Match Object:
pending → both_approved → escrow_funded → executing → executed
```

## Example Matching Scenario

### Scenario: User A wants to exchange BTC for STRK

**Step 1: User A submits**
```json
{
  "intentId": "0x19d43a37...",
  "sendAmount": "0.0001",
  "sendChain": "btc",
  "receiveAmount": "194.90",
  "receiveChain": "strk"
}
→ Status: PENDING
```

**Step 2: System waits for a complementary intent**

Pending intents pool:
```
[User A's intent (BTC → STRK)]
```

**Step 3: User B submits (no match yet if amounts don't match)**

If User B wants: 200 STRK → 0.0001 BTC
- Check: 200 vs 194.90 = 2.6% difference
- Within 5% tolerance ✅
- **MATCH FOUND!**

**Step 4: Both intents marked as matched**
```
User A: status = "matched" ✅
User B: status = "matched" ✅
```

**Step 5: Signatures & Execution**
- Both users sign with their wallets
- Funds locked in escrow contract
- Atomic swap executes on both chains
- Funds released to recipients

## Failure Cases

**No Match (If User B wants):**
- 300 STRK → 0.0001 BTC
- Difference: (300 - 194.90) / 194.90 = 53.8%
- Exceeds 5% tolerance ❌
- **NO MATCH** - User B intent stays pending

**Intent Expires:**
- Default: 5 minutes (configurable: `INTENT_EXPIRY_MS = 5 * 60 * 1000`)
- After expiration, intent is cleaned up

## Key Functions

| Function | Purpose |
|----------|---------|
| `submitIntent()` | Add intent and try to find match |
| `findMatch()` | Check if intent is complementary to any pending intent |
| `getMatch()` | Retrieve a specific match by ID |
| `getIntent()` | Retrieve a specific intent by ID |
| `markPartySigned()` | Record wallet signature |
| `markMatchExecuted()` | Record successful swap |
| `clearAllIntents()` | **[DEV ONLY]** Reset all intents |
| `getState()` | **[DEV ONLY]** View current matching state |

## Testing the Matching Logic

### Clear all intents and start fresh:
```bash
node scripts/clear-intents.js
```

### View current state:
```bash
curl http://localhost:3000/api/otc/admin/clear
```

### Run full P2P test:
```bash
npm run test:otc
```

This will:
1. Create User A intent (BTC → STRK)
2. Create User B intent (STRK → BTC)
3. Trigger automatic matching
4. Collect signatures
5. Execute atomic swap
