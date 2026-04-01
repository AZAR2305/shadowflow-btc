# Atomic Swap Execution Fixes

## Issues Fixed

### 1. BTC Address Serialization Error
**Problem:** 
- Error: "Failed to deserialize param #2" when calling `buy_strk_with_btc` and `sell_strk_for_btc`
- BTC addresses were being passed as raw strings, but Cairo contracts expect ByteArray format

**Solution:**
- Added `convertToByteArray()` helper method to convert BTC addresses to Cairo ByteArray format
- ByteArray format: `[data_len, ...data_chunks, pending_word, pending_word_len]`
- Splits string into 31-byte chunks (felt252 safe size)
- Updated both `buy_strk_with_btc` and `sell_strk_for_btc` contract calls to use ByteArray format

**Changes:**
```typescript
// Before (WRONG):
calldata: [
  btcSendersAddress,  // Raw string - causes deserialization error
  ...
]

// After (CORRECT):
const btcAddressCalldata = this.convertToByteArray(btcSendersAddress);
calldata: [
  ...btcAddressCalldata,  // Properly formatted ByteArray
  ...
]
```

### 2. Transaction Nonce Synchronization Error
**Problem:**
- Error: "Invalid transaction nonce. Expected: 165, got: 164"
- Multiple transactions sent in quick succession without waiting for nonce updates
- Occurred during escrow deposit creation (approve + deposit) and atomic swap execution

**Solution:**
- Added `waitForTransaction()` calls to ensure each transaction completes before the next
- Added 2-second delays after transaction confirmations to allow nonce propagation
- Applied to:
  - Escrow deposit: Between approve and deposit transactions
  - Atomic swap: Between buy_strk and sell_strk transactions

**Changes:**
```typescript
// Wait for approval confirmation
await this.rpcProvider.waitForTransaction(approveTx.transaction_hash);

// Small delay to ensure nonce is updated
await new Promise(resolve => setTimeout(resolve, 2000));

// Now safe to send next transaction
const depositTx = await this.account.execute([...]);
```

## Files Modified

1. **lib/server/otcEscrowService.ts**
   - Added `convertToByteArray()` helper method
   - Updated `executeAtomicSwapImpl()` to use ByteArray for BTC addresses
   - Added nonce synchronization delays in `createEscrowDeposit()`
   - Added nonce synchronization delays between atomic swap steps

## Testing

To verify the fixes:

1. **Test Escrow Funding:**
   - Both parties should be able to fund escrow without nonce errors
   - STRK deposits should complete with proper transaction hashes

2. **Test Atomic Swap Execution:**
   - BuyStrkContract should accept BTC address in ByteArray format
   - SellStrkContract should accept BTC address in ByteArray format
   - Both transactions should execute sequentially without nonce conflicts

## Expected Behavior

### Successful Escrow Funding:
```
[Escrow Deposit] 🔓 Approving STRK token...
  Approval TX Hash: 0x...
  ✅ STRK approval confirmed

[Escrow Deposit] 🔒 Creating deposit transaction...
✅ [Escrow Deposit] Deposit created on-chain!
  TX Hash: 0x...
```

### Successful Atomic Swap:
```
[Step 1] 🌉 Bridging BTC to STRK via BuyStrkContract...
  TX Hash: 0x...
  ✅ BTC→STRK bridge executed on-chain

[Step 2] 🌉 Bridging STRK to BTC via SellStrkContract...
  TX Hash: 0x...
  ✅ STRK→BTC bridge executed on-chain

✅ ATOMIC SWAP COMPLETED SUCCESSFULLY
```

## Notes

- The 2-second delays are conservative and can be adjusted based on network conditions
- ByteArray format is the standard way to pass strings to Cairo contracts
- Nonce management is critical for sequential transaction execution on Starknet
