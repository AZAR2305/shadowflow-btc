/**
 * Example: Integrating Transaction Hash Display in Swap Matching Interface
 * 
 * This file shows how to use the new transaction display components
 * in your matching and execution flow.
 */

import { MatchTransactions } from '@/components/transaction/MatchTransactions';
import { IntentExecutionDisplay, type IntentExecutionResult } from '@/components/transaction/IntentExecutionDisplay';
import type { OtcMatchRecord } from '@/types';

/**
 * Example 1: Display matched trades with transaction hashes
 */
export function MatchedTradesDisplay({ matches }: { matches: OtcMatchRecord[] }) {
  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-bold">Your Matched Trades</h2>
      
      {matches.length === 0 ? (
        <p className="text-muted">No matched trades yet. Create an intent to get started.</p>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <MatchTransactions
              key={match.id}
              match={match}
              userRole={match.buyerWallet === currentUserAddress ? "buyer" : "seller"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: Display execution result from intent submission
 */
export function IntentExecutionFlow() {
  const [submitting, setSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<IntentExecutionResult | null>(null);

  const handleSubmitIntent = async (intentData: any) => {
    setSubmitting(true);
    
    try {
      // Step 1: Validate intent with ZK proof
      const validateResponse = await fetch('/api/otc/intents', {
        method: 'POST',
        body: JSON.stringify({
          ...intentData,
          step: 'validate'
        })
      });

      const validateResult = await validateResponse.json();
      
      // Show ZK proof validation
      setExecutionResult({
        step: 'validate',
        status: 'completed',
        message: 'ZK proof verified',
        walletSignatureVerified: '✓'
      });

      // Step 2: User signs with wallet (happens in wallet UI)
      const signature = await window.starknet?.account?.signMessage({...});

      // Step 3: Execute with signature
      const executeResponse = await fetch('/api/otc/intents', {
        method: 'POST',
        body: JSON.stringify({
          ...intentData,
          step: 'execute',
          signature,
          intentId: validateResult.intentId
        })
      });

      const executeResult = await executeResponse.json();
      
      // Show execution result with transaction hash
      setExecutionResult({
        step: 'execute',
        status: 'completed',
        intentId: executeResult.intentId,
        transactionHash: executeResult.transactionHash,
        message: 'Intent executed successfully!',
        walletSignatureVerified: '✓'
      });

    } catch (error) {
      setExecutionResult({
        step: 'execute',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Execution failed'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Submit Intent</h2>
      
      <form onSubmit={(e) => {
        e.preventDefault();
        handleSubmitIntent({/* form data */});
      }}>
        {/* Form fields here */}
        <button type="submit" disabled={submitting}>
          Submit Intent
        </button>
      </form>

      {/* Display execution result with transaction hash */}
      <IntentExecutionDisplay
        result={executionResult}
        loading={submitting}
      />
    </div>
  );
}

/**
 * Example 3: Display transaction in a modal or panel
 */
export function TransactionDetailsPanel({ transactionHash, chain }: {
  transactionHash: string;
  chain: 'btc' | 'strk';
}) {
  const [copied, setCopied] = useState(false);

  const explorerUrl = chain === 'btc'
    ? `https://blockstream.info/testnet/tx/${transactionHash}`
    : `https://sepolia.starkscan.co/tx/${transactionHash}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transactionHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-surface/30 p-4">
      <h3 className="font-semibold">Transaction Details</h3>
      
      <div className="rounded bg-surface/50 p-3">
        <code className="text-xs font-code text-cyan-400 break-all">
          {transactionHash}
        </code>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded text-sm font-semibold"
        >
          {copied ? '✓ Copied' : 'Copy Hash'}
        </button>
        
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded text-sm font-semibold text-center"
        >
          View in Explorer →
        </a>
      </div>
    </div>
  );
}

/**
 * Example 4: Integrate into existing form with real-time updates
 */
export function EnhancedSwapForm() {
  const [loading, setLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState<IntentExecutionResult | null>(null);

  const onFormSubmit = async (formData: any) => {
    setLoading(true);
    setExecutionResult({ step: 'processing', status: 'processing' });

    try {
      // Your existing form submission logic
      const response = await submitIntentForm(formData);
      
      setExecutionResult({
        step: 'execute',
        status: 'completed',
        transactionHash: response.transactionHash,
        intentId: response.intentId,
        walletSignatureVerified: '✓',
        message: 'Swap completed successfully!'
      });

    } catch (error) {
      setExecutionResult({
        step: 'execute',
        status: 'failed',
        error: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Existing form */}
      <YourSwapForm onSubmit={onFormSubmit} loading={loading} />

      {/* Transaction hash display panel */}
      {executionResult && (
        <IntentExecutionDisplay
          result={executionResult}
          loading={loading}
        />
      )}
    </div>
  );
}

/**
 * Example 5: Display all transaction hashes for a trade
 */
export function TradeTransactionTimeline({ match }: { match: OtcMatchRecord }) {
  const transactions = [
    {
      id: 'buyer-intent',
      label: 'Buyer Intent Created',
      hash: match.buyerCrossChain.onChainIntentTxHash,
      chain: 'strk' as const,
      type: 'intent:create'
    },
    {
      id: 'buyer-escrow',
      label: 'Buyer Escrow Locked',
      hash: match.buyerCrossChain.escrowTxHash,
      chain: 'strk' as const,
      type: 'escrow:lock'
    },
    {
      id: 'seller-intent',
      label: ' Seller Intent Created',
      hash: match.sellerCrossChain.onChainIntentTxHash,
      chain: 'strk' as const,
      type: 'intent:create'
    },
    {
      id: 'seller-escrow',
      label: 'Seller Escrow Locked',
      hash: match.sellerCrossChain.escrowTxHash,
      chain: 'strk' as const,
      type: 'escrow:lock'
    },
    {
      id: 'buyer-settlement',
      label: 'Buyer Settlement',
      hash: match.buyerCrossChain.settlementTxHash,
      chain: match.buyerCrossChain.receiveChain,
      type: 'settlement:transfer'
    },
    {
      id: 'seller-settlement',
      label: 'Seller Settlement',
      hash: match.sellerCrossChain.settlementTxHash,
      chain: match.sellerCrossChain.receiveChain,
      type: 'settlement:transfer'
    }
  ];

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg">Transaction Timeline</h3>
      
      <div className="space-y-2">
        {transactions.map((tx, index) => (
          <div key={tx.id} className="flex items-start gap-4">
            {/* Timeline connector */}
            {index < transactions.length - 1 && (
              <div className="w-1 h-12 bg-border/30 mt-6 mx-6" />
            )}
            <div className="flex-1">
              <TransactionHash
                hash={tx.hash}
                chain={tx.chain}
                label={tx.label}
                txType={tx.type}
                status={tx.hash ? 'completed' : 'pending'}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example 6: Polling for transaction status updates
 */
export function RealTimeTransactionStatus({ transactionHash, chain }: {
  transactionHash: string;
  chain: 'btc' | 'strk';
}) {
  const [status, setStatus] = useState<'pending' | 'completed' | 'failed'>('pending');

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const endpoint = chain === 'btc'
          ? `/api/blockchain/bitcoin/tx/${transactionHash}`
          : `/api/blockchain/starknet/tx/${transactionHash}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.confirmed) {
          setStatus('completed');
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
      }
    };

    const interval = setInterval(pollStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [transactionHash, chain]);

  return (
    <TransactionHash
      hash={transactionHash}
      chain={chain}
      label="Bridge Transaction"
      status={status}
    />
  );
}
