# ShadowFlow OTC Swap Implementation Guide

## 📋 Overview

This guide explains what's been implemented, how to run it, and how to test the OTC (Over-The-Counter) matching and atomic swap system.

---

## 🎯 What's Been Implemented

### 1. **Fuzzy Matching with Tolerance** (Near-Enough Values)
- **File:** `lib/server/otcMatchingService.ts`
- **What:** Users can now submit swap intents with amounts that don't need to match EXACTLY
- **How it works:** 
  - 5% tolerance band on both send and receive amounts
  - System finds the **closest match** instead of first match
  - Example: If you want to swap 1 BTC, the system will match you with someone wanting 0.95-1.05 BTC
  - **Scoring:** `score = (sendGap + receiveGap) / 2` - lowest score wins

### 2. **Bug Fix: Swap Matching Component**
- **File:** `components/swap-matching-interface-new.tsx`
- **Fixed:** Error handling in the `handleFundToEscrow()` function
- **Impact:** Properly catches and reports errors when funding escrow

### 3. **Complete 3-Phase Swap Flow**
The system now automatically handles the entire atomic swap process:
```
Phase 1: SIGNING
  └─ User approves swap via wallet signature

Phase 2: ESCROW FUNDING  
  └─ Both parties lock funds into escrow contract
  └─ Auto-triggers Phase 3 when both have funded

Phase 3: ATOMIC SWAP EXECUTION
  └─ Smart contract executes simultaneous transfer
  └─ Both parties get swapped assets or both get refunded (atomically)
```

---

## 🚀 How to Run

### Prerequisites
```bash
# Node.js 18+ and npm required
node --version  # Should be v18 or higher
npm --version   # Should be v8 or higher
```

### Setup & Installation
```bash
# 1. Navigate to project directory
cd c:\Users\thame\shadowflow-BTC\shadowflow-btc

# 2. Install dependencies
npm install

# 3. Set up environment variables (create .env.local)
STARKNET_PROVIDER_URL=https://api.cartridge.gg/x/starknet/sepolia
DATABASE_URL=your_database_url
# (Other variables as needed)
```

### Start Development Server
```bash
# Terminal 1: Start Next.js dev server
npm run dev
# Server runs at http://localhost:3000

# Terminal 2: (Optional) Start node watch for backend changes
npm run watch:server
```

### Build for Production
```bash
npm run build
npm start
```

---

## 📝 How to Test the Implementation

### Test 1: Fuzzy Matching (Near-Enough Values)

**Scenario:** User A wants 1 BTC, User B wants to give 0.97 BTC (3% difference - within 5% tolerance)

**Steps:**
1. Start dev server: `npm run dev`
2. Navigate to OTC swap page
3. **User A submits intent:**
   - Send: 1 BTC
   - Receive: 0.03 STRK
4. **User B submits intent:**
   - Send: 0.03 STRK  
   - Receive: 0.97 BTC (0.97 = 1 - 3% tolerance)
5. **Expected result:** Users should match on `/otc-waiting` page
   - Check browser console for: `[OTC-Match] Closest peer selected within tolerance: { score: X }`

**Test Edge Cases:**
- ✅ **Within tolerance (≤5%):** Should match
- ✅ **Exact match:** Should definitely match
- ❌ **Outside tolerance (>5%):** Should NOT match - stay pending
- ✅ **Multiple candidates:** Should pick closest one (lowest score)

### Test 2: Post-Match Routing

**Steps:**
1. Get two users matched (following Test 1)
2. **Verify page flow:**
   ```
   Click Match → /swap-matching page
   View intent details with both parties' wallets
   ```
3. Check URL should be: `/swap-matching?intentId=xxx&matchId=yyy`

### Test 3: The 3-Phase Swap Execution Flow

#### Phase 1: Signing
```bash
# What to verify:
1. User sees "Waiting for your signature" dialog
2. Click "Sign with [Wallet]"
3. Wallet opens (Argent X for STRK, Xverse for BTC)
4. Sign "MATCH" message
5. UI should show checkmark ✓ next to "Signing"
```

#### Phase 2: Escrow Funding
```bash
# When BOTH users have signed:
1. UI shows "Escrow Funding" phase
2. User clicks "Fund Escrow"
3. Wallet prompts to approve token transfer
4. Transaction sent to EscrowContract
5. Wait for confirmation (~30-60 seconds on testnet)
6. UI shows checkmark ✓ next to "Escrow Funding"
```

**CRITICAL:** When SECOND user funds escrow, Phase 3 auto-triggers!

#### Phase 3: Atomic Swap Execution (AUTO)
```bash
# What happens automatically:
1. EscrowContract executes atomic swap
2. Starknet contract transfers BTC account to partyA
3. Starknet contract transfers STRK account to partyB
4. Both transfers atomic - either both succeed or both fail
5. UI shows final status: "Completed ✓" or "Failed"
```

---

## 🧪 Testing Checklist

### Unit Testing
```bash
# Run existing tests
npm test

# Test matching algorithm specifically
npm test -- otcMatchingService
```

### Integration Testing

**Test Scenario 1: Happy Path (Success)**
```
Step 1: User A submits BTC->STRK intent
Step 2: User B submits STRK->BTC intent (within 5%)
Step 3: Both match
Step 4: Both sign (2 signatures)
Step 5: Both fund escrow
Step 6: Verify atomic swap executed
Expected: Both users receive correct amounts
```

**Test Scenario 2: Tolerance Rejection**
```
Step 1: User A wants 1 BTC
Step 2: User B offers 0.90 BTC (10% difference - OUTSIDE 5% tolerance)
Expected: NO MATCH, intents stay pending
```

**Test Scenario 3: Multiple Candidates**
```
Step 1: User A wants 1 BTC -> 0.03 STRK
Step 2: User B wants 0.025 STRK -> 0.98 BTC (2% gap - score: 2%)
Step 3: User C wants 0.025 STRK -> 0.95 BTC (5% gap - score: 5%)
Expected: User A matches with B (lowest score), C stays pending
Check logs: [OTC-Match] Closest peer selected within tolerance: { score: 2 }
```

**Test Scenario 4: Error Handling**
```
Simulate errors:
- User rejects wallet signature → Should show error, stay on signing phase
- Escrow transaction fails → Should retry or show error
- One party offline → Should timeout and allow recovery
```

### Manual Testing (Using UI)

**Quick Test Walk-through:**
```
1. Start server: npm run dev
2. Open http://localhost:3000
3. Login with test wallet (Argent X for STRK)
4. Go to OTC section
5. Create swap intent:
   - Send: 0.1 BTC
   - Receive: 0.003 STRK
6. Open incognito window
7. Login with different wallet
8. Create matching intent:
   - Send: 0.003 STRK
   - Receive: 0.1 BTC (or 0.09-0.105 for tolerance test)
9. First window should show "Match Found"
10. Click buttons through all 3 phases
11. Verify final amounts received
```

### Network & Contract Testing

**Check Smart Contract Interaction:**
```bash
# View contract addresses (in code):
EscrowContract:    0x06cd7225fbf6ffc2c0ad8261a076214e2d8b52f87c312485c46033048c80cf9c
BuyStrkContract:   0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b
SellStrkContract:  0x0282fc99f24ec08d9ad5d23f36871292b91e7f9b75c1a56e08604549d9402325

# Verify transaction on Starknet Sepolia:
# Go to: https://sepolia.starkscan.co/
# Paste transaction hash
# Should see token transfers and contract calls
```

---

## 🔍 Debugging / Monitoring

### Check Matching Logs
```javascript
// In otcMatchingService.ts logs, you'll see:
[OTC-Match] Closest peer selected within tolerance: { 
  intentId: "1234", 
  matchIntentId: "5678", 
  score: 0.025,
  sendGap: 0.02,
  receiveGap: 0.03
}
```

### Monitor Escrow Funding
```javascript
// In app/api/otc/escrow/fund/route.ts
// When both parties funded, you'll see:
"Both parties funded, triggering atomic swap..."
swapInProgress: true  // Indicates execution started
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Intents won't match** | Gap > 5% | Adjust amounts to be within 5% tolerance |
| **Stuck on signing phase** | Wallet rejected signature | Check wallet for pending approval |
| **Escrow funding fails** | Insufficient balance | Ensure both parties have enough tokens |
| **Swap never executes** | Only one party funded | Need BOTH parties to complete Phase 2 |
| **"No best match found"** | No qualified peers in tolerance band | Create a new intent with adjusted amounts |

---

## 📊 Code Files Summary

| File | Purpose | Key Changes |
|------|---------|-------------|
| `lib/server/otcMatchingService.ts` | Core matching engine | ✅ Added best-fit selection algorithm with scoring |
| `components/swap-matching-interface-new.tsx` | Swap UI component | ✅ Fixed error handling in escrow funding |
| `app/api/otc/intents/route.ts` | Intent submission endpoint | Auto-triggers swap when both sign |
| `app/api/otc/escrow/fund/route.ts` | Escrow funding endpoint | Auto-triggers atomic swap when both fund |
| `lib/server/otcEscrowService.ts` | Smart contract execution | Executes atomic swap on Starknet |

---

## 🎓 Key Concepts to Remember

1. **Tolerance Band (5%):** Matching allows ±5% difference on amounts
2. **Best-Fit Selection:** Among all qualified peers, picks closest match by score
3. **Automatic Execution:** No manual trigger needed once both parties fund escrow
4. **Atomic Swap:** Either both parties get their assets OR both get original assets back
5. **3 Signatures total:** 
   - Phase 1: MATCH signature (per user)
   - Phase 2: Wallet transfer approval (per user during funding)
   - Total: 2 signatures per user = 4 total in swap

---

## 📞 Quick Reference Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Check git status
git status

# View recent commits
git log --oneline -10

# Push changes
git push
```

---

## ✅ Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Fuzzy Matching (5% tolerance) | ✅ Complete | Tested and working |
| Best-fit selection | ✅ Complete | Selects closest match by score |
| Bug fix: Error handling | ✅ Complete | Escrow funding properly catches errors |
| 3-Phase flow UI | ✅ Complete | Signing → Escrow → Auto-Swap |
| Auto-trigger execution | ✅ Complete | Fires when both parties fund |
| Wallet integration | ✅ Complete | Starknet + Bitcoin support |
| Smart contract execution | ✅ Complete | Real Starknet Sepolia contracts |

---

## 🚀 Next Steps / Future Work

- [ ] Add retry logic for failed escrow funding
- [ ] Implement timeout for pending intents (e.g., 1 hour auto-cancel)
- [ ] Add transaction history/settlement tracking
- [ ] Performance optimization for high-volume matching
- [ ] Alternative matching algorithms (price-weighted, time-weighted)

---

**Last Updated:** March 31, 2026  
**Status:** Ready for Testing & Deployment
