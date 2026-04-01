"use client";

import { Copy, ExternalLink, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";

interface TransactionHashProps {
  hash: string | undefined;
  chain: "btc" | "strk";
  status?: "pending" | "completed" | "failed";
  label?: string;
  txType?: string;
  timestamp?: number;
}

export function TransactionHash({
  hash,
  chain,
  status = "pending",
  label = "Transaction",
  txType,
  timestamp,
}: TransactionHashProps) {
  const [copied, setCopied] = useState(false);

  if (!hash) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted">
        <AlertCircle className="h-3 w-3" />
        <span>No transaction hash available</span>
      </div>
    );
  }

  const explorerUrl =
    chain === "btc"
      ? `https://blockstream.info/testnet/tx/${hash}`
      : `https://sepolia.starkscan.co/tx/${hash}`;

  const statusColor =
    status === "completed"
      ? "text-emerald-400"
      : status === "failed"
        ? "text-red-400"
        : "text-amber-400";

  const statusIcon =
    status === "completed" ? (
      <CheckCircle className="h-3.5 w-3.5" />
    ) : status === "failed" ? (
      <AlertCircle className="h-3.5 w-3.5" />
    ) : (
      <Clock className="h-3.5 w-3.5 animate-spin" />
    );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted">{label}</span>
          {txType && (
            <span className="rounded bg-surface px-1.5 py-0.5 text-xs font-code text-cyan-400">
              {txType}
            </span>
          )}
          <div className={`flex items-center gap-1 ${statusColor}`}>
            {statusIcon}
            <span className="text-xs font-medium capitalize">
              {status === "pending" ? "pending..." : status}
            </span>
          </div>
        </div>
        {timestamp && (
          <span className="text-xs text-muted">
            {new Date(timestamp).toLocaleString()}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-surface/50 p-2">
        <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded bg-background px-2 py-1 text-xs font-code text-cyan-400">
          {hash}
        </code>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-surface"
          title="Copy to clipboard"
        >
          <Copy className="h-3.5 w-3.5 text-muted hover:text-primary" />
        </button>
        
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-surface"
          title={`View on ${chain === "btc" ? "Blockstream" : "Starkscan"} Explorer`}
        >
          <ExternalLink className="h-3.5 w-3.5 text-primary hover:text-cyan-400" />
        </a>
      </div>

      {copied && (
        <p className="text-xs text-emerald-400">✓ Copied to clipboard</p>
      )}
    </div>
  );
}
