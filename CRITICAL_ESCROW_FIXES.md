# Critical Escrow & Atomic Swap Fixes

## Current Errors

### 1. Wallet Not in Allowlist (CRITICAL)
**Error:** `'wallet not in allowlist'`

**Root Cause:** The escrow contract has an allowlist check, and the executor wallet `0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e` is not whitelisted.

**Solutions:**

#### Option A: Add Executor to Allowlist (Recommended)
You need to call the escrow contract's admin function to add the executor wallet to the allowlist:

```cairo
// On the escrow contract, call:
add_to_allowlist(0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e)
```

#### Option B: Use User's Wallet for Escrow Deposit
Instead of using the executor account, have each user create their own escrow deposit directly from their wallet. This requires frontend changes.

#### Option C: Disable Allowlist Check (If you control the contract)
If you deployed the contract and can upgrade it, remove or disable the allowlist check.

### 2. BTC Address Deserialization Error
**Error:** `'Failed to deserialize param #2'`

**Root Cause:** The BuyStrkContract and SellStrkContract expect BTC addresses in a specific format. The ByteArray conversion may not match what the contract expects.

**Investigation Needed:**
Check the Cairo contract signature for `buy_strk_with_btc`:
- Does it expect `ByteArray`?
- Does it expect `felt252`?
- Does it expect an array of `felt252`?

## Immediate Action Required

### Step 1: Check Contract Allowlist
Run this command to check if the executor is in the allowlist:

```bash
# Using starkli or similar tool
starkli call \
  0x04ab814de65d6ce99bb8801b33fcd751ae21b28f1f4726363be93d12b99ecbf4 \
  is_in_allowlist \
  0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e \
  --rpc https://api.cartridge.gg/x/starknet/sepolia
```

### Step 2: Add to Allowlist (If you have admin access)
```bash
# Using the contract owner/admin account
starkli invoke \
  0x04ab814de65d6ce99bb8801b33fcd751ae21b28f1f4726363be93d12b99ecbf4 \
  add_to_allowlist \
  0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e \
  --rpc https://api.cartridge.gg/x/starknet/sepolia \
  --account <your-admin-account>
```

### Step 3: Check BuyStrkContract Interface
Look at the deployed contract or ABI to see the exact parameter types expected:

```bash
starkli class-at \
  0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b \
  --rpc https://api.cartridge.gg/x/starknet/sepolia
```

## Alternative: Skip Escrow for Testing

If you want to test the atomic swap without escrow, you can modify the code to skip the escrow deposit requirement:

```typescript
// In otcEscrowService.ts, modify createEscrowDeposit to always return success for testing
if (chain !== 'strk') {
  console.log(`⚠️ BTC escrow deposits are tracked off-chain. Returning placeholder.`);
  return {
    transactionHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
    escrowAddress: this.escrowContractAddress,
  };
}

// For STRK, also return placeholder during testing
console.log(`⚠️ TESTING MODE: Skipping actual escrow deposit`);
return {
  transactionHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
  escrowAddress: this.escrowContractAddress,
};
```

## Contract Interface Investigation

The BuyStrkContract expects specific parameter types. Based on the error, parameter #2 is failing deserialization. The current calldata shows:

```
["0x1",
 "0x76ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b",
 "0x40f85053a85cb8d7cfe4f9a0ddcbcf36790a651f3adb7f96349fb32c51e21a",
 "0x7",
 "0x1",
 "0x74623171677261386d78647837766c78643565787774397a72726d64797a36",
 "0x6b66357839326d6e633977",
 "0xb",
 "0x2710",
 "0x0",
 "0x38a91e6dba27538ece888b8c062ffb09beea490c36d8c777a4c6e3305a3909f"]
```

This suggests the ByteArray format is being used, but the contract might expect a simpler format.

## Recommended Next Steps

1. **Priority 1:** Add executor wallet to escrow contract allowlist
2. **Priority 2:** Verify BuyStrkContract and SellStrkContract parameter types
3. **Priority 3:** Test with correct parameter format

## Contact Contract Owner

If you don't have admin access to the escrow contract, you need to contact whoever deployed it to add your executor wallet to the allowlist.

Executor Wallet to Whitelist:
```
0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e
```

Escrow Contract:
```
0x04ab814de65d6ce99bb8801b33fcd751ae21b28f1f4726363be93d12b99ecbf4
```
