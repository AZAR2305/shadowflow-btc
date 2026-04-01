# 🔧 Fix: Bridge Liquidity & Wallet Signing Setup

## Problem Summary

You're seeing two issues:

1. ❌ **Bridge execution failed** - "Insufficient STRK liquidity" (STRK reserves=0)
2. ❌ **Wallet not opened** - Xverse wallet needs to be open for ZK signing

---

## Solution 1: Add STRK Liquidity to Bridge 🚀

### **Step 1: Open PowerShell in Project Root**

```powershell
cd C:\Users\thame\shadowflow-BTC\shadowflow-btc
```

### **Step 2: Add STRK Liquidity**

Add 100 STRK to the liquidity pool:

```powershell
pwsh ./add-liquidity.ps1 -Amount 100000000000000000000 -Chain strk
```

**What does this do?**
- `100000000000000000000` = 100 STRK (STRK has 18 decimals)
- Calculates: `100 * 10^18 = 100000000000000000000` base units
- Deposits it into the liquidity pool contract
- Returns transaction hash showing confirmation

**Expected output:**
```
✓ Liquidity added successfully
Transaction Hash: 0x1234567890...
Amount: 100 STRK
Chain: Starknet Sepolia
```

### **Step 3: Verify Liquidity Was Added**

```powershell
# You should see the liquidity pool balance increased
# If you need to check, you can query the pool directly
```

### **Step 4: Retry Your Swap**

After liquidity is added:
1. Go back to /otc-intent page
2. Submit the same intent again
3. It should now execute successfully (if wallet is connected for signing)

---

## Solution 2: Setup Starknet Wallet for ZK Signing 📱

The ZK proof signing requires a **Starknet wallet** to be open in your browser.

### **Option A: Argent X (Recommended)**

#### **1. Install Argent X**
- **Desktop Chrome/Brave**: [argent.xyz/download](https://www.argent.xyz/download)
- Click "Download" → Add to browser → Pin to toolbar

#### **2. Create Starknet Account**
- Click Argent X icon in toolbar
- Click "Create Account"
- Select **Starknet Sepolia** (testnet)
- Set password & backup phrase
- ✓ Account created on Starknet Sepolia

#### **3. Keep It Pinned & Open**
- Right-click Argent X icon → "Pin to toolbar"
- Click it to open before any swaps
- Leave it open during swap execution

#### **4. Get Test STRK (Optional)**
- In Argent X: Go to "Receive" 
- Copy your address
- Use [faucet.argent.xyz](https://faucet.argent.xyz) to get test STRK
- Takes ~30 seconds to appear

---

### **Option B: Braavos**

#### **1. Install Braavos**
- **Desktop Chrome/Brave**: [braavos.app](https://www.braavos.app)
- Click "Get Started" → Add to browser → Pin to toolbar

#### **2. Create Starknet Account**
- Click Braavos icon in toolbar
- Click "Create Account"
- Select **Starknet Sepolia**
- Set password & backup phrase
- ✓ Account created on Starknet Sepolia

#### **3. Keep It Pinned & Open**
- Right-click Braavos icon → "Pin to toolbar"
- Click it to open before any swaps
- Leave it open during swap execution

#### **4. Get Test STRK**
- In Braavos: Go to "Settings" → "Network"
- Verify it's on "Starknet Sepolia"
- Request faucets funds

---

## How the Wallet Signing Works

### **The Complete Flow**

When you submit an intent:

```
1. User fills form & clicks "Submit Intent"
   ↓
2. Frontend validates form
   ↓
3. Frontend checks: "Is Starknet wallet connected?"
   - If NO → Shows error "Connect wallet first"
   - If YES → Continues
   ↓
4. Backend Step 1: Validate allowlist ✓
5. Backend Step 2: Generate ZK proof ✓
6. Backend Step 3: Verify ZK proof on-chain ✓
7. Backend Step 4: Create escrow deposit ✓
8. Backend Step 5: Lock escrow with proof ✓
   ↓
9. NOW: Request wallet signature
   - Wallet shows: "Sign this message?"
   - User clicks ✓ "Approve" in wallet
   ↓
10. Backend Step 6: Execute bridge swap
   - Uses signature to authorize
   - Needs both:
     a) ZK proof verification ✓
     b) Wallet signature ✓
   ↓
11. Bridge transfers tokens
    - BTC: From sender → Receiver on Bitcoin
    - STRK: From pool → Receiver on Starknet
   ↓
12. Return transaction hash to frontend
13. Display to user: "✓ Swap complete!"
```

---

## Troubleshooting Checklist

### ❌ "Insufficient liquidity" error
- [ ] Check STRK pool balance: `./add-liquidity.ps1` should have run
- [ ] Add more STRK: `pwsh ./add-liquidity.ps1 -Amount 500000000000000000000 -Chain strk` (500 STRK)
- [ ] Retry swap

### ❌ "Wallet not found" error
- [ ] Install Argent X or Braavos
- [ ] Refresh the page (Ctrl+Shift+R)
- [ ] Check wallet is pinned to toolbar
- [ ] Click the wallet icon to open it
- [ ] Ensure you're on Starknet Sepolia network

### ❌ "User rejected signature" error
- [ ] User clicked ✗ "Deny" in wallet
- [ ] Tell user to click ✓ "Approve" next time
- [ ] Retry the swap

### ❌ "Wallet connection failed" error
- [ ] Check wallet has an account created
- [ ] Verify account is on Starknet Sepolia (not mainnet)
- [ ] Try disconnecting and reconnecting wallet
- [ ] Clear browser cache & refresh page

### ❌ "Transaction timed out" error
- [ ] Network is slow (Starknet testnet can be slow)
- [ ] Wait 2-3 minutes for previous tx to confirm
- [ ] Retry the swap
- [ ] Check Starkscan: https://sepolia.starkscan.co/

---

## Quick Command Reference

```powershell
# Add 100 STRK
pwsh ./add-liquidity.ps1 -Amount 100000000000000000000 -Chain strk

# Add 500 STRK
pwsh ./add-liquidity.ps1 -Amount 500000000000000000000 -Chain strk

# Add 1000 STRK
pwsh ./add-liquidity.ps1 -Amount 1000000000000000000000 -Chain strk

# Check amount (1 STRK = 10^18 base units)
# Amount = STRK_tokens * (10^18)
```

---

## Verification Steps

### **After adding liquidity:**
1. Go to `/otc-intent` page
2. Select "BTC → STRK" swap
3. Try submitting small amount (0.0001 BTC)
4. Should NOT see "Insufficient liquidity" error

### **After setting up wallet:**
1. Open Argent X/Braavos in toolbar
2. Your address shows in the wallet icon
3. Go to `/otc-intent` page
4. Submit intent
5. Wallet notification appears: "Approve signature?"
6. Click ✓ "Approve"
7. Swap executes

---

## Current Pool Status

**Before liquidity addition:**
- BTC reserves: ✓ (has some)
- STRK reserves: ❌ 0 (EMPTY!)

**After your liquidity commands:**
- BTC reserves: ✓ (unchanged)
- STRK reserves: ✓ 100+ (FUNDED!)

---

## Next Actions

### **Immediate (5 minutes):**
```powershell
# 1. Add STRK liquidity
pwsh ./add-liquidity.ps1 -Amount 100000000000000000000 -Chain strk

# 2. Install wallet
# Go to: https://www.argent.xyz/download
# Or: https://www.braavos.app
# Pin to toolbar
```

### **Setup Wallet (2 minutes):**
- Open wallet icon in toolbar
- Click "Create Account"
- Select Starknet Sepolia
- Set password

### **Test Swap (1 minute):**
- Go to `/otc-intent`
- Fill form (0.0001 BTC → ~197 STRK)
- Click "Submit Intent"
- Approve signature in wallet
- ✓ Swap complete!

---

## FAQ

**Q: Do I need to restart the server after adding liquidity?**  
A: No! The liquidity is queried live from the contract.

**Q: Can I use multiple wallets?**  
A: Yes, but each needs to be set up separately. Switch in wallet UI.

**Q: What if the signature request doesn't appear?**  
A: The wallet might not be connected. Open it, ensure you're on Sepolia, then retry.

**Q: How much STRK do I need?**  
A: Depends on swap volume. Start with 100-500 STRK, add more if needed.

**Q: Can users swap with 0 STRK in pool?**  
A: No, it will fail with "Insufficient liquidity" until you add STRK.

---

## Support URLs

- **Argent X**: https://www.argent.xyz
- **Braavos**: https://www.braavos.app
- **Starknet Docs**: https://docs.starknet.io
- **Sepolia Testnet**: https://sepolia.starkscan.co
- **Pyth Oracle**: https://pyth.network

---

## Success Indicators

✓ **Liquidity added** when:
- PowerShell shows transaction hash
- No "Insufficient liquidity" errors

✓ **Wallet ready** when:
- Wallet icon shows your address in toolbar
- You can see account balance in wallet

✓ **Swap working** when:
- Submit intent → Wallet signature prompt appears
- You click "Approve" → Transaction hash returned
- Hash shows on transaction display with "✓ Completed"
