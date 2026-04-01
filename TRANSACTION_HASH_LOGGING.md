# Complete Transaction Hash Logging

## Overview
All on-chain transactions now display REAL transaction hashes with Starknet Sepolia explorer links in both console and terminal.

## Transaction Types & Logging Locations

### 1. ZK Proof Registration
**Location**: `lib/server/garagaOnChainVerifier.ts` → `registerProofOnChain()`

**When**: During intent validation step when ZK proof is registered on-chain

**Console Output**:
```
✅ Proof registered on-chain: { txHash: 0x... }
🔍 View Proof Registration: https://sepolia.starkscan.co/tx/0x...
📋 Full TX Hash: 0x...
```

**API Response**: Included in validation step response

---

### 2. Escrow Deposit (Per Party)
**Location**: `lib/server/otcEscrowService.ts` → `createEscrowDeposit()`

**When**: When each party (buyer/seller) funds the escrow individually

**Console Output**:
```
[Escrow Deposit] 🔓 Approving STRK token...
  Approval TX Hash: 0x...
  🔍 View on Explorer: https://sepolia.starkscan.co/tx/0x...
  ✅ STRK approval confirmed

✅ [Escrow Deposit] Deposit created on-chain!
  TX Hash: 0x...
  🔍 View on Explorer: https://sepolia.starkscan.co/tx/0x...
  📋 Full TX Hash: 0x...
```

**API Response**: `POST /api/otc/escrow/fund`
```json
{
  "escrowDepositTxHash": "0x...",
  "escrowDepositExplorerUrl": "https://sepolia.starkscan.co/tx/0x...",
  "fundingTxHash": "0x...",
  "fundingExplorerUrl": "https://sepolia.starkscan.co/tx/0x..."
}
```

---

### 3. Atomic Swap Execution (After Both Parties Fund)
**Location**: `lib/server/otcEscrowService.ts` → `executeAtomicSwap()`

**When**: Automatically triggered when both parties have funded escrow

#### Step 1: BuySTRK Bridge (BTC → STRK)
**Console Output**:
```
[Step 1] 🌉 Bridging BTC to STRK via BuyStrkContract...
  TX Hash: 0x...
  🔍 View on Explorer: https://sepolia.starkscan.co/tx/0x...
  ✅ BTC→STRK bridge executed on-chain
  📋 Full TX Hash: 0x...
```

#### Step 2: SellSTRK Bridge (STRK → BTC)
**Console Output**:
```
[Step 2] 🌉 Bridging STRK to BTC via SellStrkContract...
  TX Hash: 0x...
  🔍 View on Explorer: https://sepolia.starkscan.co/tx/0x...
  ✅ STRK→BTC bridge executed on-chain
  📋 Full TX Hash: 0x...
```

#### Transaction Summary
**Console Output**:
```
═══════════════════════════════════════════════════════════════════
✅ ATOMIC SWAP COMPLETED SUCCESSFULLY
═══════════════════════════════════════════════════════════════════
Total execution time: X.XXs
All transactions confirmed on Starknet Sepolia

📋 TRANSACTION SUMMARY:
──────────────────────────────────────────────────────────────────

[Step 1] Buy STRK: Convert X BTC to STRK
  TX Hash: 0x...
  🔍 Explorer: https://sepolia.starkscan.co/tx/0x...

[Step 2] Sell STRK: Convert X STRK to BTC
  TX Hash: 0x...
  🔍 Explorer: https://sepolia.starkscan.co/tx/0x...

═══════════════════════════════════════════════════════════════════
```

**API Response**: `POST /api/otc/intents?step=execute`
```json
{
  "transactionHash": "0x...",
  "explorerUrl": "https://sepolia.starkscan.co/tx/0x...",
  "steps": [
    {
      "step": 1,
      "description": "Buy STRK: Convert X BTC to STRK",
      "status": "completed",
      "txHash": "0x...",
      "explorerUrl": "https://sepolia.starkscan.co/tx/0x..."
    },
    {
      "step": 2,
      "description": "Sell STRK: Convert X STRK to BTC",
      "status": "completed",
      "txHash": "0x...",
      "explorerUrl": "https://sepolia.starkscan.co/tx/0x..."
    }
  ]
}
```

---

## Complete Flow Example

### Buyer's Journey (BTC → STRK)
1. **Validate Intent**: ZK proof registered
   - Console: `🔍 View Proof Registration: https://sepolia.starkscan.co/tx/0x...`
   
2. **Sign Intent**: User signs with Bitcoin wallet
   
3. **Fund Escrow**: Create escrow deposit
   - Console: `🔍 View on Explorer: https://sepolia.starkscan.co/tx/0x...` (approval)
   - Console: `🔍 View on Explorer: https://sepolia.starkscan.co/tx/0x...` (deposit)
   - API: Returns `escrowDepositTxHash` and `escrowDepositExplorerUrl`

4. **Wait for Seller**: Polling for match status

5. **Atomic Swap Executes**: When seller also funds
   - Console: BuySTRK bridge TX with explorer link
   - Console: SellSTRK bridge TX with explorer link
   - Console: Complete transaction summary
   - API: Returns all transaction hashes with explorer URLs

### Seller's Journey (STRK → BTC)
1. **Validate Intent**: ZK proof registered
   - Console: `🔍 View Proof Registration: https://sepolia.starkscan.co/tx/0x...`
   
2. **Sign Intent**: User signs with Starknet wallet
   
3. **Fund Escrow**: Create escrow deposit
   - Console: `🔍 View on Explorer: https://sepolia.starkscan.co/tx/0x...` (approval)
   - Console: `🔍 View on Explorer: https://sepolia.starkscan.co/tx/0x...` (deposit)
   - API: Returns `escrowDepositTxHash` and `escrowDepositExplorerUrl`

4. **Atomic Swap Executes**: Immediately (buyer already funded)
   - Console: BuySTRK bridge TX with explorer link
   - Console: SellSTRK bridge TX with explorer link
   - Console: Complete transaction summary
   - API: Returns all transaction hashes with explorer URLs

---

## Verification

All transaction hashes can be verified on Starknet Sepolia:
- **Explorer**: https://sepolia.starkscan.co/tx/{transaction_hash}
- **Format**: All TXs are real Starknet transaction hashes (0x...)
- **Confirmation**: Each TX waits for on-chain confirmation before proceeding

---

## Key Changes Made

1. **Added `createEscrowDeposit()` method** in `OtcEscrowService`
   - Creates individual escrow deposits when each party funds
   - Returns real transaction hash immediately
   - Logs approval TX and deposit TX with explorer links

2. **Updated `/api/otc/escrow/fund` endpoint**
   - Now calls `createEscrowDeposit()` for each party
   - Returns real transaction hashes in API response
   - Includes explorer URLs for easy verification

3. **Simplified `executeAtomicSwap()`**
   - Removed duplicate escrow deposit creation
   - Now only handles bridge swaps (BuySTRK and SellSTRK)
   - Escrow deposits already created in funding step

4. **Enhanced logging throughout**
   - All transactions show full TX hash
   - All transactions include explorer link
   - Summary at end shows all TXs with links

---

## Testing

To verify all transaction hashes are working:

1. Start two browser sessions (buyer and seller)
2. Buyer creates intent (BTC → STRK)
3. Check console for ZK proof registration TX
4. Buyer funds escrow
5. Check console for escrow deposit TX (approval + deposit)
6. Check API response for `escrowDepositTxHash` and explorer URL
7. Seller creates matching intent (STRK → BTC)
8. Check console for ZK proof registration TX
9. Seller funds escrow
10. Check console for escrow deposit TX (approval + deposit)
11. Atomic swap executes automatically
12. Check console for BuySTRK and SellSTRK bridge TXs
13. Check transaction summary with all explorer links
14. Verify all TXs on Starknet Sepolia explorer

All transaction hashes should be real, verifiable on-chain transactions!
