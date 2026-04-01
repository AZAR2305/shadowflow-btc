# ⚡ Quick Matching Logic Reference

## The Three Core Checks

When User B submits an intent, the system automatically checks if it matches User A's pending intent:

### ✅ Check 1: Chains are Opposite
```
User A: BTC → STRK
User B: STRK → BTC
         ↑
      These MUST be opposite
```

### ✅ Check 2: Amounts are Compatible (within 5%)
```
User A wants to receive:  194.90 STRK
User B wants to send:     194.90 STRK
Difference: 0% < 5% tolerance ✅

Tolerance Range: 185.15 - 204.65 STRK ✓
```

### ✅ Check 3: Not Already Matched
```
Status check - both must be "pending" (not already matched)
```

---

## State Diagram

```
        USER A                          USER B
    ┌────────────┐                  ┌────────────┐
    │ Submits    │                  │ Waits...   │
    │ Intent:    │                  │            │
    │ BTC → STRK │                  │            │
    └────────────┘                  └────────────┘
         ↓                                
    [Intent stored]                     
    Status: pending                      
         ↓                                
    [Waiting for match...]               
         ↓                                ↓
         │                           ┌────────────┐
         │                           │ Submits    │
         │                           │ Intent:    │
         │                           │ STRK → BTC │
         │                           └────────────┘
         │                                ↓
         │                           [Matching algorithm]
         └───────────→ [MATCH FOUND] ←───┘
                            ↓
                   ┌─────────────────┐
                   │  Both intents   │
                   │  status =       │
                   │  "matched" ✅   │
                   └─────────────────┘
                            ↓
                   [Wait for signatures]
                            ↓
                   [Both sign with wallet]
                            ↓
                   [Execute atomic swap]
                            ↓
                   [Swap completed] ✅
```

---

## Real Code Logic

Here's the exact matching algorithm from `otcMatchingService.ts`:

```typescript
private findMatch(intent: OtcIntent): Match | null {
  
  // Look through all pending intents
  for (const [otherId, other] of this.pendingIntents) {
    
    // Skip self and non-pending intents
    if (otherId === intent.intentId || other.status !== 'pending') {
      continue;
    }
    
    // ✅ CHECK 1: Are chains complementary?
    const isComplementary =
      other.sendChain === intent.receiveChain &&   // They send what I need
      other.receiveChain === intent.sendChain;      // I send what they need
    
    if (!isComplementary) continue;
    
    // ✅ CHECK 2: Do amounts match (5% tolerance)?
    const tolerance = 0.05;
    const difference = Math.abs(
      Number(other.sendAmount) - Number(intent.receiveAmount)
    ) / Number(intent.receiveAmount);
    
    if (difference >= tolerance) continue;
    
    // ✅ MATCH FOUND!
    return {
      intentA: intent.intentId,
      intentB: otherId,
      partyA: { /* user A details */ },
      partyB: { /* user B details */ }
    };
  }
  
  return null; // No match found
}
```

---

## Current System State

To check current intents and matches:

```typescript
// Get current state (DEV ONLY)
const state = service.getState();

console.log(state.totalIntents);    // Number of pending intents
console.log(state.totalMatches);    // Number of active matches
console.log(state.intents);         // List of all intents
console.log(state.matches);         // List of all matches
```

---

## Example Matching Scenarios

### ✅ WILL MATCH
```
User A: Send 0.0001 BTC  ← Receive 194.90 STRK
User B: Send 194.90 STRK ← Receive 0.0001 BTC
Result: ✅ PERFECT MATCH (0% difference)
```

### ✅ WILL MATCH (with 2% tolerance)
```
User A: Send 0.0001 BTC  ← Receive 194.90 STRK
User B: Send 198.69 STRK ← Receive 0.0001 BTC
Difference: (198.69 - 194.90) / 194.90 = 1.94%
Result: ✅ MATCH (within 5% tolerance)
```

### ❌ WON'T MATCH  
```
User A: Send 0.0001 BTC  ← Receive 194.90 STRK
User B: Send 300 STRK    ← Receive 0.0001 BTC
Difference: (300 - 194.90) / 194.90 = 53.8%
Result: ❌ NO MATCH (exceeds 5% tolerance)
User B intent stays pending until:
  a) A matching intent arrives
  b) Intent expires (5 minutes)
```

### ❌ WON'T MATCH (wrong direction)
```
User A: Send BTC  ← Receive STRK
User B: Send BTC  ← Receive STRK
Result: ❌ NO MATCH (both want same direction)
```

---

## Storage & Persistence

**In Memory:**
- `Map<intentId, OtcIntent>` - Pending intents
- `Map<matchId, OtcMatch>` - Active matches
- Uses JavaScript `global` for hot-reload persistence in dev

**Expiration:**
- Default: 5 minutes (`INTENT_EXPIRY_MS = 300000ms`)
- Intents older than expiry are cleaned up automatically

**On Execution:**
- Match data is persisted to blockchain via smart contracts
- Same as transaction proof

---

## Developer Commands

```bash
# Clear all intents (fresh start)
node scripts/clear-intents.js

# Check matching service state (requires running dev server)
curl http://localhost:3000/api/otc/admin/clear

# Run full P2P matching test
npm run test:otc
```

---

## Debugging Tips

### If matching isn't working:

1. **Check intent amounts:**
   ```
   Log: [SUBMIT-START] Received intent
   Verify: sendAmount and receiveAmount are set
   ```

2. **Check chain directions:**
   ```
   User A: sendChain=btc, receiveChain=strk
   User B: sendChain=strk, receiveChain=btc
   Must be OPPOSITE ✓
   ```

3. **Check tolerance:**
   ```
   If amounts differ > 5%:
   (300 - 194.90) / 194.90 = 53.8% ← TOO BIG
   Reduce one user's amount or increase tolerance
   ```

4. **Check status:**
   ```
   Intents must be "pending" to match
   If already "matched" or "executed", they won't rematch
   Use: node scripts/clear-intents.js to reset
   ```
