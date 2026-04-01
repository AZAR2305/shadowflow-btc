# ShadowFlow Real Contract Execution Architecture

## Status: ✅ REAL EXECUTION IMPLEMENTED

As of this update, ShadowFlow now executes **REAL atomic swaps** via Starknet smart contracts. No more mock transactions!

## Real Transaction Flow

```
User A (BTC)                    User B (STRK)
      │                              │
      ├─ submitIntent()              │
      │  └─ [Intent stored in P2P engine]
      │                              │
      ├────── Both sign ─────────────┤
      │                              │
      └──────── MATCHING ────────────┘
              (P2P engine finds match)
                      │
        ┌─────────────▼─────────────┐
        │   REAL ATOMIC SWAP        │
        │  executeAtomicSwap()      │
        │                           │
        │  Step 1: APPROVE STRK     │
        │  ├─ STRK.approve()        │
        │  └─ TX sent to Starknet   │
        │                           │
        │  Step 2: LOCK FUNDS       │
        │  ├─ Escrow.lock_funds()   │
        │  └─ TX sent to Starknet   │
        │                           │
        │  Step 3: BUY STRK         │
        │  ├─ BuyStrk.buy_strk()    │
        │  └─ TX sent to Starknet   │✨ REAL
        │                           │
        │  Step 4: SELL STRK        │
        │  ├─ SellStrk.sell_strk()  │
        │  └─ TX sent to Starknet   │✨ REAL
        │                           │
        └─────────────┬─────────────┘
              Results confirmed on-chain
                      │
                ┌─────▼─────┐
                │ SETTLEMENT │
                │ Both users │
                │ receive    │
                │ funds✅    │
                └───────────┘
```

## Deployed Contracts (Starknet Sepolia)

| Contract | Address | Function |
|----------|---------|----------|
| **EscrowContract** | `0x06cd7225fbf6ffc2c0ad8261a076214e2d8b52f87c312485c46033048c80cf9c` | Locks funds pre-swap |
| **BuyStrkContract** | `0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b` | BTC → STRK conversion |
| **SellStrkContract** | `0x0282fc99f24ec08d9ad5d23f36871292b91e7f9b75c1a56e08604549d9402325` | STRK → BTC conversion |
| **STRK Token** | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f36c5d66ff` | STRK ERC20 token |

## Implementation Details

### OtcEscrowService (`lib/server/otcEscrowService.ts`)

```typescript
// REAL Cairo contract ABIs (lines 15-60)
const BUY_STRK_CONTRACT_ABI = [
  {
    type: 'function',
    name: 'buy_strk_with_btc',
    inputs: [
      { name: 'buyer_address', type: 'ContractAddress' },
      { name: 'btc_amount_sats', type: 'u256' },
      { name: 'seller_address', type: 'ContractAddress' },
    ],
    outputs: [{ type: 'bool' }],
  },
];

const SELL_STRK_CONTRACT_ABI = [
  {
    type: 'function',
    name: 'sell_strk_for_btc',
    inputs: [
      { name: 'seller_address', type: 'ContractAddress' },
      { name: 'strk_amount', type: 'u256' },
      { name: 'buyer_address', type: 'ContractAddress' },
      { name: 'btc_recipient_address', type: 'felt252' },
    ],
    outputs: [{ type: 'bool' }],
  },
];
```

### Constructor Initialization (lines 95-140)

```typescript
private constructor() {
  // Load contract addresses from environment
  this.escrowContractAddress = process.env.ESCROW_CONTRACT_ADDRESS;
  this.buyStrkContractAddress = process.env.BUY_STRK_ADDRESS;
  this.sellStrkContractAddress = process.env.SELL_STRK_ADDRESS;
  
  // Initialize RPC provider
  this.rpcProvider = new RpcProvider({ 
    nodeUrl: process.env.STARKNET_RPC_URL 
  });
  
  // Initialize EXECUTOR ACCOUNT (required for real execution!)
  if (process.env.STARKNET_EXECUTOR_ADDRESS && 
      process.env.STARKNET_EXECUTOR_PRIVATE_KEY) {
    this.account = new Account(
      this.rpcProvider,
      process.env.STARKNET_EXECUTOR_ADDRESS,
      process.env.STARKNET_EXECUTOR_PRIVATE_KEY
    );
    console.log('✅ Executor account initialized for REAL execution');
  }
}
```

### Execute Atomic Swap (lines 156-350)

```typescript
public async executeAtomicSwap(
  intentId: string,
  matchId: string,
  match: any
): Promise<{ transactionHash: string; ... }> {
  // Step 1: APPROVE STRK TOKEN (real contract call)
  const approveTx = await strkToken.approve(
    this.escrowContractAddress,
    approvalAmount
  );
  await this.rpcProvider.waitForTransaction(approveTx.transaction_hash);
  
  // Step 2: LOCK FUNDS IN ESCROW (real contract call)
  const lockTx = await escrowContract.lock_funds(
    intentId, lockAmount, '0', this.executorAddress
  );
  await this.rpcProvider.waitForTransaction(lockTx.transaction_hash);
  
  // Step 3: BUY STRK (real contract call)
  const buyStrkTx = await this.callBuyStrkReal(...);
  
  // Step 4: SELL STRK (real contract call)
  const sellStrkTx = await this.callSellStrkReal(...);
  
  return {
    transactionHash: buyStrkTx,
    steps: [approvalStep, lockStep, buyStep, sellStep]
  };
}
```

### Real Contract Invocations (lines 352-465)

**BuyStrkContract Call:**
```typescript
private async callBuyStrkReal(
  buyerAddress: string,
  btcAmount: string,
  sellerAddress: string
): Promise<string> {
  const contract = new Contract(
    BUY_STRK_CONTRACT_ABI,
    this.buyStrkContractAddress,
    this.account  // Executor account signs
  );

  // Convert BTC to satoshis (1 BTC = 100,000,000 sats)
  const btcAmountSats = uint256.bnToUint256(
    BigInt(Math.floor(parseFloat(btcAmount) * 1e8))
  );

  // REAL transaction call
  const tx = await contract.buy_strk_with_btc(
    buyerAddress,
    btcAmountSats,
    sellerAddress
  );

  // Wait for on-chain confirmation
  await this.rpcProvider.waitForTransaction(tx.transaction_hash);
  
  return tx.transaction_hash;
}
```

**SellStrkContract Call:**
```typescript
private async callSellStrkReal(
  sellerAddress: string,
  strkAmount: string,
  buyerAddress: string,
  btcRecipient: string
): Promise<string> {
  const contract = new Contract(
    SELL_STRK_CONTRACT_ABI,
    this.sellStrkContractAddress,
    this.account  // Executor account signs
  );

  // Convert STRK amount (18 decimals)
  const strkAmountScaled = uint256.bnToUint256(
    BigInt(Math.floor(parseFloat(strkAmount) * 1e18))
  );

  // REAL transaction call
  const tx = await contract.sell_strk_for_btc(
    sellerAddress,
    strkAmountScaled,
    buyerAddress,
    btcAddressFelt
  );

  // Wait for on-chain confirmation
  await this.rpcProvider.waitForTransaction(tx.transaction_hash);
  
  return tx.transaction_hash;
}
```

## Configuration Requirements

### Environment Variables (.env.local)

```bash
# REQUIRED for REAL contract execution
STARKNET_EXECUTOR_ADDRESS=0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e
STARKNET_EXECUTOR_PRIVATE_KEY=0x7020693358149ffcac060ec192fce404aa6dbbef5a1a29b0901a1cc1a8d1de9

# RPC Provider
NEXT_PUBLIC_STARKNET_RPC_URL=https://api.cartridge.gg/x/starknet/sepolia

# Contract Addresses
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x06cd7225fbf6ffc2c0ad8261a076214e2d8b52f87c312485c46033048c80cf9c
NEXT_PUBLIC_BUY_STRK_ADDRESS=0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b
NEXT_PUBLIC_SELL_STRK_ADDRESS=0x0282fc99f24ec08d9ad5d23f36871292b91e7f9b75c1a56e08604549d9402325
```

## Verification: How to Know Real Transactions Are Being Made

### 1. Server Logs
When executeAtomicSwap runs, you'll see:
```
[OtcEscrow] 🚀 EXECUTING REAL ATOMIC SWAP
[OtcEscrow] Configuration loaded:
  ├─ Escrow Contract: 0x06cd72...
  ├─ BuyStkContract: 0x076ee9...
  ├─ SellStrkContract: 0x02...
  ├─ Executor Account: 0x731ce5...

[Step 1] Approving STRK token transfer...
[Step 2] Locking funds in escrow...
[Step 3] Calling BuyStrkContract...
  Calling: buy_strk_with_btc(...)
  ✅ TX submitted: 0x5c7482...
  ⏳ Waiting for confirmation...
  ✅ TX confirmed on-chain

[Step 4] Calling SellStrkContract...
  Calling: sell_strk_for_btc(...)
  ✅ TX submitted: 0x3a1b9e...
  ⏳ Waiting for confirmation...
  ✅ TX confirmed on-chain

✅ ATOMIC SWAP COMPLETED SUCCESSFULLY
```

### 2. Transaction Hashes
Real transactions have actual Starknet hashes:
```json
{
  "transactionHash": "0x5c7482af0b29c4e8c0d5b3e2f5a8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b",
  "steps": [
    { "txHash": "0x3a1b9e..." },
    { "txHash": "0x2f8c5d..." },
    { "txHash": "0x5c7482..." },
    { "txHash": "0x7e9a2b..." }
  ]
}
```

### 3. Starknet Explorer
Verify transactions on [Starknet Sepolia Explorer](https://sepolia.starkscan.co/):
- Search for transaction hash
- View contract calls
- See state changes

### 4. Testnet Funding
For real execution on Sepolia:
1. Fund `STARKNET_EXECUTOR_ADDRESS` with testnet STRK
2. Fund escrow contract with test balances
3. Run test: `npm run test:otc`
4. Monitor Starknet Explorer for real transactions

## Error Handling

If execution fails, the service throws detailed errors:

```
❌ ATOMIC SWAP FAILED
Error: BuyStrkContract execution failed: <contract error>
Duration: 2500ms

Failed steps marked as:
{
  "step": 3,
  "description": "BuyStrkContract: Convert BTC to STRK",
  "status": "failed",
  "error": "Contract reverted: ..."
}
```

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Execution** | Mock hashes | Real Starknet TXs ✨ |
| **Contract Calls** | None | Actual contract invocations |
| **On-Chain Confirmation** | N/A | Real block verification |
| **Testnet Visibility** | Hidden | Visible on explorer |
| **RPC Usage** | None | Active Starknet RPC |
| **Gas Costs** | None | Real gas fees |
| **Scalability** | Unlimited | Testnet/mainnet limits |

## Next Steps for Production

1. **Deploy Contracts to Mainnet**
   - Deploy EscrowContract
   - Deploy BuyStrkContract  
   - Deploy SellStrkContract

2. **Update Environment**
   - Point to Mainnet RPC
   - Use mainnet contract addresses
   - Fund executor account with real STRK

3. **Security Hardening**
   - Audit smart contracts
   - Implement rate limiting
   - Add fund custody mechanisms
   - Enable multi-sig on executor

4. **Monitoring**
   - Track transaction success rates
   - Monitor gas prices
   - Alert on failed swaps
   - Analyze transaction patterns

## Key Files Modified

- `lib/server/otcEscrowService.ts` - Completely restructured with real contract execution
- `app/api/otc/intents/route.ts` - Already integrated with escrow service
- `scripts/test-otc-flow.js` - Test script runs end-to-end flow

---

**Status**: ✅ REAL EXECUTION READY FOR TESTING

The system now makes actual Starknet smart contract calls. When properly configured with funded accounts and correct contract addresses, it will perform real atomic swaps on Starknet Sepolia or Mainnet!
