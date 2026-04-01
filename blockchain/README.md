# Blockchain & Smart Contracts

## Overview
This directory contains the Starknet smart contracts and blockchain-related deployment scripts for the ShadowFlow OTC Bridge application.

## Directory Structure

```
blockchain/
├── contracts/                  # Cairo smart contracts
│   ├── src/
│   │   ├── lib.cairo          # Contract library with core logic
│   │   ├── escrow.cairo       # Escrow contract for atomic swaps
│   │   └── ...                # Other contract files
│   ├── Scarb.toml             # Scarb (Cairo package manager) config
│   └── deployments/           # Deployment artifacts
│
└── scripts/                    # Deployment and testing scripts
    ├── deploy-contracts.ps1   # PowerShell deployment script
    ├── add-liquidity.ps1      # Add liquidity script
    └── ...                    # Other utility scripts
```

## Deployed Contracts (Starknet Sepolia Testnet)

### Core Contracts
| Contract | Address | Purpose |
|----------|---------|---------|
| Escrow | `0x04ab814de65d6ce99bb8801b33fcd751ae21b28f1f4726363be93d12b99ecbf4` | Atomic swap escrow and settlement |
| Liquidity Pool | `0x0150909eba659342d7da0c11e0cae0234306b2c3d30abc611590d507ce678ef6` | Liquidity management |
| Buy STRK | `0x076ee99ed6b1198a683b1a3bdccd7701870c79db32153d07e8e718267385f64b` | BTC → STRK swap logic |
| Sell STRK | `0x0282fc99f24ec08d9ad5d23f36871292b91e7f9b75c1a56e08604549d9402325` | STRK → BTC swap logic |

### Token Contracts
| Token | Address | Role |
|-------|---------|------|
| STRK Token | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` | Starknet native token |

## Key Smart Contract Features

### Escrow Contract (`escrow.cairo`)
- **Deposit Management**: Accepts and locks deposits for both BTC and STRK
- **Atomic Swap Execution**: Coordinates synchronized token transfers
- **Refund Mechanism**: Returns funds if swap conditions aren't met
- **Rate Validation**: Verifies exchange rates during swap execution

### Contract Flow
```
1. User A creates intent: Send 0.1 BTC, receive 370 STRK
2. User B approves: Send 370 STRK, receive 0.1 BTC
3. Both parties sign the intent
4. Funds are locked in escrow contract
5. Escrow validates rates and executes atomic swap
6. Both parties receive their tokens simultaneously
```

## Development

### Prerequisites
- Scarb (Cairo package manager)
- Starknet CLI
- Node.js 18+ (for deployment scripts)

### Compiling Contracts
```bash
cd blockchain/contracts
scarb build
```

### Deploying Contracts
```bash
# Using PowerShell script (Windows)
cd blockchain/scripts
./deploy-contracts.ps1 -Network sepolia

# Or manually with Starknet CLI
starknet declare --contract escrow.json --network sepolia
starknet deploy --class-hash <class_hash> --network sepolia
```

### Testing
```bash
scarb test
```

## Environment Variables

Configure in `.env`:
```env
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
STARKNET_RPC=https://api.cartridge.gg/x/starknet/sepolia
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x04ab814de65d6ce99bb8801b33fcd751ae21b28f1f4726363be93d12b99ecbf4
STARKNET_EXECUTOR_ADDRESS=0x731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e
STARKNET_EXECUTOR_PRIVATE_KEY=<keep_secret>
```

## Contract Architecture

### State Management
- **Deposits**: Maps wallet addresses to deposited amounts (per chain)
- **Intents**: Stores user swap intents with rates and expiration
- **Matches**: Tracks matched pairs and execution status

### Key Functions

#### Escrow Functions
```cairo
fn deposit(amount: u256, chain: felt252) -> bool
fn execute_swap(match_id: u256, amounts: Span<u256>) -> bool
fn refund_deposit(wallet: ContractAddress, chain: felt252) -> bool
fn get_deposit_amount(wallet: ContractAddress, chain: felt252) -> u256
```

#### Rate Validation
```cairo
fn _validate_rate(amount: u256, expected_rate: u256, tolerance_bps: u256) -> bool
fn _calculate_output(from_amount: u256, rate_from: u256, rate_to: u256) -> u256
```

## Security Considerations

1. **Atomic Execution**: Both funds transferred simultaneously or neither transfers
2. **Rate Tolerance**: 5% slippage tolerance on exchange rates
3. **Expiration**: Intents expire after 5 minutes
4. **Access Control**: Only authorized addresses can trigger settlement
5. **Escrow Locks**: Funds remain locked until both parties approve

## Testing Network

- **Network**: Starknet Sepolia Testnet
- **RPC Endpoint**: https://api.cartridge.gg/x/starknet/sepolia
- **Block Explorer**: https://sepolia.starkscan.co

## Debugging

### Check Contract State
```bash
starknet call --address 0x04ab814 --function get_deposit_amount \
  --inputs <wallet_address> btc --network sepolia
```

### Verify Deployment
```bash
starknet get-transaction --hash <tx_hash> --network sepolia
starknet get-receipt --hash <tx_hash> --network sepolia
```

## Future Enhancements

- [ ] Support for additional ERC20 tokens
- [ ] Automated liquidity rebalancing
- [ ] Cross-chain verification oracle
- [ ] Multi-sig approval for large swaps
- [ ] Time-locked deposits for yield generation

## Resources

- [Cairo Documentation](https://docs.starknet.io/cairo)
- [Starknet Dev Docs](https://docs.starknet.io/)
- [Scarb Package Manager](https://docs.swmansion.com/scarb)
- [Starknet Sepolia Faucet](https://faucet.cartridge.gg/)

## Support

For contract-related questions or issues:
1. Check the Cairo contracts in `src/`
2. Review deployment logs in `scripts/`
3. Test with Hardhat locally before deploying to testnet
