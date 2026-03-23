#[starknet::contract]
mod ShadowFlow {
    use starknet::ContractAddress;
    use starknet::storage::LegacyMap;

    #[storage]
    struct Storage {
        commitments: LegacyMap<ContractAddress, felt252>,
        final_states: LegacyMap<ContractAddress, felt252>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        StrategyCommitted: StrategyCommitted,
        ExecutionVerified: ExecutionVerified,
    }

    #[derive(Drop, starknet::Event)]
    struct StrategyCommitted {
        user: ContractAddress,
        commitment: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct ExecutionVerified {
        user: ContractAddress,
        final_state_hash: felt252,
    }

    #[external(v0)]
    fn store_commitment(ref self: ContractState, commitment: felt252) {
        let caller = starknet::get_caller_address();
        self.commitments.write(caller, commitment);
        self.emit(Event::StrategyCommitted(StrategyCommitted { user: caller, commitment }));
    }

    #[external(v0)]
    fn verify_and_store(ref self: ContractState, proof_hash: felt252, final_state_hash: felt252) {
        assert(proof_hash != 0, 'proof_hash must not be zero');
        let caller = starknet::get_caller_address();
        self.final_states.write(caller, final_state_hash);
        self.emit(Event::ExecutionVerified(ExecutionVerified { user: caller, final_state_hash }));
    }

    #[view]
    fn get_commitment(self: @ContractState, user: ContractAddress) -> felt252 {
        self.commitments.read(user)
    }
}
