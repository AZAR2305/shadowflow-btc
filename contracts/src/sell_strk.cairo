#[starknet::contract]
mod SellStrkContract {
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
        strk_to_btc_rate: u256,      // BTC satoshis per 1 STRK (scaled by 1_000_000)
        btc_reserves: u256,           // BTC reserves tracked on-chain
        escrow_contract: ContractAddress,
        allowed_token: ContractAddress, // STRK token address
    }

    // ============================================
    // EVENTS
    // ============================================

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SellInitiated: SellInitiated,
        SellCompleted: SellCompleted,
        SellFailed: SellFailed,
    }

    #[derive(Drop, starknet::Event)]
    struct SellInitiated {
        seller: ContractAddress,
        strk_amount: u256,
        btc_amount: u256,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct SellCompleted {
        seller: ContractAddress,
        strk_amount: u256,
        btc_amount: u256,
        btc_recipient: felt252,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct SellFailed {
        seller: ContractAddress,
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
        initial_btc_reserves: u256,
        strk_token_address: ContractAddress,
        escrow_address: ContractAddress,
    ) {
        self.admin.write(admin);
        self.strk_to_btc_rate.write(btc_rate);
        self.btc_reserves.write(initial_btc_reserves);
        self.allowed_token.write(strk_token_address);
        self.escrow_contract.write(escrow_address);
    }

    // ============================================
    // CORE: STRK → BTC BRIDGE
    // ============================================

    #[external(v0)]
    fn sell_strk_for_btc(
        ref self: ContractState,
        seller_address: ContractAddress,
        strk_amount: u256,
        btc_recipient: felt252,
        proof_hash: felt252,
        escrow_id: felt252,
    ) -> bool {
        assert(strk_amount > 0, 'STRK amount must be positive');

        let btc_rate = self.strk_to_btc_rate.read();
        let btc_to_send = strk_amount * btc_rate / 1_000_000;

        let current_btc_reserves = self.btc_reserves.read();
        assert(btc_to_send <= current_btc_reserves, 'Insufficient BTC reserves');

        // Pull STRK from seller
        let strk_token = IERC20Dispatcher { contract_address: self.allowed_token.read() };
        let success = strk_token.transfer_from(seller_address, get_contract_address(), strk_amount);
        assert(success, 'STRK transfer in failed');

        // Deduct BTC reserves (actual BTC transfer happens off-chain via escrow)
        self.btc_reserves.write(current_btc_reserves - btc_to_send);

        self.emit(Event::SellInitiated(SellInitiated {
            seller: seller_address,
            strk_amount,
            btc_amount: btc_to_send,
            timestamp: starknet::get_block_timestamp(),
        }));

        true
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    #[external(v0)]
    fn set_strk_to_btc_rate(ref self: ContractState, new_rate: u256) {
        assert(get_caller_address() == self.admin.read(), 'only admin can set rate');
        self.strk_to_btc_rate.write(new_rate);
    }

    #[external(v0)]
    fn add_btc_reserve(ref self: ContractState, amount: u256) {
        assert(get_caller_address() == self.admin.read(), 'only admin can add reserves');
        let current = self.btc_reserves.read();
        self.btc_reserves.write(current + amount);
    }

    #[external(v0)]
    fn remove_btc_reserve(ref self: ContractState, amount: u256) {
        assert(get_caller_address() == self.admin.read(), 'only admin can remove reserves');
        let current = self.btc_reserves.read();
        assert(amount <= current, 'Amount exceeds reserves');
        self.btc_reserves.write(current - amount);
    }

    #[external(v0)]
    fn withdraw_strk(ref self: ContractState, amount: u256) {
        let admin = self.admin.read();
        assert(get_caller_address() == admin, 'only admin can withdraw');

        let strk_token = IERC20Dispatcher { contract_address: self.allowed_token.read() };
        let success = strk_token.transfer(admin, amount);
        assert(success, 'STRK withdrawal failed');
    }

    // ============================================
    // QUERY FUNCTIONS
    // ============================================

    #[external(v0)]
    fn get_btc_output(self: @ContractState, strk_amount: u256) -> u256 {
        let rate = self.strk_to_btc_rate.read();
        strk_amount * rate / 1_000_000
    }

    #[external(v0)]
    fn get_strk_to_btc_rate(self: @ContractState) -> u256 {
        self.strk_to_btc_rate.read()
    }

    #[external(v0)]
    fn get_btc_reserves(self: @ContractState) -> u256 {
        self.btc_reserves.read()
    }

    #[external(v0)]
    fn get_escrow_contract(self: @ContractState) -> ContractAddress {
        self.escrow_contract.read()
    }
}
