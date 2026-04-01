/**
 * Escrow Contract Service
 * Manages deposit and withdrawal logic for cross-chain OTC settlements
 * Coordinates between Bitcoin and Starknet escrow contracts
 */

export interface EscrowBalance {
  chain: 'btc' | 'strk';
  walletAddress: string;
  deposit: string; // Amount locked in escrow
  locked: boolean;
  escrowHash: string;
  depositTime: number;
  unlockTime?: number;
  status: 'pending' | 'confirmed' | 'released' | 'refunded';
}

export interface EscrowTransaction {
  transactionHash: string;
  chain: 'btc' | 'strk';
  walletAddress: string;
  amount: string;
  type: 'deposit' | 'withdraw' | 'release';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  blockHeight?: number;
  confirmations?: number;
}

export class EscrowContractService {
  private static instance: EscrowContractService;
  private escrowBalances: Map<string, EscrowBalance> = new Map();
  private transactions: EscrowTransaction[] = [];

  private constructor() {}

  public static getInstance(): EscrowContractService {
    if (!EscrowContractService.instance) {
      EscrowContractService.instance = new EscrowContractService();
    }
    return EscrowContractService.instance;
  }

  /**
   * Deposit amount into escrow for a chain
   * @param amount Amount to deposit
   * @param chain Target blockchain
   * @param walletAddress Wallet address
   * @param escrowHash Hash from ZK proof
   * @returns Transaction details
   */
  public async depositToEscrow(
    amount: string,
    chain: 'btc' | 'strk',
    walletAddress: string,
    escrowHash: string
  ): Promise<EscrowTransaction> {
    try {
      // Validate inputs
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Invalid deposit amount');
      }

      const key = `${chain}:${walletAddress}`;
      const existingBalance = this.escrowBalances.get(key);

      if (existingBalance && existingBalance.locked) {
        throw new Error('Wallet already has locked funds in escrow');
      }

      // Create transaction
      const tx: EscrowTransaction = {
        transactionHash: this.generateTxHash(chain),
        chain,
        walletAddress,
        amount,
        type: 'deposit',
        status: 'pending',
        timestamp: Date.now(),
      };

      // Store transaction
      this.transactions.push(tx);

      // Update balance
      const balance: EscrowBalance = {
        chain,
        walletAddress,
        deposit: amount,
        locked: true,
        escrowHash,
        depositTime: Date.now(),
        status: 'pending',
      };
      this.escrowBalances.set(key, balance);

      // Simulate confirmation after 2 seconds
      setTimeout(() => {
        tx.status = 'confirmed';
        tx.confirmations = chain === 'btc' ? 1 : 0;
        if (this.escrowBalances.has(key)) {
          const bal = this.escrowBalances.get(key)!;
          bal.status = 'confirmed';
        }
      }, 2000);

      console.log(`📦 Escrow deposit initiated: ${amount} ${chain.toUpperCase()} from ${walletAddress}`);
      return tx;
    } catch (error) {
      console.error('Escrow deposit error:', error);
      throw error;
    }
  }

  /**
   * Release funds from escrow after settlement confirmation
   * @param chain Blockchain
   * @param walletAddress Recipient wallet
   * @param amount Amount to release
   * @param releaseHash Settlement transaction hash
   * @returns Release transaction
   */
  public async releaseFromEscrow(
    chain: 'btc' | 'strk',
    walletAddress: string,
    amount: string,
    _releaseHash: string
  ): Promise<EscrowTransaction> {
    try {
      // In this mocked service we don't use the settlement release hash, but we keep it
      // to match the real integration signature.
      void _releaseHash;
      const key = `${chain}:${walletAddress}`;
      const escrow = this.escrowBalances.get(key);

      if (!escrow || !escrow.locked) {
        throw new Error('No locked escrow found for wallet');
      }

      if (parseFloat(escrow.deposit) < parseFloat(amount)) {
        throw new Error('Insufficient escrow balance');
      }

      // Create release transaction
      const tx: EscrowTransaction = {
        transactionHash: this.generateTxHash(chain),
        chain,
        walletAddress,
        amount,
        type: 'release',
        status: 'pending',
        timestamp: Date.now(),
      };

      this.transactions.push(tx);

      // Update escrow status
      escrow.status = 'released';
      escrow.locked = false;
      escrow.unlockTime = Date.now();

      // Simulate confirmation
      setTimeout(() => {
        tx.status = 'confirmed';
        if (this.escrowBalances.has(key)) {
          const bal = this.escrowBalances.get(key)!;
          bal.status = 'released';
        }
      }, 1500);

      console.log(`✅ Escrow released: ${amount} ${chain.toUpperCase()} to ${walletAddress}`);
      return tx;
    } catch (error) {
      console.error('Escrow release error:', error);
      throw error;
    }
  }

  /**
   * Refund escrow in case of failed settlement
   * @param chain Blockchain
   * @param walletAddress Wallet to refund
   * @returns Refund transaction
   */
  public async refundEscrow(
    chain: 'btc' | 'strk',
    walletAddress: string
  ): Promise<EscrowTransaction> {
    try {
      const key = `${chain}:${walletAddress}`;
      const escrow = this.escrowBalances.get(key);

      if (!escrow || !escrow.locked) {
        throw new Error('No escrow found for refund');
      }

      // Create refund transaction
      const tx: EscrowTransaction = {
        transactionHash: this.generateTxHash(chain),
        chain,
        walletAddress,
        amount: escrow.deposit,
        type: 'withdraw',
        status: 'pending',
        timestamp: Date.now(),
      };

      this.transactions.push(tx);

      // Update escrow
      escrow.status = 'refunded';
      escrow.locked = false;
      escrow.unlockTime = Date.now();

      // Simulate confirmation
      setTimeout(() => {
        tx.status = 'confirmed';
      }, 1500);

      console.log(`↩️  Escrow refunded: ${escrow.deposit} ${chain.toUpperCase()} to ${walletAddress}`);
      return tx;
    } catch (error) {
      console.error('Escrow refund error:', error);
      throw error;
    }
  }

  /**
   * Get current escrow balance for wallet
   * @param chain Blockchain
   * @param walletAddress Wallet address
   * @returns Escrow balance or null
   */
  public getEscrowBalance(
    chain: 'btc' | 'strk',
    walletAddress: string
  ): EscrowBalance | null {
    const key = `${chain}:${walletAddress}`;
    return this.escrowBalances.get(key) || null;
  }

  /**
   * Get all escrow balances for a wallet across chains
   * @param walletAddress Wallet address
   * @returns Array of escrow balances
   */
  public getWalletEscrows(walletAddress: string): EscrowBalance[] {
    const escrows: EscrowBalance[] = [];
    for (const [key, balance] of this.escrowBalances) {
      if (key.includes(walletAddress)) {
        escrows.push(balance);
      }
    }
    return escrows;
  }

  /**
   * Get transaction history
   * @param filters Optional filters
   * @returns Array of transactions
   */
  public getTransactionHistory(filters?: {
    chain?: 'btc' | 'strk';
    walletAddress?: string;
    type?: 'deposit' | 'withdraw' | 'release';
    status?: 'pending' | 'confirmed' | 'failed';
  }): EscrowTransaction[] {
    let results = [...this.transactions];

    if (filters?.chain) {
      results = results.filter(tx => tx.chain === filters.chain);
    }
    if (filters?.walletAddress) {
      results = results.filter(tx => tx.walletAddress === filters.walletAddress);
    }
    if (filters?.type) {
      results = results.filter(tx => tx.type === filters.type);
    }
    if (filters?.status) {
      results = results.filter(tx => tx.status === filters.status);
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate transaction hash
   * Format: 0x[8-char timestamp][24-char random]
   * @param chain Blockchain type
   * @returns Transaction hash
   */
  private generateTxHash(chain: 'btc' | 'strk'): string {
    const timestamp = Date.now().toString(16).padStart(8, '0');
    const random = Math.random().toString(16).slice(2, 26).padEnd(24, '0');
    const chainTag = chain === 'btc' ? 'b' : 's';
    return `0x${chainTag}${timestamp}${random}`;
  }

  /**
   * Clear all escrow data (for testing)
   */
  public clearAll(): void {
    this.escrowBalances.clear();
    this.transactions = [];
    console.log('🗑️  Escrow service cleared');
  }
}
