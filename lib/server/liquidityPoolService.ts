/**
 * Liquidity Pool Service
 * Manages cross-chain liquidity for BTC ↔ STRK swaps
 * Tracks reserves, calculates exchange rates, executes swaps
 */

export interface PoolReserves {
  btcReserve: string;  // BTC locked in pool
  strkReserve: string; // STRK locked in pool
  totalShares: string; // LP tokens issued
  feePercentage: number; // Swap fee (e.g., 0.3%)
}

export interface SwapExecution {
  id: string;
  fromToken: 'btc' | 'strk';
  toToken: 'btc' | 'strk';
  inputAmount: string;
  outputAmount: string;
  executionPrice: number;
  feeAmount: string;
  slippage: number;
  timestamp: number;
  status: 'pending' | 'executed' | 'failed';
  transactionHash: string;
}

export class LiquidityPoolService {
  private static instance: LiquidityPoolService;
  
  // Pool state (in production, stored on-chain)
  private btcReserve: bigint = BigInt(10 * 100_000_000);     // 10 BTC in satoshis
  private strkReserve: bigint = BigInt(500_000_000_000_000); // 500M STRK
  private totalShares: bigint = BigInt(100_000_000);         // 100M LP tokens
  
  private swapHistory: Map<string, SwapExecution> = new Map();
  private readonly FEE_PERCENTAGE = 0.003; // 0.3% swap fee
  private readonly K_CONSTANT: bigint = this.calculateK();

  private constructor() {}

  public static getInstance(): LiquidityPoolService {
    if (!LiquidityPoolService.instance) {
      LiquidityPoolService.instance = new LiquidityPoolService();
    }
    return LiquidityPoolService.instance;
  }

  /**
   * Get current pool reserves and exchange rate
   * Uses constant product formula: x * y = k
   */
  public getPoolState(): PoolReserves {
    return {
      btcReserve: this.btcReserve.toString(),
      strkReserve: this.strkReserve.toString(),
      totalShares: this.totalShares.toString(),
      feePercentage: this.FEE_PERCENTAGE * 100,
    };
  }

  /**
   * Calculate output amount for a given input (with slippage)
   * Formula: outputAmount = (inputAmount * feeAdjusted * strkReserve) / (btcReserve + inputAmount * feeAdjusted)
   */
  public calculateSwapOutput(
    inputAmount: string,
    fromToken: 'btc' | 'strk',
  ): { outputAmount: string; executionPrice: number; slippage: number } {
    try {
      const inputBig = BigInt(inputAmount);
      
      // Apply fee
      const feeAmount = (inputBig * BigInt(Math.floor(this.FEE_PERCENTAGE * 1_000_000))) / BigInt(1_000_000);
      const inputAfterFee = inputBig - feeAmount;

      let outputAmount: bigint;
      let price: number;

      if (fromToken === 'btc') {
        // BTC → STRK
        // outSTRK = (inputBTC * strkReserve) / (btcReserve + inputBTC)
        outputAmount = (inputAfterFee * this.strkReserve) / (this.btcReserve + inputAfterFee);
        price = Number(this.strkReserve) / Number(this.btcReserve);
      } else {
        // STRK → BTC
        // outBTC = (inputSTRK * btcReserve) / (strkReserve + inputSTRK)
        outputAmount = (inputAfterFee * this.btcReserve) / (this.strkReserve + inputAfterFee);
        price = Number(this.btcReserve) / Number(this.strkReserve);
      }

      // Calculate slippage
      const spotPrice = fromToken === 'btc'
        ? Number(this.strkReserve) / Number(this.btcReserve)
        : Number(this.btcReserve) / Number(this.strkReserve);
      
      const executionPrice = Number(outputAmount) / Number(inputBig);
      const slippage = Math.abs(executionPrice - spotPrice) / spotPrice;

      return {
        outputAmount: outputAmount.toString(),
        executionPrice: price,
        slippage,
      };
    } catch (error) {
      console.error('Calculation error:', error);
      throw new Error('Failed to calculate swap output');
    }
  }

  /**
   * Execute a swap with atomic updates
   * Transfers are mocked here; in production, call smart contracts
   */
  public async executeSwap(
    inputAmount: string,
    fromToken: 'btc' | 'strk',
    senderWallet: string,
    receiverWallet: string,
  ): Promise<SwapExecution> {
    try {
      const swapId = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;

      // Calculate output
      const { outputAmount, executionPrice, slippage } = this.calculateSwapOutput(
        inputAmount,
        fromToken,
      );

      const inputBig = BigInt(inputAmount);
      const outputBig = BigInt(outputAmount);

      // Check pool has enough liquidity
      if (fromToken === 'btc' && outputBig > this.strkReserve) {
        throw new Error('Insufficient STRK liquidity in pool');
      }
      if (fromToken === 'strk' && outputBig > this.btcReserve) {
        throw new Error('Insufficient BTC liquidity in pool');
      }

      // Fee calculation
      const feeAmount = (inputBig * BigInt(Math.floor(this.FEE_PERCENTAGE * 1_000_000))) / BigInt(1_000_000);

      // Atomic update: update reserves
      if (fromToken === 'btc') {
        this.btcReserve += inputBig;
        this.strkReserve -= outputBig;
      } else {
        this.strkReserve += inputBig;
        this.btcReserve -= outputBig;
      }

      // Verify constant product maintained (within tolerance for fees)
      const newK = this.btcReserve * this.strkReserve;
      if (newK < this.K_CONSTANT) {
        throw new Error('Pool constant product violated');
      }

      const execution: SwapExecution = {
        id: swapId,
        fromToken,
        toToken: fromToken === 'btc' ? 'strk' : 'btc',
        inputAmount,
        outputAmount,
        executionPrice,
        feeAmount: feeAmount.toString(),
        slippage,
        timestamp: Date.now(),
        status: 'executed',
        transactionHash: `0x${Math.random().toString(16).slice(2, 66)}`,
      };

      this.swapHistory.set(swapId, execution);

      console.log(`💱 Swap executed: ${inputAmount} ${fromToken.toUpperCase()} → ${outputAmount} ${fromToken === 'btc' ? 'STRK' : 'BTC'}`);
      
      return execution;
    } catch (error) {
      console.error('Swap execution error:', error);
      throw error;
    }
  }

  /**
   * Add liquidity to the pool
   * In production, mint LP tokens and transfer to user
   */
  public async addLiquidity(
    btcAmount: string,
    strkAmount: string,
    depositorWallet: string,
  ): Promise<{ lpTokens: string; transactionHash: string }> {
    try {
      const btcBig = BigInt(btcAmount);
      const strkBig = BigInt(strkAmount);

      // Calculate LP tokens to mint
      // lpTokens = min(btcAmount / btcReserve, strkAmount / strkReserve) * totalShares
      const btcRatio = (btcBig * this.totalShares) / this.btcReserve;
      const strkRatio = (strkBig * this.totalShares) / this.strkReserve;
      const lpTokens = btcRatio < strkRatio ? btcRatio : strkRatio;

      // Update reserves
      this.btcReserve += btcBig;
      this.strkReserve += strkBig;
      this.totalShares += lpTokens;

      console.log(`💰 Liquidity added: ${btcAmount} BTC + ${strkAmount} STRK → ${lpTokens} LP tokens`);

      return {
        lpTokens: lpTokens.toString(),
        transactionHash: `0x${Math.random().toString(16).slice(2, 66)}`,
      };
    } catch (error) {
      console.error('Add liquidity error:', error);
      throw error;
    }
  }

  /**
   * Remove liquidity from the pool
   */
  public async removeLiquidity(
    lpTokenAmount: string,
    removerWallet: string,
  ): Promise<{ btcAmount: string; strkAmount: string; transactionHash: string }> {
    try {
      const lpBig = BigInt(lpTokenAmount);

      // Calculate amounts to return
      // btcAmount = (lpTokens / totalShares) * btcReserve
      const btcAmount = (lpBig * this.btcReserve) / this.totalShares;
      const strkAmount = (lpBig * this.strkReserve) / this.totalShares;

      // Update reserves
      this.btcReserve -= btcAmount;
      this.strkReserve -= strkAmount;
      this.totalShares -= lpBig;

      console.log(`💸 Liquidity removed: ${lpTokenAmount} LP tokens → ${btcAmount} BTC + ${strkAmount} STRK`);

      return {
        btcAmount: btcAmount.toString(),
        strkAmount: strkAmount.toString(),
        transactionHash: `0x${Math.random().toString(16).slice(2, 66)}`,
      };
    } catch (error) {
      console.error('Remove liquidity error:', error);
      throw error;
    }
  }

  /**
   * Get swap history for a wallet
   */
  public getSwapHistory(limit: number = 50): SwapExecution[] {
    const history = Array.from(this.swapHistory.values()).sort((a, b) => b.timestamp - a.timestamp);
    return history.slice(0, limit);
  }

  /**
   * Calculate constant product k = x * y
   */
  private calculateK(): bigint {
    return this.btcReserve * this.strkReserve;
  }

  /**
   * Clear pool (testing only)
   */
  public resetPool(): void {
    this.btcReserve = BigInt(10 * 100_000_000);
    this.strkReserve = BigInt(500_000_000_000_000);
    this.totalShares = BigInt(100_000_000);
    this.swapHistory.clear();
    console.log('🔄 Pool reset to initial state');
  }
}
