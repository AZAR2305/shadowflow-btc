# 🚀 Quick Start: Fix It Now!

## Right Now: Add STRK Liquidity (2 minutes)

### **Run This Command in PowerShell:**

```powershell
# Navigate to project (if not already there)
cd C:\Users\thame\shadowflow-BTC\shadowflow-btc

# Add 100 STRK to bridge pool
pwsh ./add-liquidity.ps1 -Amount 100000000000000000000 -Chain strk
```

### **You'll see:**
```
✓ Adding 100 STRK to liquidity pool...
✓ Liquidity added successfully
Transaction Hash: 0x1234567890abcdef...
```

---

## Next: Setup Wallet for Signing (5 minutes)

### **Pick ONE Option:**

#### **Option A: Argent X** (Most Popular)
1. Go to: https://www.argent.xyz/download
2. Click blue "Download" button
3. Select your browser (Chrome/Brave)
4. Click "Add to Chrome"
5. Accept permissions
6. Click Argent X icon in toolbar
7. Click "Create Account"
8. Select **Starknet Sepolia** (important!)
9. Set password
10. Save backup phrase (save it!)
11. ✓ Account created!

#### **Option B: Braavos**
1. Go to: https://www.braavos.app
2. Click "Get Started" button
3. Select your browser
4. Click "Add to Chrome"
5. Accept permissions
6. Click Braavos icon in toolbar
7. Click "Create Account"
8. Select **Starknet Sepolia** (important!)
9. Set password
10. Save backup phrase (save it!)
11. ✓ Account created!

### **After Wallet Creation:**
- Right-click wallet icon in toolbar
- Click "Pin to toolbar" (makes it easy to find)
- Click wallet icon to open it
- You'll see your Starknet address
- ✓ Ready for signing!

---

## Finally: Test Your Swap (1 minute)

### **Step 1: Go to OTC Intent Page**
Open your app and go to: **http://localhost:3000/otc-intent**

### **Step 2: Fill the Form**
- Direction: **Buy**
- Amount Send: **0.0001** BTC
- Amount Receive: **~197** STRK (auto-fills)
- Wallet Address: Your BTC testnet address (or paste it)
- Receive Wallet: Your **Starknet address** from wallet (click wallet icon to see)

### **Step 3: Submit**
- Click "Submit Intent" button
- Wallet will ask: "Approve this message?" 
- In wallet, click ✓ **APPROVE** (blue button)

### **Step 4: See Result**
- You get transaction hash: `0x123...`
- Status shows: ✓ **Completed**
- Click 🔗 explorer link to verify on-chain

---

## Troubleshooting Quick Answers

| Problem | Fix |
|---------|-----|
| "Insufficient liquidity" | Run: `pwsh ./add-liquidity.ps1 -Amount 100000000000000000000 -Chain strk` |
| "Wallet not found" | Install Argent X or Braavos |
| "Signature request not appearing" | Click wallet icon in toolbar to open it |
| "Wallet says I'm on mainnet" | Change to "Starknet Sepolia" in wallet settings |
| "Swap timed out" | Wait 2 minutes and retry |

---

## Copy-Paste Commands

Use these if PowerShell copy-paste isn't working:

```powershell
# Add 100 STRK
pwsh ./add-liquidity.ps1 -Amount 100000000000000000000 -Chain strk

# Add 500 STRK (more for testing)
pwsh ./add-liquidity.ps1 -Amount 500000000000000000000 -Chain strk

# Add 1000 STRK (lots of liquidity)
pwsh ./add-liquidity.ps1 -Amount 1000000000000000000000 -Chain strk
```

---

## How Much STRK Do I Need?

- **Testing 1 swap**: 100-200 STRK
- **Testing 5 swaps**: 500 STRK
- **Production**: Depends on volume

You can always add more later!

---

## Running Next Test

**After everything is set up:**

1. Make sure wallet is **OPEN** (click icon in toolbar)
2. Go to `/otc-intent` page
3. Submit intent with:
   - Amount: 0.0001 BTC
   - Receive: ~197 STRK
   - Your Starknet address from wallet
4. Click "Submit Intent"
5. **Approve in wallet** when prompted
6. See transaction hash displayed
7. Click explorer link to verify

---

## What's Happening Behind the Scenes

```
Your Form Submit
  ↓
Backend validates + generates ZK proof
  ↓
Backend locks escrow
  ↓
"Please sign this message" appears in wallet
  ↓
You click ✓ APPROVE in wallet
  ↓
Backend executes bridge swap using:
  - ZK proof (you're authorized)
  - Wallet signature (you authorized it)
  ↓
Bridge transfers:
  - Your BTC → Counterparty BTC wallet
  - Pool STRK → Your Starknet address
  ↓
Transaction hash returned
  ↓
"✓ Swap complete!" displayed
```

---

## Success = You See This

```
Your Intent Result:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: ✓ Completed
Intent ID: intent-abc123
Transaction Hash: 0x1234567890...
Wallet Signature Verified: ✓

[📋 Copy] [🔗 View on Explorer]
```

---

## Next Questions?

- **More liquidity needed?** Run add-liquidity.ps1 again
- **Different amount?** Change the `-Amount` parameter
- **Need test STRK?** Ask wallet for faucet funds
- **Wallet broke?** Uninstall and reinstall the wallet extension

**You're good to go!** 🚀
