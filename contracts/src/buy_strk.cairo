#[starknet::contract]
mod BuyStrkContract {
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    // ============================================
    // LOCAL ERC20 INTERFACE (no openzeppelin dep needed)
    // ============================================

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
        fn transfer_from(
            ref self: TContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool;
        fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    }

    // ============================================
    // STORAGE
    // ============================================

    #[storage]
    struct Storage {
        admin: ContractAddress,
        btc_deposit_rate: u256,      // STRK received per 1 BTC (scaled by 1_000_000)
        strk_reserves: u256,          // Total STRK available to sell
        escrow_contract: ContractAddress,
        allowed_token: ContractAddress, // STRK token address
    }

    // ============================================
    // EVENTS
    // ============================================

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        BuyInitiated: BuyInitiated,
        BuyCompleted: BuyCompleted,
        BuyFailed: BuyFailed,
    }

    #[derive(Drop, starknet::Event)]
    struct BuyInitiated {
        buyer: ContractAddress,
        btc_amount: u256,
        strk_amount: u256,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct BuyCompleted {
        buyer: ContractAddress,
        btc_amount: u256,
        strk_amount: u256,
        escrow_id: felt252,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct BuyFailed {
        buyer: ContractAddress,
        reason: felt252,
        timestamp: u64,
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        btc_rate: u256,
        initial_strk_reserves: u256,
        strk_token_address: ContractAddress,
        escrow_address: ContractAddress,
    ) {
        self.admin.write(admin);
        self.btc_deposit_rate.write(btc_rate);
        self.strk_reserves.write(initial_strk_reserves);
        self.allowed_token.write(strk_token_address);
        self.escrow_contract.write(escrow_address);
    }

    // ============================================
    // CORE: BTC → STRK BRIDGE
    // ============================================

    #[external(v0)]
    fn buy_strk_with_btc(
        ref self: ContractState,
        buyer_address: ContractAddress,
        btc_amount: u256,
        proof_hash: felt252,
        escrow_id: felt252,
    ) -> bool {
        assert(btc_amount > 0, 'BTC amount must be positive');

        let strk_rate = self.btc_deposit_rate.read();
        let strk_to_receive = btc_amount * strk_rate / 1_000_000;

        let current_reserves = self.strk_reserves.read();
        assert(strk_to_receive <= current_reserves, 'Insufficient STRK reserves');

        // Deduct from reserves
        self.strk_reserves.write(current_reserves - strk_to_receive);

        // Transfer STRK to buyer
        let strk_token = IERC20Dispatcher { contract_address: self.allowed_token.read() };
        let success = strk_token.transfer(buyer_address, strk_to_receive);
        assert(success, 'STRK transfer failed');

        self.emit(Event::BuyInitiated(BuyInitiated {
            buyer: buyer_address,
            btc_amount,
            strk_amount: strk_to_receive,
            timestamp: starknet::get_block_timestamp(),
        }));

        true
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    #[external(v0)]
    fn set_btc_rate(ref self: ContractState, new_rate: u256) {
        assert(get_caller_address() == self.admin.read(), 'only admin can set rate');
        self.btc_deposit_rate.write(new_rate);
    }

    #[external(v0)]
    fn add_strk_reserves(ref self: ContractState, amount: u256) {
        let admin = self.admin.read();
        assert(get_caller_address() == admin, 'only admin can add reserves');

        let strk_token = IERC20Dispatcher { contract_address: self.allowed_token.read() };
        let success = strk_token.transfer_from(get_caller_address(), get_contract_address(), amount);
        assert(success, 'Reserve deposit failed');

        let current = self.strk_reserves.read();
        self.strk_reserves.write(current + amount);
    }

    #[external(v0)]
    fn withdraw_strk(ref self: ContractState, amount: u256) {
        let admin = self.admin.read();
        assert(get_caller_address() == admin, 'only admin can withdraw');

        let current = self.strk_reserves.read();
        assert(amount <= current, 'Insufficient reserves');

        let strk_token = IERC20Dispatcher { contract_address: self.allowed_token.read() };
        let success = strk_token.transfer(admin, amount);
        assert(success, 'Withdrawal failed');

        self.strk_reserves.write(current - amount);
    }

    // ============================================
    // QUERY FUNCTIONS
    // ============================================

    #[external(v0)]
    fn get_strk_output(self: @ContractState, btc_amount: u256) -> u256 {
        let rate = self.btc_deposit_rate.read();
        btc_amount * rate / 1_000_000
    }

    #[external(v0)]
    fn get_btc_rate(self: @ContractState) -> u256 {
        self.btc_deposit_rate.read()
    }

    #[external(v0)]
    fn get_strk_reserves(self: @ContractState) -> u256 {
        self.strk_reserves.read()
    }

    #[external(v0)]
    fn get_escrow_contract(self: @ContractState) -> ContractAddress {
        self.escrow_contract.read()
    }
}
