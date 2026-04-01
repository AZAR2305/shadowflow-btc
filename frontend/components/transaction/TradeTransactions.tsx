"use client";

import type { TradeRecord } from "@/types";
import { TransactionHash } from "./TransactionHash";
import { ExternalLink } from "lucide-react";

interface TradeTransactionsProps {
  trade: TradeRecord;
  extended?: boolean;
}

export function TradeTransactions({ trade, extended = false }: TradeTransactionsProps) {
  return (
    <div className="space-y-3">
      {/* Proof Hash */}
      {trade.proofHash && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Zero-Knowledge Proof</span>
            <span className={`text-xs font-medium ${
              trade.status === "settled" ? "text-emerald-400" : "text-amber-400"
            }`}>
              {trade.status}
            </span>
          </div>
          <div className="rounded-lg border border-border/50 bg-surface/50 p-2">
            <code className="text-xs font-code text-violet-400 break-all">
              {trade.proofHash}
            </code>
          </div>
        </div>
      )}

      {/* Commitment */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-muted">Order Commitment</span>
        <div className="rounded-lg border border-border/50 bg-surface/50 p-2">
          <code className="text-xs font-code text-cyan-400 break-all">
            {trade.commitment.slice(0, 32)}...{trade.commitment.slice(-8)}
          </code>
        </div>
      </div>

      {/* Extended Info */}
      {extended && (
        <div className="space-y-3 pt-3 border-t border-border/20">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="text-muted">Direction</div>
              <div className={trade.direction === "buy" ? "text-emerald-400" : "text-red-400"}>
                {trade.direction.toUpperCase()}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-muted">Status</div>
              <div className={
                trade.status === "settled" ? "text-emerald-400" : 
                trade.status === "matched" ? "text-amber-400" : "text-cyan-400"
              }>
                {trade.status}
              </div>
            </div>

            {trade.remainingAmount !== undefined && (
              <div className="space-y-1">
                <div className="text-muted">Remaining</div>
                <div>{trade.remainingAmount?.toFixed(8)}</div>
              </div>
            )}

            {trade.matchedAmount !== undefined && (
              <div className="space-y-1">
                <div className="text-muted">Matched</div>
                <div>{trade.matchedAmount?.toFixed(8)}</div>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-muted">Created</div>
              <div>{new Date(trade.createdAt).toLocaleDateString()}</div>
            </div>

            <div className="space-y-1">
              <div className="text-muted">TEE</div>
              <div>{trade.usesTEE ? "✓ Enabled" : "✗ Disabled"}</div>
            </div>
          </div>

          {trade.counterpartyWallet && (
            <div className="space-y-1.5 pt-3 border-t border-border/20">
              <div className="text-xs font-semibold text-muted">Counterparty</div>
              <div className="rounded bg-surface/50 p-2">
                <code className="text-xs font-code text-cyan-300">
                  {trade.counterpartyWallet.slice(0, 12)}...
                  {trade.counterpartyWallet.slice(-10)}
                </code>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
