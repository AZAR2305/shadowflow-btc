# Cairo v2 Contract Compilation Quick Fix Guide

## Issue Summary

Your Cairo contracts have structural issues in v2:
1. Missing or incorrect `impl` blocks for contract methods
2. Missing dispatcher definitions for cross-contract calls
3. Event traits not properly imported/implemented
4. Deprecated `contract_address_const` usage

## Quick Fixes

### 1. Fix `garaga_verifier.cairo`

**Replace line 29:**
```cairo
// OLD (deprecated):
let zero = starknet::contract_address_const::<0>();

// NEW (Cairo v2):
let zero: ContractAddress = 0x0.try_into().unwrap();
// OR use a storage field instead of const
```

---

### 2. Ensure `escrow.cairo` Has Proper Structure

**Check that ALL methods are inside or after a proper impl block:**

```cairo
#[starknet::contract]
mod EscrowContract {
    use starknet::ContractAddress;
    use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess};
    use starknet::get_caller_address;
    use starknet::event::EventEmitter;  // ADD THIS
    use core::traits::Into;

    // ... interfaces, storage, events ...

    #[constructor]
    fn constructor(...) { ... }

    #[external(v0)]
    fn add_wallet_to_allowlist(...) { ... }
    
    // ... other #[external(v0)] methods ...

    // CLOSE the contract mod here:
}

// NOW implement the contract methods
#[generate_trait]
impl EscrowContractImpl of EscrowContractTrait {
    #[inline(always)]
    fn is_wallet_allowed(self: @ContractState, wallet: ContractAddress) -> bool {
        self.allowlist.read(wallet)
    }

    #[inline(always)]
    fn is_token_allowed(self: @ContractState, token: ContractAddress) -> bool {
        self.token_allowlist.read(token)
    }
}
```

---

### 3. Ensure `liquidity_pool.cairo` Has Proper impl Block

**Structure:**
```cairo
#[starknet::contract]
mod LiquidityPool {
    // Imports, interfaces, storage, events...

    #[constructor]
    fn constructor(...) { ... }

    #[external(v0)]
    fn allow_pair(...) { ... }

    #[external(v0)]
    fn swap(...) { ... }

    // ... other external functions ...
}

// Implement helper methods OUTSIDE the contract mod
#[generate_trait]
impl LiquidityPoolImpl of LiquidityPoolTrait {
    fn is_pair_allowed(self: @ContractState, token_a: ContractAddress, token_b: ContractAddress) -> bool {
        self.allowed_pairs.read((token_a, token_b))
    }

    fn _calculate_output(self: @ContractState, from_amount: u256, rate_from: u256, rate_to: u256) -> u256 {
        (from_amount * rate_to) / rate_from
    }

    fn _calculate_fee(self: @ContractState, amount: u256, fee_bps: u256) -> u256 {
        (amount * fee_bps) / 10000
    }

    fn _calculate_lp_shares(self: @ContractState, amount_a: u256, amount_b: u256, total_shares: u256) -> u256 {
        ((amount_a + amount_b) / 2) + (total_shares / 4)
    }
}
```

---

### 4. Fix Dispatcher Errors for `buy_strk.cairo` and `sell_strk.cairo`

**For ERC20 dispatcher, replace:**
```cairo
// OLD (causes "Identifier not found" error):
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

// NEW (Cairo v2 correct way):
#[abi]
pub trait IERC20 {
    #[external]
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    #[external]
    fn transfer_from(ref self: TContractState, from: ContractAddress, to: ContractAddress, amount: u256) -> bool;
    #[external]
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    #[external]
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

pub struct ERC20ABIDispatcher {
    contract_address: ContractAddress,
}

pub impl ERC20_IMPL of IERC20 {
    fn transfer(ref self: ERC20ABIDispatcher, recipient: ContractAddress, amount: u256) -> bool {
        // Dispatcher call logic
    }
    // ... other methods ...
}
```

**OR use a simpler approach:**
```cairo
#[starknet::interface]
pub trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(ref self: TContractState, from: ContractAddress, to: ContractAddress, amount: u256) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

pub struct ERC20Dispatcher {
    contract_address: ContractAddress,
}

pub impl IERC20Impl of IERC20<ERC20Dispatcher> {
    fn transfer(ref self: ERC20Dispatcher, recipient: ContractAddress, amount: u256) -> bool {
        starknet::call_contract_syscall(
            self.contract_address,
            selector!("transfer"),
            array![recipient.into(), amount.low.into(), amount.high.into()].span()
        ).unwrap().data.at(0).clone()
    }
    // ... other methods ...
}
```

---

### 5. Fix Storage Access in `buy_strk.cairo` and `sell_strk.cairo`

**Issue:** Using `.write()` and `.read()` on storage variables without correct trait imports.

**Solution:**
1. Add trait import at top:
```cairo
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
```

2. For Map types, add:
```cairo
use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess};
```

3. For accessing mutable storage, wrap in proper context:
```cairo
// OLD:
self.admin.write(admin);

// Ensure this is inside an external function or constructor with `ref self: ContractState`
// The trait imports will automatically make `.write()` available
```

---

## Compilation Command

```bash
cd contracts

# Clean build
scarb clean
scarb build

# If errors persist:
# 1. Check all imports are correct
# 2. Ensure all methods are inside proper impl blocks
# 3. Verify dispatcher definitions match Cairo v2 syntax
# 4. Look for any remaining deprecated patterns
```

---

## Cairo v2 Essential Corrections Checklist

- [ ] All `impl` blocks are **outside** the `mod ContractName { }` block
- [ ] All external methods use `#[external(v0)]` attribute
- [ ] All helper/internal methods are in a `#[generate_trait] impl` block
- [ ] Storage access traits are imported: `StoragePointerReadAccess`, `StoragePointerWriteAccess`
- [ ] Map access traits are imported: `StorageMapReadAccess`, `StorageMapWriteAccess`
- [ ] Cross-contract call dispatchers are properly defined with `#[abi]` or `#[starknet::interface]`
- [ ] Event emission uses `EventEmitter` trait (if custom trait needed)
- [ ] No deprecated `contract_address_const` usage (use `.try_into()` instead)
- [ ] All types are properly imported (ContractAddress, u256, felt252, etc.)
- [ ] All functions used are imported (get_caller_address, get_contract_address, etc.)

---

## Common Error Solutions

### Error: "Method not found on ContractState"
**Cause:** Method is not in an impl block or impl is inside the contract mod
**Fix:** Move impl block outside contract mod, use `#[generate_trait]`

### Error: "StoragePointerReadAccess not found"
**Cause:** Missing trait import
**Fix:** Add `use starknet::storage::StoragePointerReadAccess;`

### Error: "Identifier ERC20ABIDispatcher not found"
**Cause:** OpenZeppelin import path is wrong or openzeppelin package missing
**Fix:** Define IERC20 interface and dispatcher locally (see sections 4 above)

### Error: "Method write not found on type StorageBase"
**Cause:** StoragePointerWriteAccess import missing
**Fix:** Add `use starknet::storage::StoragePointerWriteAccess;` at top

---

## References

- [Cairo Book - v2 Improvements](https://book.cairo-lang.org/)
- [Starknet Contract Development](https://docs.starknet.io/architecture-and-concepts/smart-contracts/)
- [Starknet By Example](https://starknet-by-example.voyager.online/)
