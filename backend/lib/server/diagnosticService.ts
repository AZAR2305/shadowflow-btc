/**
 * Diagnostic Service for OTC Bridge Failures
 * - Analyzes failure patterns
 * - Provides iterative fix suggestions
 * - Searches for external resources (faucets, liquidity sources)
 * - Tracks recurring issues
 */

import { RpcProvider } from 'starknet';

interface DiagnosticIssue {
  id: string;
  timestamp: number;
  category: string;
  error: string;
  sendChain: string;
  receiveChain: string;
  amount: number;
  resolution?: string;
}

interface LiquidityInfo {
  chain: string;
  token: string;
  reserveAmount: string;
  isLow: boolean;
  recommendation: string;
}

interface FaucetResource {
  name: string;
  url: string;
  chains: string[];
  minAmount?: string;
  maxAmount?: string;
  cooldown?: string;
}

export class DiagnosticService {
  private static instance: DiagnosticService;
  private issueHistory: DiagnosticIssue[] = [];
  private rpcProvider: RpcProvider;
  private faucets: FaucetResource[] = [];

  private constructor() {
    const rpcUrl =
      process.env.NEXT_PUBLIC_STARKNET_RPC_URL ||
      process.env.STARKNET_RPC_URL ||
      'https://api.starknet.io';
    this.rpcProvider = new RpcProvider({ nodeUrl: rpcUrl });
    this.initializeFaucets();
  }

  public static getInstance(): DiagnosticService {
    if (!DiagnosticService.instance) {
      DiagnosticService.instance = new DiagnosticService();
    }
    return DiagnosticService.instance;
  }

  /**
   * Initialize known testnet faucets
   */
  private initializeFaucets(): void {
    this.faucets = [
      // Starknet Testnet Faucets
      {
        name: 'Starknet Official Faucet',
        url: 'https://faucet.starknet.io',
        chains: ['strk'],
        minAmount: '0.1',
        maxAmount: '1000',
        cooldown: '12h per address',
      },
      {
        name: 'Braavos Testnet Faucet',
        url: 'https://braavos.app/faucet',
        chains: ['strk'],
        minAmount: '0.1',
        maxAmount: '100',
      },
      {
        name: 'Argent Testnet Faucet',
        url: 'https://argent.xyz/faucet',
        chains: ['strk'],
        minAmount: '0.1',
        maxAmount: '100',
      },
      // Bitcoin Testnet Faucets
      {
        name: 'Bitcoin Testnet Faucet (testnet-faucet.mempool.space)',
        url: 'https://testnet-faucet.mempool.space/',
        chains: ['btc'],
        minAmount: '0.00001',
        maxAmount: '0.5',
        cooldown: '1h per address',
      },
      {
        name: 'Bitcoin Testnet Faucet (bitcoinfaucet.uo1.net)',
        url: 'https://bitcoinfaucet.uo1.net',
        chains: ['btc'],
        minAmount: '0.00001',
        maxAmount: '0.3',
      },
      {
        name: 'Bitcoin Testnet Faucet (coinfaucet.eu)',
        url: 'https://coinfaucet.eu/en/btc-testnet/',
        chains: ['btc'],
        minAmount: '0.0001',
        maxAmount: '0.1',
      },
      // Cross-chain Bridge Faucets
      {
        name: 'Starkware Playground (Testnet)',
        url: 'https://playground.starkware.co',
        chains: ['strk'],
        minAmount: '1',
      },
    ];
  }

  /**
   * Log a diagnostic issue for iteration
   */
  public logIssue(
    category: string,
    error: string,
    sendChain: string,
    receiveChain: string,
    amount: number
  ): void {
    const issue: DiagnosticIssue = {
      id: `issue_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      category,
      error,
      sendChain,
      receiveChain,
      amount,
    };
    this.issueHistory.push(issue);

    // Keep only last 100 issues to avoid memory bloat
    if (this.issueHistory.length > 100) {
      this.issueHistory = this.issueHistory.slice(-100);
    }

    console.log(`[DIAGNOSTIC] Issue logged: ${category}`, {
      id: issue.id,
      error,
      amount,
      chains: `${sendChain} -> ${receiveChain}`,
    });
  }

  /**
   * Resolve an issue with suggested fix
   */
  public resolveIssue(issueId: string, resolution: string): void {
    const issue = this.issueHistory.find(i => i.id === issueId);
    if (issue) {
      issue.resolution = resolution;
      console.log(`[DIAGNOSTIC] Issue resolved: ${issueId}`, { resolution });
    }
  }

  /**
   * Get suggestions for liquidity issues
   */
  public async getLiquiditySuggestions(
    token: string,
    chain: 'btc' | 'strk',
    requiredAmount: number
  ): Promise<{
    currentStatus: LiquidityInfo;
    faucets: FaucetResource[];
    suggestions: string[];
  }> {
    const chainFaucets = this.faucets.filter(f => f.chains.includes(chain));

    const suggestions: string[] = [
      `Fund ${chain.toUpperCase()} account via available faucets`,
      `Minimum required amount: ${requiredAmount} ${token}`,
    ];

    if (chain === 'strk') {
      suggestions.push(
        'For larger amounts, consider the Starkware Playground testnet which provides more generous allocations.',
        'Secondary option: Use multiple faucets with cooldown periods.'
      );
    } else if (chain === 'btc') {
      suggestions.push(
        'Bitcoin testnet faucets have varying limits; use multiple sources if needed.',
        'Testnet BTC value is worthless; you can obtain it freely from faucets.'
      );
    }

    return {
      currentStatus: {
        chain,
        token,
        reserveAmount: 'unknown',
        isLow: true,
        recommendation: `Fund ${chain} account and retry swap.`,
      },
      faucets: chainFaucets,
      suggestions,
    };
  }

  /**
   * Get recurring issue patterns
   */
  public getIssuePatterns(): {
    categoryCount: Record<string, number>;
    commonErrors: string[];
    recentIssues: DiagnosticIssue[];
  } {
    const categoryCount: Record<string, number> = {};
    const errorFreq: Record<string, number> = {};

    this.issueHistory.forEach(issue => {
      categoryCount[issue.category] = (categoryCount[issue.category] || 0) + 1;
      errorFreq[issue.error] = (errorFreq[issue.error] || 0) + 1;
    });

    const commonErrors = Object.entries(errorFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error]) => error);

    return {
      categoryCount,
      commonErrors,
      recentIssues: this.issueHistory.slice(-10),
    };
  }

  /**
   * Generate iteration report for debugging
   */
  public getIterationReport(): {
    totalIssues: number;
    resolved: number;
    unresolved: number;
    patterns: Record<string, unknown>;
    nextSteps: string[];
  } {
    const patterns = this.getIssuePatterns();
    const resolved = this.issueHistory.filter(i => i.resolution).length;
    const unresolved = this.issueHistory.filter(i => !i.resolution).length;

    const nextSteps: string[] = [];
    if (patterns.categoryCount['insufficient_liquidity'] > patterns.categoryCount['other'] || 0) {
      nextSteps.push('Priority: Increase liquidity pool reserves');
    }
    if (patterns.categoryCount['proof_verification_failed'] > 2) {
      nextSteps.push('Investigate: ZK proof generation may have issues');
    }
    if (patterns.categoryCount['network_error'] > 3) {
      nextSteps.push('Check: RPC endpoint availability and stability');
    }
    if (nextSteps.length === 0) {
      nextSteps.push('Continue monitoring for patterns');
    }

    return {
      totalIssues: this.issueHistory.length,
      resolved,
      unresolved,
      patterns,
      nextSteps,
    };
  }

  /**
   * Export diagnostics as JSON for external analysis
   */
  public exportDiagnostics(): {
    timestamp: string;
    issues: DiagnosticIssue[];
    patterns: Record<string, unknown>;
    report: Record<string, unknown>;
  } {
    return {
      timestamp: new Date().toISOString(),
      issues: this.issueHistory,
      patterns: this.getIssuePatterns(),
      report: this.getIterationReport(),
    };
  }
}
