# Frontend - ShadowFlow OTC Bridge UI

## Overview
This directory contains the Next.js frontend application for the ShadowFlow OTC Bridge. It provides a user-friendly interface for cross-chain atomic swaps between Bitcoin and Starknet tokens.

## Directory Structure

```
frontend/
├── app/                           # Next.js 14 app router
│   ├── page.tsx                   # Home page
│   ├── api/                       # Backend API routes (see backend/)
│   ├── otc-intent/                # OTC intent matching page
│   ├── swap-matching/             # Swap execution page
│   ├── verify/                    # Proof verification page
│   └── layout.tsx                 # Root layout
│
├── components/                    # React components
│   ├── otc-intent-page.tsx        # Intent creation & management
│   ├── swap-matching-interface-new.tsx  # Swap execution UI
│   ├── builder/                   # ZK proof builder components
│   ├── wallet/                    # Wallet connection components
│   └── ...                        # Other UI components
│
├── hooks/                         # React custom hooks
│   ├── useXverseWallet.ts         # Bitcoin wallet integration
│   ├── useStarknetWallet.ts       # Starknet wallet integration
│   └── ...                        # Other hooks
│
├── lib/                           # Frontend utilities
│   ├── btcClient.ts               # Bitcoin balance & transaction fetching
│   ├── balanceFetcher.ts          # Token balance utilities
│   ├── flowRules.ts               # ZK flow validation rules
│   └── ...                        # Other utilities
│
├── constants/                     # Constants and configuration
│   ├── nodes.ts                   # ZK node definitions
│   └── zkConstants.ts             # ZK proof parameters
│
├── public/                        # Static assets
│   ├── fonts/
│   └── images/
│
├── store/                         # State management (Redux/Zustand)
├── types/                         # TypeScript type definitions
├── styles/                        # Global styles
│
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript configuration
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS configuration
└── README.md                      # This file
```

## Key Features

### 1. OTC Intent Page (`/otc-intent`)
- Create and manage BTC ↔ STRK swap intents
- Real-time price fetching from Pyth Oracle
- Wallet balance display
- Split payment support for risk management
- Transaction simulation with real escrow amounts

### 2. Swap Matching Interface (`/swap-matching`)
- Live matching with counter-parties
- Real-time status updates (2-second polling)
- Multi-step signing:
  - User signature
  - Escrow funding
  - Atomic swap execution
- Clear progress indicators and success confirmations

### 3. Wallet Integration
- **Bitcoin Wallets**: Xverse and Unisat support
- **Starknet Wallets**: Argent X and Braavos support
- Automatic network detection
- Balance fetching and transaction creation

### 4. Price Oracle Integration
- **Pyth Network**: Real-time exchange rates
- **Fallback Rates**: Local rates (3700 STRK per BTC) when oracle fails
- Automatic rate tolerance validation (5%)

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 with App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State Management | React Context / useState |
| Wallet Connection | sats-connect (Bitcoin), starknet.js (Starknet) |
| API Client | Fetch API |
| Build Tool | Webpack (via Next.js) |

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- A Bitcoin wallet (Xverse or Unisat)
- A Starknet wallet (Argent X or Braavos)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Update .env.local with your configuration
# NEXT_PUBLIC_STARKNET_RPC_URL=...
# NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=...
# etc.

# Start development server
npm run dev

# Open http://localhost:3000
```

### Development

```bash
# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

## Component Architecture

### OTC Intent Page Component
```
OtcIntentPage
├── WalletConnectSection
├── IntentForm
│   ├── ChainSelector (BTC/STRK)
│   ├── AmountInput
│   ├── PriceThresholdInput
│   └── ReceiveWalletInput
├── PriceDisplay
└── SubmitButton
```

### Swap Matching Component
```
SwapMatchingInterface
├── MatchProgressTimeline
│   ├── Step 1: Signatures
│   ├── Step 2: Escrow Funding
│   └── Step 3: Execution
├── PartyDetails
│   ├── Party A Info
│   └── Party B Info
├── ActionButtons
│   ├── SignButton
│   ├── FundButton
│   └── ApproveButton
└── SuccessScreen
```

## Key Functions and Hooks

### `useXverseWallet()`
Manages Bitcoin wallet connection and operations.
```typescript
const {
  walletAddress,
  isConnecting,
  xverseAvailable,
  connectXverse,
  signaturesRequired,
  getBalance
} = useXverseWallet();
```

### `btcClient.getBalance(address)`
Fetches Bitcoin balance from Mempool API.
```typescript
const balance = await btcClient.getBalance('bc1qaddress...');
// Returns: balance in BTC (e.g., 0.5)
```

### `balanceFetcher.getTokenBalance()`
Fetches STRK token balance from Starknet.
```typescript
const balance = await balanceFetcher.getTokenBalance(address, tokenAddress);
// Returns: balance in smallest unit (e.g., 370000000000000000000n for 370 STRK)
```

## API Integration

The frontend communicates with backend APIs:

### POST `/api/otc/intents` - Create Intent
```typescript
{
  amount: "0.1",
  priceThreshold: "370",
  sendChain: "btc",
  receiveChain: "strk",
  receiveWalletAddress: "0x...",
  walletAddress: "bc1q...",
  step: "validate"
}
```

### GET `/api/otc/matches` - Get Matches
```typescript
// Returns:
{
  matches: [{
    matchId: "match_123",
    partyA: { wallet, sendAmount, receiveAmount, ... },
    partyB: { wallet, sendAmount, receiveAmount, ... },
    status: "pending" | "signed" | "funded" | "executing" | "executed"
  }]
}
```

### POST `/api/otc/intents` (step: execute) - Execute Swap
```typescript
{
  intentId: "intent_123",
  signature: "0x...",
  walletAddress: "bc1q...",
  sendChain: "btc",
  step: "execute"
}
```

## Environment Variables

```env
# Network Configuration
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
NEXT_PUBLIC_STARKNET_RPC_URL=https://api.cartridge.gg/x/starknet/sepolia

# Smart Contract Addresses
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x04ab814...
NEXT_PUBLIC_LIQUIDITY_POOL_ADDRESS=0x01509...
NEXT_PUBLIC_STRK_TOKEN_ADDRESS=0x04718...

# Bitcoin Configuration
NEXT_PUBLIC_BTC_NETWORK=testnet4
NEXT_PUBLIC_BTC_RPC_URL=https://mempool.space/testnet4/api
NEXT_PUBLIC_BTC_WALLET_PROVIDER=xverse

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_EXECUTION=true
NEXT_PUBLIC_ENABLE_TEE=true
```

## State Flow

```
User Creates Intent
    ↓
Creates Message & Signature
    ↓
Validates Price Threshold
    ↓
Pins Intent to Backend
    ↓
Waits for Match (1-2 minutes)
    ↓
Match Found → S swap Matching Page
    ↓
Both Sign & Approve
    ↓
Both Fund Escrow from Wallets
    ↓
Atomic Swap Executes
    ↓
Success Screen with TX Hash
```

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| Wallet not connected | Extension not installed or disabled | Install/enable Bitcoin or Starknet wallet |
| Invalid amount | Amount < 0.0001 BTC or too high | Check minimum amount (0.0001 BTC = 0.37 STRK) |
| Price threshold too low | Exchange rate worse than set | Increase price threshold or wait for better rates |
| Insufficient balance | Not enough tokens | Verify balance in wallet extension |
| Signing failed | User rejected signature | Approve signature in wallet popup |
| No match found | Not enough liquidity | Wait for another user or increase amount |

## Testing

### Manual Testing Checklist
- [ ] Connect Bitcoin wallet (Xverse testnet4)
- [ ] Connect Starknet wallet (Sepolia)
- [ ] Create intent with 0.1 BTC
- [ ] Receive match notification
- [ ] Sign intent
- [ ] Fund escrow
- [ ] Verify success screen
- [ ] Check transaction on explorer

### Test Amounts
- Minimum BTC: 0.0001 (= ~0.37 STRK at $42k BTC/$11.3 STRK)
- Maximum BTC: 1.0 (= ~3700 STRK)
- Test with 0.1 BTC (= ~370 STRK) for full demo

## Performance Optimization

- **Code Splitting**: Next.js automatic route-based splitting
- **Image Optimization**: Next.js Image component for avatars
- **Polling Optimization**: 2-second polling interval for match updates
- **Lazy Loading**: Components load on-demand

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Notes

1. **Private Keys**: Never stored in frontend, only in wallet extensions
2. **Signatures**: Validated on backend before execution
3. **Rate Validation**: Applied before escrow lock-in
4. **Session Management**: Uses browser-native storage for state

## Troubleshooting

### Wallet Connection Issues
```bash
# Clear browser cache
# Disable other wallet extensions
# Try incognito mode
# Check wallet is on correct network (testnet4 for BTC, Sepolia for STRK)
```

### Transaction Pending
```bash
# Check block explorer for transaction status
# Bitcoin: https://mempool.space/testnet4
# Starknet: https://sepolia.starkscan.co
```

### Rate Mismatch
```bash
# Rates refresh every 10 seconds from Pyth
# Fallback rates: 3700 STRK per BTC
# Tolerance: ±5% automatic adjustment
```

## Future Enhancements

- [ ] Real-time price charts
- [ ] Multi-currency support (ETH, USDC, etc.)
- [ ] Advanced order types (limit, stop-loss)
- [ ] Transaction history and analytics
- [ ] Mobile app (React Native)
- [ ] Darkmode theme
- [ ] Multi-language support

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [sats-connect Documentation](https://github.com/scure/sats-connect)
- [starknet.js](https://www.starknetjs.com/)

## Contributing

1. Create a feature branch
2. Make changes
3. Test locally (`npm run dev`)
4. Submit PR with description

## Support

For frontend-related issues:
1. Check the components in `components/`
2. Review hooks in `hooks/`
3. Check API integration in related components
4. Review browser console for errors
