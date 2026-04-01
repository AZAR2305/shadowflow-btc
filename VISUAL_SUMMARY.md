# 📊 Visual Summary: What's Wrong and How to Fix It

## Current State

```
Your Swap Request:
┌─────────────────────────────────────────┐
│  User wants: 0.0001 BTC → 197 STRK      │
└─────────────────────────────────────────┘
         ↓
    ✓ Allowlist check passed
    ✓ ZK proof generated 
    ✓ Escrow created
    ✓ Escrow locked with proof
         ↓
    ✗ BRIDGE EXECUTION FAILED ❌
    
    Reason: [Bridge] Insufficient liquidity: 
            BTC rate=1000, STRK reserves=0
         ↓
    Fix: Add STRK to liquidity pool!
```

---

## Problem 1: Liquidity Pool Empty

```
┌─────────────────────────────────┐
│   STARKNET LIQUIDITY POOL       │
│                                 │
│  BTC reserves:  ✓ 1 BTC         │
│  STRK reserves: ✗ 0 STRK ← EMPTY!
│                                 │
│  When user buys STRK:           │
│  - Needs to withdraw from pool  │
│  - Pool can't provide it! ✗    │
└─────────────────────────────────┘

FIX: Add STRK to the pool ⬇️
```

### **Solution: Run This**
```powershell
pwsh ./add-liquidity.ps1 -Amount 100000000000000000000 -Chain strk
```

### **Result:**
```
┌─────────────────────────────────┐
│   STARKNET LIQUIDITY POOL       │
│                                 │
│  BTC reserves:   ✓ 1 BTC        │
│  STRK reserves:  ✓ 100 STRK ← FUNDED!
│                                 │
│  User can now withdraw STRK ✓   │
└─────────────────────────────────┘
```

---

## Problem 2: Wallet Not Open for Signing

```
EXECUTION FLOW:

Step 1: Frontend validation         ✓
Step 2: Generate ZK proof           ✓ (server-side)
Step 3: Verify proof on-chain       ✓ (contract)
Step 4: Create escrow               ✓ (contract)
Step 5: Lock escrow with proof      ✓ (contract)
         ↓
Step 6: Request wallet signature    ✗ WALLET NEEDED!
         ↓
    "Please approve in Xverse/Argent"
         ↓
Step 7: Execute bridge swap         ⏸️ (waiting for signature)
Step 8: Transfer tokens             ⏸️ (waiting)
Step 9: Return transaction hash     ⏸️ (waiting)

WITHOUT WALLET OPEN:
❌ Message never appears
❌ User never signs
❌ Swap never completes
```

### **Solution: Install Wallet**

```
┌──────────────────────────────────┐
│  Browser Toolbar                 │
├──────────────────────────────────┤
│  [Address Bar]        [Wallet 🔐] ← CLICK THIS
└──────────────────────────────────┘
                ↓
         Argent X Opens
                ↓
        Shows your address
                ↓
     Ready for signing ✓
```

---

## Complete Success Flow

```
TIMELINE:

T+0s:   User clicks "Submit Intent"
        ↓
T+1s:   Frontend sends to backend
        ↓
T+2-5s: Backend executes Steps 1-5
        - Validates
        - Generates proof
        - Locks escrow
        ↓
T+6s:   REQUEST: "Approve signature in wallet?"
        ↓
        [Wallet Window Opens]
        ┌────────────────────────────┐
        │ Sign this message?          │
        │ Domain: ShadowFlow OTC      │
        │                            │
        │ [❌ Deny]  [✅ Approve]    │
        └────────────────────────────┘
        ↓
T+7s:   User clicks ✅ APPROVE
        ↓
T+8-15s: Backend executes Step 6-7
        - Uses signature to authorize
        - Calls bridge contract
        - Transfers tokens
        ↓
T+16s:  Backend returns:
        ✓ Transaction Hash
        ✓ Intent ID
        ✓ Status: Completed
        ↓
T+17s:  Frontend displays:
        ✓ Success message
        ✓ Explorer link
        ↓
T+18s:  User clicks explorer link
        ↓
        [Opens Starkscan in new tab]
        Shows: Transaction confirmed ✓
```

---

## Error Messages Explained

### **Error: "Insufficient liquidity"**
```
Message:
  Insufficient liquidity: 
  BTC rate=1000, STRK reserves=0

Means:
  The pool has 0 STRK
  You're asking for ~197 STRK
  Pool can't fulfill it

Fix:
  pwsh ./add-liquidity.ps1 -Amount 100000000000000000000 -Chain strk
```

### **Error: "Wallet not found"**
```
Message:
  Starknet wallet not found

Means:
  Argent X or Braavos not installed
  OR not opened in browser

Fix:
  Install from:
  - https://www.argent.xyz/download
  - https://www.braavos.app
  Click the icon to open it
```

### **Error: "User rejected signature"**
```
Message:
  User rejected the signature request

Means:
  Wallet showed signing prompt
  User clicked ❌ DENY

Fix:
  Try again - click ✅ APPROVE next time
```

---

## Quick Checklist

### **Before Submitting Swap:**

- [ ] STRK liquidity added?
  - [ ] Run: `pwsh ./add-liquidity.ps1 -Amount 100000000000000000000 -Chain strk`
  - [ ] See "✓ Liquidity added successfully"

- [ ] Wallet installed?
  - [ ] Download Argent X or Braavos
  - [ ] See wallet icon in toolbar

- [ ] Wallet account created?
  - [ ] Click wallet icon
  - [ ] See your Starknet address
  - [ ] Network shows "Starknet Sepolia"

- [ ] Wallet OPEN?
  - [ ] Click wallet icon
  - [ ] Leave window open while submitting swap

### **Submitting Swap:**

- [ ] Form filled correctly?
  - [ ] Direction: Buy
  - [ ] Send: 0.0001 BTC
  - [ ] Receive: ~197 STRK
  - [ ] Receive Wallet: Your Starknet address from wallet

- [ ] Signature approved?
  - [ ] Wallet shows "Approve signature?"
  - [ ] Click ✅ APPROVE button

### **After Submission:**

- [ ] Transaction hash displayed?
  - [ ] See: `0x123456...`
  - [ ] Status: ✓ Completed

- [ ] Verified on-chain?
  - [ ] Click explorer link
  - [ ] Starkscan shows: "Confirmed"

---

## Amount Reference

| You Want | Command |
|----------|---------|
| 100 STRK | `pwsh ./add-liquidity.ps1 -Amount 100000000000000000000 -Chain strk` |
| 200 STRK | `pwsh ./add-liquidity.ps1 -Amount 200000000000000000000 -Chain strk` |
| 500 STRK | `pwsh ./add-liquidity.ps1 -Amount 500000000000000000000 -Chain strk` |
| 1000 STRK | `pwsh ./add-liquidity.ps1 -Amount 1000000000000000000000 -Chain strk` |

Math: `Amount = STRK_tokens * (10^18)`

---

## Recovery if Things Break

### **"I submitted but nothing happened"**
1. Wait 10 seconds (blockchain is slow)
2. Refresh page (Ctrl+R)
3. Check browser console (Ctrl+Shift+J) for errors
4. Retry

### **"Wallet lost connection"**
1. Click wallet icon in toolbar
2. Wallet might show "Reconnect?"
3. Click it to reconnect
4. Retry swap

### **"I don't see the signature prompt"**
1. Open wallet (click icon in toolbar)
2. Make sure it's not minimized
3. Retry the swap
4. Watch for the signing popup

### **"Transaction hash shows but nothing on explorer"**
1. Wait 30 seconds (blockchain confirms slowly)
2. Refresh Starkscan page
3. It should appear soon

---

## Visual: Liquidity Pool Effect

### **BEFORE - Empty Pool:**
```
User's Swap Request:
0.0001 BTC → 197 STRK

Liquidity Pool:
STRK: [EMPTY]

Result: ✗ BLOCKED
Error: "Insufficient liquidity"
```

### **AFTER - Funded Pool:**
```
User's Swap Request:
0.0001 BTC → 197 STRK

Liquidity Pool:
STRK: [████████████] 100 STRK
Available: 100 - 197 = -97?
Wait... needs 197 more!

Result: Still ✗ BLOCKED
Solution: Add more!
```

### **AFTER - Sufficient Pool:**
```
User's Swap Request:
0.0001 BTC → 197 STRK

Liquidity Pool:
STRK: [██████████████████] 500 STRK
Available: 500 - 197 = 303 ✓

Result: ✓ SUCCESS
Bridge executes swap!
```

---

## Success = This Appears

```
┌──────────────────────────────────────────┐
│         ✓ EXECUTION RESULT               │
├──────────────────────────────────────────┤
│ Status: ✓ Completed                      │
│ Step: execute                            │
│                                          │
│ Intent ID:                               │
│ intent-abc123xyz                         │
│                                          │
│ Transaction Hash:                        │
│ 0x1234567890abcdef...                    │
│ [📋 Copy] [🔗 View on Starkscan]        │
│                                          │
│ Wallet Signature: ✓ Verified             │
│                                          │
│ Message:                                 │
│ "Intent executed with wallet signature"  │
│                                          │
│ Your tokens are being transferred...     │
└──────────────────────────────────────────┘
```

---

## **YOU ARE HERE:**

```
🔴 PROBLEM: Swap failed (no liquidity)
         ↓
🟡 ACTION: Add STRK to pool
         ↓
🟢 RESULT: Swap works!
         ↓
🔵 NEXT: Set up wallet for signing
         ↓
✅ COMPLETE: Full end-to-end swap working
```

**Next Step:** Run the command below right now 👇

```powershell
pwsh ./add-liquidity.ps1 -Amount 100000000000000000000 -Chain strk
```

Done! ✓
