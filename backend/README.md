# Backend - ShadowFlow OTC Bridge API

## Overview
This directory contains the backend API server for the ShadowFlow OTC Bridge. It handles intent validation, matching, execution state management, and smart contract interactions.

## Directory Structure

```
backend/
├── app/api/                       # Next.js API routes (Backend API)
│   ├── otc/
│   │   ├── intents/
│   │   │   └── route.ts           # Intent CRUD + validation + execution
│   │   ├── matches/
│   │   │   └── route.ts           # Match finding + state updates
│   │   └── liquidity/
│   │       └── add-reserves.ts    # Liquidity management
│   ├── proof/
│   │   └── check/                 # ZK proof verification
│   └── health/                    # Health check endpoints
│
└── lib/server/                    # Server-side utilities
    ├── zkProofService.ts          # ZK proof generation & verification
    ├── garagaOnChainVerifier.ts   # On-chain verification wrapper
    ├── crossChainService.ts       # Cross-chain operations
    ├── mockDatabase.ts            # In-memory database for demo
    └── ...                        # Other server utilities
```

## API Endpoints

### OTC Intents Management
**File**: `app/api/otc/intents/route.ts`

#### POST /api/otc/intents - Create/Validate Intent
Creates a new swap intent and validates against available liquidity.

**Request**:
```json
{
  "amount": "0.1",
  "priceThreshold": "370",
  "sendChain": "btc",
  "receiveChain": "strk",
  "receiveWalletAddress": "0x...",
  "walletAddress": "bc1q...",
  "splitCount": "1",
  "depositAmount": "0.1",
  "step": "validate"
}
```

**Response (Success)**:
```json
{
  "intentId": "intent_ecd5f0a1c4cc",
  "messageToSign": "Sign this intent: intent_ecd5f...",
  "match": null,
  "hasMatch": false,
  "status": "pending",
  "statusMessage": "Intent created, waiting for match"
}
```

**Response (Error)**:
```json
{
  "error": "Message: Insufficient liquidity for 370 STRK on Starknet"
}
```

**Steps**:
- `validate` - Create intent & get signature message
- `sign` - Receive signature & create signature record
- `execute` - Execute atomic swap with signed permission

---

#### GET /api/otc/intents?intentId=... - Get Intent Status
Retrieves current status of an intent.

**Response**:
```json
{
  "intent": {
    "intentId": "intent_ecd5f0a1c4cc",
    "amount": "0.1",
    "sendChain": "btc",
    "status": "pending" | "signed" | "escrow_funding" | "escrow_funded" | "both_approved" | "executing" | "executed",
    "createdAt": 1711900000000,
    "expiresAt": 1711900300000
  }
}
```

---

### Match Finding
**File**: `app/api/otc/matches/route.ts`

#### GET /api/otc/matches?walletAddress=... - Find Matches
Finds available matches for a user's intent.

**Response**:
```json
{
  "matches": [
    {
      "matchId": "match_abc123",
      "partyA": {
        "wallet": "bc1q...",
        "sendChain": "btc",
        "sendAmount": "0.1",
        "receiveChain": "strk",
        "receiveAmount": "370",
        "signed": false,
        "fundedToEscrow": false
      },
      "partyB": {
        "wallet": "0x...",
        "sendChain": "strk",
        "sendAmount": "370",
        "receiveChain": "btc",
        "receiveAmount": "0.1",
        "signed": false,
        "fundedToEscrow": false
      },
      "status": "pending",
      "createdAt": 1711900120000,
      "expiresAt": 1711900420000
    }
  ]
}
```

**Status Flow**:
```
pending 
  → signed (both signed)
  → escrow_funding (signatures received)
  → escrow_funded (both funded escrow)
  → both_approved (ready to execute)
  → executing (swap executing)
  → executed (swap complete)
```

---

### Liquidity Management
**File**: `app/api/otc/liquidity/add-reserves.ts`

#### POST /api/otc/liquidity/add-reserves - Add Reserve Liquidity
Adds liquidity reserves to support swaps (admin only).

**Request**:
```json
{
  "amount": "10000000000000000000000",
  "chain": "strk"
}
```

**Response**:
```json
{
  "message": "10000 STRK reserves added to Starknet contract"
}
```

---

## Core Logic

### Intent Validation Flow

```typescript
// 1. Parse request body
const { amount, priceThreshold, sendChain, receiveChain, ... } = body;

// 2. Validate inputs
- Amount > 0 and valid format
- Both chains are different
- Addresses valid for respective chains

// 3. Fetch prices from Pyth Oracle
const btcPrice = await getPythPrice("BTC"); // ~42000 USD
const strkPrice = await getPythPrice("STRK"); // ~11.3 USD
if (failure) use fallback: btcPrice=42000, strkPrice=11.3

// 4. Calculate receive amount
const exchangeRate = sendChain === "btc" ? 3700 : 0.000269;
const receiveAmount = amount * exchangeRate;

// 5. Validate against price threshold
const rateError = Math.abs(receiveAmount - priceThreshold) / priceThreshold;
if (rateError > 0.05) {
  throw "Rate mismatch: got 370, expected 365 ±5%"
}

// 6. Check liquidity reserves
const reserves = getReserves(receiveChain);
if (reserves < receiveAmount) {
  throw "Insufficient liquidity"
}

// 7. Create intent with 5-minute expiration
const intent = {
  intentId: generateId(),
  status: "pending",
  expiresAt: Date.now() + 5 * 60 * 1000,
  ...
};

// 8. Return message to sign
return { 
  intentId, 
  messageToSign: `Sign this intent: ${shortId}\n...`
};
```

### Match Finding Logic

```typescript
// 1. Get user's intent
const userIntent = getIntent(walletAddress);

// 2. Find complementary intents
const allIntents = getAllIntents();
const matches = allIntents.filter(intent => 
  intent.sendChain === userIntent.receiveChain &&
  intent.receiveChain === userIntent.sendChain &&
  rates match within tolerance &&
  amounts compatible
);

// 3. Calculate compatibility
- User A wants: 0.1 BTC → 370 STRK
- Find User B who wants: 370 STRK → 0.1 BTC
- Check rates align (both get fair exchange)

// 4. Return best matches (latest first)
return matches.sort((a, b) => b.createdAt - a.createdAt);
```

### Atomic Swap Execution

```typescript
// 1. Validate signatures from both parties
const messageA = createMessage(matchId);
const messageB = createMessage(matchId);
verify(partyA.signature, messageA, partyA.wallet);
verify(partyB.signature, messageB, partyB.wallet);

// 2. Update match status
match.status = "both_approved";

// 3. Lock in rates and amounts
match.executionRate = currentRate;
match.btcAmount = amount;
match.strkAmount = amount * exchangeRate;

// 4. Call smart contract escrow
const escrowTx = await escrowContract.executeAtomicSwap({
  partyA: partyA.wallet,
  partyB: partyB.wallet,
  amount: match.btcAmount,
  receiveAmount: match.strkAmount,
  rate: match.executionRate
});

// 5. Wait for settlement
const receipt = await waitForTransaction(escrowTx);

// 6. Update final status
match.status = "executed";
match.transactionHash = receipt.hash;

// 7. Generate response with completion details
return {
  status: "executed",
  transactionHash: receipt.hash,
  partyA: { sent: match.btcAmount, received: match.strkAmount },
  partyB: { received: match.btcAmount, sent: match.strkAmount }
};
```

## Data Models

### Intent Schema
```typescript
interface Intent {
  intentId: string;              // Unique ID
  walletAddress: string;         // Creator wallet
  sendChain: "btc" | "strk";    // Sending chain
  receiveChain: "btc" | "strk"; // Receiving chain
  amount: number;                // Sending amount
  priceThreshold: number;        // Minimum receive amount
  receiveWalletAddress: string;  // Where to receive tokens
  status: IntentStatus;          // Current processing status
  signature?: string;            // Signed message
  createdAt: number;             // Timestamp
  expiresAt: number;             // 5-minute expiration
}

type IntentStatus = 
  | "pending"           // Created, awaiting match
  | "signed"            // User signed, awaiting execution
  | "escrow_funding"    // Getting escrow confirmation
  | "escrow_funded"     // Escrow ready
  | "both_approved"     // Both parties ready
  | "executing"         // Swap in progress
  | "executed";         // Complete
```

### Match Schema
```typescript
interface Match {
  matchId: string;
  partyA: Party;
  partyB: Party;
  status: MatchStatus;
  transactionHash?: string;
  createdAt: number;
  expiresAt: number;
}

interface Party {
  wallet: string;
  sendChain: "btc" | "strk";
  sendAmount: string;
  receiveChain: "btc" | "strk";
  receiveAmount: string;
  signed: boolean;
  fundedToEscrow: boolean;
}
```

## Environment Variables

```env
# Starknet Configuration
STARKNET_NETWORK=sepolia
STARKNET_RPC=https://api.cartridge.gg/x/starknet/sepolia
STARKNET_EXECUTOR_ADDRESS=0x731ce505...
STARKNET_EXECUTOR_PRIVATE_KEY=0x7020...

# Smart Contract Addresses
ESCROW_CONTRACT_ADDRESS=0x04ab814...
LIQUIDITY_POOL_ADDRESS=0x01509...
STRK_TOKEN_ADDRESS=0x04718...

# Bitcoin Configuration
NEXT_PUBLIC_BTC_NETWORK=testnet4
NEXT_PUBLIC_BTC_RPC_URL=https://mempool.space/testnet4/api

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_EXECUTION=true
NEXT_PUBLIC_ENABLE_TEE=true
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing or invalid amount (must be > 0)"
}
```

### 404 Not Found
```json
{
  "error": "Intent not found"
}
```

### 503 Service Unavailable
```json
{
  "error": "Oracle service unavailable, using fallback rates"
}
```

## Database (In-Memory for Demo)

**File**: `lib/server/mockDatabase.ts`

```typescript
// Storage structures
intents: Map<string, Intent>
matches: Map<string, Match>
signatures: Map<string, Signature>
reserves: Map<"btc" | "strk", number>
```

**For Production**: Replace with:
- PostgreSQL with Prisma ORM
- Redis for caching
- MongoDB for document storage

## Smart Contract Integration

**File**: `lib/server/crossChainService.ts`

Handles validation and execution calls to smart contracts:

```typescript
// Validate escrow has funds
const hasEnoughEscrow = await escrowContract.getDepositAmount(
  partyAddress,
  chainType
) >= requiredAmount;

// Execute atomic swap
const txHash = await escrowContract.executeAtomicSwap({
  partyA: partyA.wallet,
  partyB: partyB.wallet,
  amounts: [btcAmount, strkAmount],
  rates: [btcRate, strkRate]
});

// Refund if needed
await escrowContract.refundDeposit(wallet, chain);
```

## Price Oracle Integration

**File**: Uses Pyth Network via API

```typescript
// Fetch BTC price in USD
const btcResponse = await fetch(pythUrl + "/price/btc");
const btcPrice = btcResponse.price; // USD

// Fetch STRK price in USD
const strkResponse = await fetch(pythUrl + "/price/strk");
const strkPrice = strkResponse.price; // USD

// Calculate exchange rate
const rate = btcPrice / strkPrice; // STRK per BTC
// ~42000 / 11.3 = ~3700 STRK per BTC

// Fallback if Pyth unavailable
if (oracleFails) {
  return { btcPrice: 42000, strkPrice: 11.3 };
}
```

## Logging

All operations are logged for debugging:

```
[OTC-INTENTS] Creating intent for bc1q... sending 0.1 BTC
[OTC-INTENTS] Fetching prices from Pyth
[OTC-INTENTS] BTC: $42000 | STRK: $11.3
[OTC-INTENTS] Received signature from 0x...
[OTC-MATCHES] Match found: match_abc123
[OTC-MATCHES] Party A (bc1q...) ↔ Party B (0x...)
[OTC-MATCHES] Executing atomic swap
[OTC-MATCHES] Transaction hash: 0x...
[OTC-MATCHES] Swap executed successfully
```

## Rate Limits (When Added)
```
- 100 requests/minute per IP
- 10 intent creations/minute per wallet
- 5 intents active simultaneously per wallet
```

## Security Measures

1. **Signature Validation**: Every action requires signed approval
2. **Rate Limits**: Prevent spam and abuse
3. **Expiration**: Intents expire after 5 minutes
4. **Atomic Execution**: Both transfers or neither
5. **Reserve Checking**: Verify liquidity before matching

## Monitoring

### Health Check
```
GET /api/health
Response: { status: "healthy", timestamp, ... }
```

### Key Metrics to Track
- Total intents created
- Match success rate
- Average swap duration
- Oracle availability
- Smart contract gas costs

## Testing API Locally

```bash
# Create an intent
curl -X POST http://localhost:3000/api/otc/intents \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "0.1",
    "priceThreshold": "370",
    "sendChain": "btc",
    "receiveChain": "strk",
    "walletAddress": "bc1q...",
    "receiveWalletAddress": "0x...",
    "step": "validate"
  }'

# Get matches
curl "http://localhost:3000/api/otc/matches?walletAddress=bc1q..."

# Execute swap
curl -X POST http://localhost:3000/api/otc/intents \
  -H "Content-Type: application/json" \
  -d '{
    "intentId": "intent_...",
    "signature": "0x...",
    "walletAddress": "bc1q...",
    "step": "execute"
  }'
```

## Future Enhancements

- [ ] Persistent database (PostgreSQL)
- [ ] Redis caching for faster lookups
- [ ] WebSocket for real-time updates
- [ ] Advanced matching algorithm
- [ ] Fee system and slippage handling
- [ ] Automated liquidity rebalancing
- [ ] Rate limiting and DDoS protection
- [ ] GraphQL API option
- [ ] OpenAPI/Swagger documentation
- [ ] Request signing for auth instead of wallet signing

## Support

For backend/API issues:
1. Check API route files in `app/api/`
2. Review server utilities in `lib/server/`
3. Check server logs for detailed errors
4. Test endpoints locally with curl
