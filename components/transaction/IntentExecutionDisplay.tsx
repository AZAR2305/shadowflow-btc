"use client";

import { CheckCircle, AlertCircle, Loader2, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

export interface IntentExecutionResult {
  step: string;
  status: "processing" | "completed" | "failed";
  intentId?: string;
  transactionHash?: string;
  message?: string;
  error?: string;
  walletSignatureVerified?: string;
}

interface IntentExecutionDisplayProps {
  result: IntentExecutionResult | null;
  loading?: boolean;
}

export function IntentExecutionDisplay({ result, loading }: IntentExecutionDisplayProps) {
  const [copied, setCopied] = useState(false);

  if (!result && !loading) return null;

  const txHash = result?.transactionHash;
  const explorerUrl = txHash ? `https://sepolia.starkscan.co/tx/${txHash}` : null;

  const handleCopy = async () => {
    if (txHash) {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/50 bg-surface/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Execution Result</h3>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-amber-400" />}
        {result && result.status === "completed" && (
          <CheckCircle className="h-5 w-5 text-emerald-400" />
        )}
        {result && result.status === "failed" && (
          <AlertCircle className="h-5 w-5 text-red-400" />
        )}
      </div>

      {loading && (
        <div className="space-y-2 text-sm text-muted">
          <p>Processing your intent...</p>
          <div className="h-1 bg-surface/50 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`px-2 py-1 rounded text-xs font-semibold ${
                result.status === "completed"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : result.status === "failed"
                    ? "bg-red-400/10 text-red-400"
                    : "bg-amber-400/10 text-amber-400"
              }`}
            >
              {result.status.toUpperCase()}
            </div>
            {result.step && (
              <div className="px-2 py-1 rounded text-xs font-code bg-surface text-cyan-400">
                {result.step}
              </div>
            )}
          </div>

          {/* Message */}
          {result.message && (
            <div className="text-sm text-muted bg-surface/50 rounded p-2">
              {result.message}
            </div>
          )}

          {/* Error Message */}
          {result.error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded p-2">
              {result.error}
            </div>
          )}

          {/* Wallet Signature Verified */}
          {result.walletSignatureVerified && (
            <div className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded p-2">
              {result.walletSignatureVerified} Wallet signature verified
            </div>
          )}

          {/* Transaction Hash Section */}
          {txHash && (
            <div className="space-y-2 pt-3 border-t border-border/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">Transaction Hash</span>
                {result.intentId && (
                  <span className="text-xs text-muted">
                    Intent: {result.intentId.slice(0, 8)}...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 p-2">
                <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-code text-cyan-400">
                  {txHash}
                </code>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-surface"
                  title="Copy to clipboard"
                >
                  <Copy className="h-3.5 w-3.5 text-muted hover:text-primary" />
                </button>

                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-surface"
                    title="View on Starkscan Explorer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-primary hover:text-cyan-400" />
                  </a>
                )}
              </div>

              {copied && (
                <p className="text-xs text-emerald-400">✓ Copied to clipboard</p>
              )}
            </div>
          )}

          {/* Details */}
          {result.intentId && (
            <div className="space-y-2 pt-3 border-t border-border/20">
              <div className="text-xs font-semibold text-muted">Intent ID</div>
              <div className="rounded bg-surface/50 p-2">
                <code className="text-xs font-code text-cyan-400 break-all">
                  {result.intentId}
                </code>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
