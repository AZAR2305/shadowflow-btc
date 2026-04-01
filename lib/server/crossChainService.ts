import { hash } from "starknet";

export type ChainType = "btc" | "strk";

export interface CrossChainTransaction {
  txHash: string;
  chain: ChainType;
  timestamp: number;
  type: "intent" | "escrow" | "settlement";
  amount: number;
  walletAddress: string;
  status: "pending" | "confirmed" | "failed";
}

export interface EscrowRecord {
  escrowId: string;
  matchId: string;
  participantWallet: string;
  chain: ChainType;
  amount: number;
  escrowAddress: string;
  txHash: string;
  status: "pending" | "confirmed" | "released";
  createdAt: number;
  confirmedAt?: number;
  releasedAt?: number;
}

export interface SettlementTransfer {
  settlementId: string;
  matchId: string;
  fromWallet: string;
  toWallet: string;
  fromChain: ChainType;
  toChain: ChainType;
  amount: number;
  txHash: string;
  status: "pending" | "completed" | "failed";
  createdAt: number;
  completedAt?: number;
}

export class CrossChainService {
  /**
   * Generate a realistic on-chain intent hash
   * In production, this would be the actual transaction hash from creating intent on chain
   */
  static generateOnChainIntentHash(
    walletAddress: string,
    direction: "buy" | "sell",
    amount: number,
    sendChain: ChainType,
    receiveChain: ChainType,
    receiveWalletAddress: string,
  ): string {
    try {
      // Create a deterministic hash based on intent parameters
      const intentData = [
        `0x${Buffer.from(`intent:${walletAddress}`).toString("hex").slice(0, 60) || "0"}`,
        `0x${Math.round(amount * 100_000_000).toString(16)}`,
        direction === "buy" ? "0x1" : "0x2",
        sendChain === "btc" ? "0xB7C" : "0xSTRK",
        receiveChain === "btc" ? "0xB7C" : "0xSTRK",
        `0x${Buffer.from(receiveWalletAddress).toString("hex").slice(0, 60) || "0"}`,
      ];

      const hashResult = hash.computePoseidonHashOnElements(
        intentData.map((x) => (typeof x === "string" ? BigInt(x) : x)),
      );

      // Convert bigint to hex string
      const hashHex = (BigInt(hashResult)).toString(16);
      const timeHex = Date.now().toString(16);
      const paddedTime = timeHex.length < 8 ? "0".repeat(8 - timeHex.length) + timeHex : timeHex;
      return `0x${paddedTime}${hashHex.slice(Math.max(0, hashHex.length - 24))}`;
    } catch (error) {
      throw new Error(`Failed to generate intent transaction hash: ${error}`);
    }
  }

  /**
   * Generate escrow transaction hash
   * This represents the transaction that moves funds from user to escrow contract
   */
  static generateEscrowTransactionHash(
    matchId: string,
    walletAddress: string,
    amount: number,
    chain: ChainType,
  ): string {
    try {
      const escrowData = [
        `0x${Buffer.from(`escrow:${matchId}`).toString("hex").slice(0, 60) || "0"}`,
        `0x${Buffer.from(walletAddress).toString("hex").slice(0, 60) || "0"}`,
        `0x${Math.round(amount * 100_000_000).toString(16)}`,
        chain === "btc" ? "0xB7C" : "0xSTRK",
      ];

      const hashResult = hash.computePoseidonHashOnElements(
        escrowData.map((x) => (typeof x === "string" ? BigInt(x) : x)),
      );

      const hashHex = (BigInt(hashResult)).toString(16);
      const timeHex = Date.now().toString(16);
      const paddedTime = timeHex.length < 8 ? "0".repeat(8 - timeHex.length) + timeHex : timeHex;
      return `0x${paddedTime}${hashHex.slice(Math.max(0, hashHex.length - 24))}`;
    } catch (error) {
      throw new Error(`Failed to generate escrow transaction hash: ${error}`);
    }
  }

  /**
   * Generate settlement transaction hash
   * This represents the final transfer from escrow to destination wallet
   */
  static generateSettlementTransactionHash(
    matchId: string,
    fromWallet: string,
    toWallet: string,
    amount: number,
    destinationChain: ChainType,
  ): string {
    try {
      const settlementData = [
        `0x${Buffer.from(`settlement:${matchId}`).toString("hex").slice(0, 60) || "0"}`,
        `0x${Buffer.from(fromWallet).toString("hex").slice(0, 60) || "0"}`,
        `0x${Buffer.from(toWallet).toString("hex").slice(0, 60) || "0"}`,
        `0x${Math.round(amount * 100_000_000).toString(16)}`,
        destinationChain === "btc" ? "0xB7C" : "0xSTRK",
      ];

      const hashResult = hash.computePoseidonHashOnElements(
        settlementData.map((x) => (typeof x === "string" ? BigInt(x) : x)),
      );

      const hashHex = (BigInt(hashResult)).toString(16);
      const timeHex = Date.now().toString(16);
      const paddedTime = timeHex.length < 8 ? "0".repeat(8 - timeHex.length) + timeHex : timeHex;
      return `0x${paddedTime}${hashHex.slice(Math.max(0, hashHex.length - 24))}`;
    } catch (error) {
      throw new Error(`Failed to generate settlement transaction hash: ${error}`);
    }
  }

  /**
   * Validate a wallet address for the specified chain
   */
  static validateWalletAddress(address: string, chain: ChainType): boolean {
    if (!address || address.trim().length === 0) return false;

    if (chain === "btc") {
      // Bitcoin address validation: mainnet (bc1, 1, 3) + testnet (tb1, m, n, 2)
      return /^(bc1|tb1|[13mn2])[a-zA-HJ-NP-Z0-9]{20,80}$/.test(address);
    } else {
      // Starknet address validation (0x + hex, 40-66 chars)
      return /^0x[0-9a-fA-F]{10,66}$/.test(address);
    }
  }

  /**
   * Get chain-specific escrow contract address
   */
  static getEscrowContractAddress(chain: ChainType): string {
    if (chain === "btc") {
      return process.env.NEXT_PUBLIC_BTC_ESCROW_ADDRESS || "bc1qbtc_escrow_contract";
    } else {
      return (
        process.env.NEXT_PUBLIC_STRK_ESCROW_ADDRESS ||
        "0x0000000000000000000000000000000000000strk_escrow"
      );
    }
  }

  /**
   * Create settlement routing plan
   * Routes buyer's sent amount to seller's receive wallet on seller's receive chain
   * Routes seller's sent amount to buyer's receive wallet on buyer's receive chain
   */
  static createSettlementRoutingPlan(
    buyerWallet: string,
    sellerWallet: string,
    buyerSendChain: ChainType,
    buyerReceiveChain: ChainType,
    buyerReceiveWallet: string,
    sellerSendChain: ChainType,
    sellerReceiveChain: ChainType,
    sellerReceiveWallet: string,
    amount: number,
  ): {
    buyerSettlement: SettlementTransfer;
    sellerSettlement: SettlementTransfer;
  } {
    const now = Date.now();
    const settlementId = `settlement-${now}-${Math.random().toString(16).slice(2, 8)}`;

    // Buyer sends from their sendChain to seller's receiveWallet on their receiveChain
    const buyerSettlement: SettlementTransfer = {
      settlementId: `${settlementId}-buyer`,
      matchId: "", // Will be set by caller
      fromWallet: buyerWallet,
      toWallet: sellerReceiveWallet, // Seller receives here
      fromChain: buyerSendChain, // Buyer sends from this chain
      toChain: sellerReceiveChain, // To this chain (seller's receive chain)
      amount,
      txHash: "", // Will be set by caller
      status: "pending",
      createdAt: now,
    };

    // Seller sends from their sendChain to buyer's receiveWallet on their receiveChain
    const sellerSettlement: SettlementTransfer = {
      settlementId: `${settlementId}-seller`,
      matchId: "", // Will be set by caller
      fromWallet: sellerWallet,
      toWallet: buyerReceiveWallet, // Buyer receives here
      fromChain: sellerSendChain, // Seller sends from this chain
      toChain: buyerReceiveChain, // To this chain (buyer's receive chain)
      amount,
      txHash: "", // Will be set by caller
      status: "pending",
      createdAt: now,
    };

    return { buyerSettlement, sellerSettlement };
  }

  /**
   * Get human-readable transaction info for UI display
   */
  static formatTransactionInfo(
    txHash: string,
    chain: ChainType,
    type: "intent" | "escrow" | "settlement",
    amount?: number,
  ): string {
    const typeLabel = {
      intent: "Intent Created",
      escrow: "Escrow Deposited",
      settlement: "Settlement Transferred",
    };

    const chainLabel = chain === "btc" ? "Bitcoin" : "Starknet";
    const amountStr = amount ? ` (${amount.toFixed(4)} ${chain.toUpperCase()})` : "";

    return `${typeLabel[type]} on ${chainLabel}${amountStr}: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
  }

  /**
   * Simulate on-chain settlement execution
   * In production, this would make actual RPC calls to settlement contracts
   */
  static async executeSettlementOnChain(
    buyerSettlement: SettlementTransfer,
    sellerSettlement: SettlementTransfer,
  ): Promise<{ success: boolean; buyerTxHash: string; sellerTxHash: string }> {
    // Validate wallet addresses
    if (!this.validateWalletAddress(buyerSettlement.toWallet, buyerSettlement.toChain)) {
      throw new Error(`Invalid buyer destination wallet address for ${buyerSettlement.toChain}`);
    }

    if (!this.validateWalletAddress(sellerSettlement.toWallet, sellerSettlement.toChain)) {
      throw new Error(`Invalid seller destination wallet address for ${sellerSettlement.toChain}`);
    }

    // Generate transaction hashes for settlement
    const buyerTxHash = this.generateSettlementTransactionHash(
      buyerSettlement.matchId,
      buyerSettlement.fromWallet,
      buyerSettlement.toWallet,
      buyerSettlement.amount,
      buyerSettlement.toChain,
    );

    const sellerTxHash = this.generateSettlementTransactionHash(
      sellerSettlement.matchId,
      sellerSettlement.fromWallet,
      sellerSettlement.toWallet,
      sellerSettlement.amount,
      sellerSettlement.toChain,
    );

    // In production, would actually call:
    // - BTC RPC for buyer settlement if buyerSettlement.toChain === "btc"
    // - Starknet RPC for seller settlement if sellerSettlement.toChain === "strk"
    // - and vice versa

    return {
      success: true,
      buyerTxHash,
      sellerTxHash,
    };
  }
}
