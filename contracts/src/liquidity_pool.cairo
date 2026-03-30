#[starknet::contract]
mod LiquidityPool {
    use starknet::ContractAddress;
    use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess};
    use starknet::get_caller_address;

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
        fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
        fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    }

    #[storage]
    struct Storage {
        // Pool reserves: token → amount
        token_reserves: Map<ContractAddress, u256>,
        
        // Token pairs allowlist: (token_a, token_b) → is_allowed
        allowed_pairs: Map<(ContractAddress, ContractAddress), bool>,
        
        // Exchange rates (fixed for initial implementation)
        // rate: token_a_amount → token_b_amount
        exchange_rates: Map<(ContractAddress, ContractAddress), (u256, u256)>,
        
        // Pool liquidity providers
        lp_shares: Map<(ContractAddress, ContractAddress), u256>,
        
        // Total LP shares per pool
        total_lp_shares: Map<(ContractAddress, ContractAddress), u256>,
        
        // Admin
        admin: ContractAddress,
        
        // Fee percentage (in basis points, e.g., 25 = 0.25%)
        fee_bps: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SwapExecuted: SwapExecuted,
        LiquidityAdded: LiquidityAdded,
        LiquidityRemoved: LiquidityRemoved,
        RateUpdated: RateUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapExecuted {
        from_token: ContractAddress,
        to_token: ContractAddress,
        from_amount: u256,
        to_amount: u256,
        fee: u256,
        user: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct LiquidityAdded {
        token_a: ContractAddress,
        token_b: ContractAddress,
        amount_a: u256,
        amount_b: u256,
        lp: ContractAddress,
        shares_minted: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct LiquidityRemoved {
        token_a: ContractAddress,
        token_b: ContractAddress,
        lp: ContractAddress,
        shares_burned: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct RateUpdated {
        token_a: ContractAddress,
        token_b: ContractAddress,
        rate_a: u256,
        rate_b: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress, fee_bps: u256) {
        self.admin.write(admin);
        self.fee_bps.write(fee_bps);
    }

    // ============================================
    // ALLOWLIST & RATE MANAGEMENT
    // ============================================

    #[external(v0)]
    fn allow_pair(
        ref self: ContractState,
        token_a: ContractAddress,
        token_b: ContractAddress,
        rate_a: u256,  // token_a amount
        rate_b: u256,  // token_b amount (rate: rate_a of token_a = rate_b of token_b)
    ) {
        let caller = get_caller_address();
        assert(caller == self.admin.read(), 'only admin');

        self.allowed_pairs.write((token_a, token_b), true);
        self.allowed_pairs.write((token_b, token_a), true);
        self.exchange_rates.write((token_a, token_b), (rate_a, rate_b));
        self.exchange_rates.write((token_b, token_a), (rate_b, rate_a));

        self.emit(Event::RateUpdated(RateUpdated {
            token_a,
            token_b,
            rate_a,
            rate_b,
        }));
    }

    }

    // Attach helper/query methods to ContractState via impl block
    impl LiquidityPool of LiquidityPoolTrait {
        // Removed from here: will be in impl block
        #[external(v0)]
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
            // Simplified: use arithmetic mean
            ((amount_a + amount_b) / 2) + (total_shares / 4)
        }
    }

    // ============================================
    // SWAP (BRIDGE) EXECUTION
    // ============================================

    #[external(v0)]
    fn swap(
        ref self: ContractState,
        from_token: ContractAddress,
        to_token: ContractAddress,
        from_amount: u256,
    ) -> u256 {
        let caller = get_caller_address();

        // STRICT VALIDATION - NO FALLBACK
        assert(from_amount > 0, 'amount must be > 0');
        assert(self.is_pair_allowed(from_token, to_token), 'pair not allowed');

        // Get exchange rate
        let (rate_from, rate_to) = self.exchange_rates.read((from_token, to_token));
        assert(rate_from > 0 && rate_to > 0, 'invalid exchange rate');

        // Calculate output amount
        let to_amount = self._calculate_output(from_amount, rate_from, rate_to);

        // Calculate fee
        let fee_bps = self.fee_bps.read();
        let fee = self._calculate_fee(to_amount, fee_bps);
        let final_amount = to_amount - fee;

        // Check pool has sufficient liquidity
        let to_token_reserve = self.token_reserves.read(to_token);
        assert(final_amount <= to_token_reserve, 'insufficient liquidity');

        // Execute swap
        let from_dispatcher = IERC20Dispatcher { contract_address: from_token };
        from_dispatcher.transfer_from(caller, starknet::get_contract_address(), from_amount);

        // Update reserves
        self.token_reserves.write(
            from_token,
            self.token_reserves.read(from_token) + from_amount,
        );
        self.token_reserves.write(
            to_token,
            self.token_reserves.read(to_token) - final_amount,
        );

        // Transfer output to user
        let to_dispatcher = IERC20Dispatcher { contract_address: to_token };
        to_dispatcher.transfer(caller, final_amount);

        self.emit(Event::SwapExecuted(SwapExecuted {
            from_token,
            to_token,
            from_amount,
            to_amount: final_amount,
            fee,
            user: caller,
        }));

        final_amount
    }

    // ============================================
    // LIQUIDITY MANAGEMENT FOR BRIDGE
    // ============================================

    #[external(v0)]
    fn add_liquidity(
        ref self: ContractState,
        token_a: ContractAddress,
        token_b: ContractAddress,
        amount_a: u256,
        amount_b: u256,
    ) -> u256 {
        let caller = get_caller_address();
        let caller_admin = self.admin.read();
        
        // Only admin can add liquidity (for bridge initialization)
        assert(caller == caller_admin, 'only admin can add liquidity');
        assert(amount_a > 0 && amount_b > 0, 'amounts must be > 0');
        assert(self.is_pair_allowed(token_a, token_b), 'pair not allowed');

        // Transfer tokens to pool
        let dispatcher_a = IERC20Dispatcher { contract_address: token_a };
        let dispatcher_b = IERC20Dispatcher { contract_address: token_b };

        dispatcher_a.transfer_from(caller, starknet::get_contract_address(), amount_a);
        dispatcher_b.transfer_from(caller, starknet::get_contract_address(), amount_b);

        // Update reserves
        self.token_reserves.write(
            token_a,
            self.token_reserves.read(token_a) + amount_a,
        );
        self.token_reserves.write(
            token_b,
            self.token_reserves.read(token_b) + amount_b,
        );

        // Mint LP shares
        let pool_key = (token_a, token_b);
        let total_shares = self.total_lp_shares.read(pool_key);
        
        let shares = if total_shares == 0 {
            amount_a + amount_b  // Initial mint
        } else {
            // Standard AMM calculation
            self._calculate_lp_shares(amount_a, amount_b, total_shares)
        };

        self.lp_shares.write(pool_key, shares);
        self.total_lp_shares.write(pool_key, total_shares + shares);

        self.emit(Event::LiquidityAdded(LiquidityAdded {
            token_a,
            token_b,
            amount_a,
            amount_b,
            lp: caller,
            shares_minted: shares,
        }));

        shares
    }

    #[external(v0)]
    fn remove_liquidity(
        ref self: ContractState,
        token_a: ContractAddress,
        token_b: ContractAddress,
        shares: u256,
    ) {
        let caller = get_caller_address();
        let caller_admin = self.admin.read();
        
        // Only admin can remove liquidity
        assert(caller == caller_admin, 'only admin can remove liquidity');
        assert(shares > 0, 'shares must be > 0');

        let pool_key = (token_a, token_b);
        let lp_balance = self.lp_shares.read(pool_key);
        assert(shares <= lp_balance, 'insufficient shares');

        // Calculate amounts
        let reserve_a = self.token_reserves.read(token_a);
        let reserve_b = self.token_reserves.read(token_b);
        let total_shares = self.total_lp_shares.read(pool_key);

        let amount_a = (reserve_a * shares) / total_shares;
        let amount_b = (reserve_b * shares) / total_shares;

        // Update reserves
        self.token_reserves.write(token_a, reserve_a - amount_a);
        self.token_reserves.write(token_b, reserve_b - amount_b);

        // Burn shares
        self.lp_shares.write(pool_key, lp_balance - shares);
        self.total_lp_shares.write(pool_key, total_shares - shares);

        // Transfer tokens back
        let dispatcher_a = IERC20Dispatcher { contract_address: token_a };
        let dispatcher_b = IERC20Dispatcher { contract_address: token_b };

        dispatcher_a.transfer(caller, amount_a);
        dispatcher_b.transfer(caller, amount_b);

        self.emit(Event::LiquidityRemoved(LiquidityRemoved {
            token_a,
            token_b,
            lp: caller,
            shares_burned: shares,
        }));
    }

    // ============================================
    // QUERY FUNCTIONS
    // ============================================

    #[external(v0)]
    fn get_output_amount(
        self: @ContractState,
        from_token: ContractAddress,
        to_token: ContractAddress,
        from_amount: u256,
    ) -> u256 {
        if !self.is_pair_allowed(from_token, to_token) {
            return 0;
        }

        let (rate_from, rate_to) = self.exchange_rates.read((from_token, to_token));
        if rate_from == 0 || rate_to == 0 {
            return 0;
        }

        let to_amount = self._calculate_output(from_amount, rate_from, rate_to);
        let fee_bps = self.fee_bps.read();
        let fee = self._calculate_fee(to_amount, fee_bps);
        to_amount - fee
    }

    #[external(v0)]
    fn get_pool_reserve(self: @ContractState, token: ContractAddress) -> u256 {
        self.token_reserves.read(token)
    }

    // ============================================
    // INTERNAL HELPERS
    // ============================================

    fn _calculate_output(self: @ContractState, from_amount: u256, rate_from: u256, rate_to: u256) -> u256 {
        (from_amount * rate_to) / rate_from
    }

    fn _calculate_fee(self: @ContractState, amount: u256, fee_bps: u256) -> u256 {
        (amount * fee_bps) / 10000
    }

    fn _calculate_lp_shares(self: @ContractState, amount_a: u256, amount_b: u256, total_shares: u256) -> u256 {
        // Simplified: use arithmetic mean
        ((amount_a + amount_b) / 2) + (total_shares / 4)
    }
}
