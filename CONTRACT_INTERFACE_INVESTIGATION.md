# Contract Interface Investigation & Fixes

## Current Status: TWO CRITICAL BLOCKERS

Based on the terminal output, there are TWO separate issues preventing real on-chain execution:

### Issue 1: BTC Address Deserialization Error ❌
```
Failed to deserialize param #2
Contract: 0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b (BuyStrkContract)
```

**Current calldata being sent:**
```json
["0x1",
 "0x74623171677261386d78647837766c78643565787774397a72726d64797a36",
 "0x6b66357839326d6e633977",
 "0xb",
 "0x2710",
 "0x0",
 "0x38a91e6dba27538ece888b8c062ffb09beea490c36d8c777a4c6e3305a3909f"]
```

**Problem:** The BuyStrkContract is rejecting parameter #2 (the BTC address). The ByteArray format we're using doesn't match what the contract expects.

### Issue 2: Executor Wallet Not in Allowlist ❌
```
wallet not in allowlist
Contract: 0x04ab814de65d6ce99bb8801b33fcd751ae21b28f1f4726363be93d12b99ecbf4 (EscrowContract)
Executor: 0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e
```

**Problem:** The escrow contract has an allowlist check, and the executor wallet is not whitelisted.

---

## SOLUTION 1: Fix BTC Address Format

### Step 1: Inspect the BuyStrkContract ABI

You need to check the actual contract interface to see what format it expects for the BTC address parameter.

**Using starkli:**
```bash
starkli class-at \
  0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b \
  --rpc https://api.cartridge.gg/x/starknet/sepolia
```

**Look for the `buy_strk_with_btc` function signature:**
- Does it expect `ByteArray`?
- Does it expect `felt252`?
- Does it expect a simple string as `felt252`?
- Does it expect an array of `felt252`?

### Possible Formats:

#### Option A: Simple felt252 (most likely)
If the contract expects a simple `felt252`, convert the BTC address to hex:

```typescript
// Convert BTC address string to felt252
const btcAddressFelt = '0x' + Buffer.from(btcSendersAddress, 'utf8').toString('hex');

calldata: [
  btcAddressFelt,  // BTC address as single felt252
  BigInt(Math.floor(parseFloat(btcAmount) * 1e8)).toString(),
  '0',
  strkSellersAddress,
]
```

#### Option B: Cairo ByteArray (current approach - may need adjustment)
If it's ByteArray, the format might need to be different. Check if the contract uses Cairo 2.0 ByteArray:

```cairo
struct ByteArray {
    data: Array<bytes31>,
    pending_word: felt252,
    pending_word_len: usize,
}
```

#### Option C: Array of felt252
Some contracts split strings into multiple felt252 values:

```typescript
const btcAddressBytes = Buffer.from(btcSendersAddress, 'utf8');
const chunks = [];
for (let i = 0; i < btcAddressBytes.length; i += 31) {
  chunks.push('0x' + btcAddressBytes.slice(i, i + 31).toString('hex'));
}

calldata: [
  chunks.length.toString(),  // array length
  ...chunks,                 // array elements
  BigInt(Math.floor(parseFloat(btcAmount) * 1e8)).toString(),
  '0',
  strkSellersAddress,
]
```

### Step 2: Test with starkli

Once you know the correct format, test it directly with starkli:

```bash
# Example: If it expects felt252
starkli invoke \
  0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b \
  buy_strk_with_btc \
  0x746231717a63726d6c6138646d647267 \
  10000 \
  0 \
  0x38a91e6dba27538ece888b8c062ffb09beea490c36d8c777a4c6e3305a3909f \
  --rpc https://api.cartridge.gg/x/starknet/sepolia \
  --account <your-account>
```

---

## SOLUTION 2: Fix Allowlist Issue

### Option A: Add Executor to Allowlist (RECOMMENDED)

**You MUST have admin/owner access to the escrow contract to do this.**

```bash
# Check if there's an add_to_allowlist function
starkli class-at \
  0x04ab814de65d6ce99bb8801b33fcd751ae21b28f1f4726363be93d12b99ecbf4 \
  --rpc https://api.cartridge.gg/x/starknet/sepolia

# If the function exists, call it with the contract owner account
starkli invoke \
  0x04ab814de65d6ce99bb8801b33fcd751ae21b28f1f4726363be93d12b99ecbf4 \
  add_to_allowlist \
  0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e \
  --rpc https://api.cartridge.gg/x/starknet/sepolia \
  --account <contract-owner-account>
```

### Option B: Deploy New Escrow Contract Without Allowlist

If you don't have admin access or want to remove the allowlist restriction entirely:

1. **Modify the Cairo contract** to remove or disable the allowlist check
2. **Redeploy** the escrow contract
3. **Update** the contract address in `.env`:
   ```bash
   NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=<new-address>
   ESCROW_CONTRACT_ADDRESS=<new-address>
   ```

### Option C: Use User Wallets Instead of Executor

Instead of using a server-side executor account, have each user create their own escrow deposit directly from their wallet:

**Pros:**
- No allowlist issues
- Users maintain full control
- More decentralized

**Cons:**
- Requires frontend changes
- Users need to sign multiple transactions
- More complex UX

---

## IMMEDIATE ACTION PLAN

### Priority 1: Investigate BuyStrkContract Interface ⚡

Run this command to get the contract ABI:
```bash
starkli class-at 0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b --rpc https://api.cartridge.gg/x/starknet/sepolia > buystrk_abi.json
```

Look for the `buy_strk_with_btc` function and share the parameter types.

### Priority 2: Fix Allowlist Issue ⚡

**If you have admin access:**
```bash
starkli invoke \
  0x04ab814de65d6ce99bb8801b33fcd751ae21b28f1f4726363be93d12b99ecbf4 \
  add_to_allowlist \
  0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e \
  --rpc https://api.cartridge.gg/x/starknet/sepolia \
  --account <your-admin-account>
```

**If you DON'T have admin access:**
- Contact the contract owner
- OR deploy a new escrow contract without allowlist
- OR switch to user-wallet-based escrow deposits

### Priority 3: Remove Simulation Code

Once both issues are fixed, uncomment the real contract execution code in `lib/server/otcEscrowService.ts`:

1. Remove simulation code in `createEscrowDeposit()`
2. Remove simulation code in `executeAtomicSwapImpl()`
3. Uncomment actual `account.execute()` calls

---

## Testing Checklist

After fixes are applied:

- [ ] BuyStrkContract accepts BTC address parameter
- [ ] Executor wallet can call escrow contract
- [ ] Escrow deposits complete on-chain
- [ ] Atomic swap executes both buy_strk and sell_strk
- [ ] All transactions have real transaction hashes
- [ ] Transactions are visible on Starkscan explorer

---

## Contract Addresses Reference

```
Escrow:    0x04ab814de65d6ce99bb8801b33fcd751ae21b28f1f4726363be93d12b99ecbf4
BuyStrk:   0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b
SellStrk:  0x0282fc99f24ec08d9ad5d23f36871292b91e7f9b75c1a56e08604549d9402325
Executor:  0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e
STRK Token: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
```

---

## Next Steps

1. **Run the starkli commands above** to inspect contract interfaces
2. **Share the ABI output** so I can determine the correct parameter format
3. **Add executor to allowlist** OR deploy new contracts
4. **I will update the code** with the correct format once we know the contract interface
