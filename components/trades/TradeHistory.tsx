"use client";

import { ChevronDown, Copy } from "lucide-react";
import { useState } from "react";
import type { TradeRecord } from "@/types";
import { TradeTransactions } from "@/components/transaction/TradeTransactions";

interface TradeHistoryProps {
  trades: TradeRecord[];
  onViewProof?: (trade: TradeRecord) => void;
}

interface ExpandedTrades {
  [key: string]: boolean;
}

export function TradeHistory({ trades, onViewProof }: TradeHistoryProps) {
  const [expandedTrades, setExpandedTrades] = useState<ExpandedTrades>({});

  const toggleExpand = (tradeId: string) => {
    setExpandedTrades((prev) => ({
      ...prev,
      [tradeId]: !prev[tradeId],
    }));
  };

  if (!trades.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border/50 bg-surface/50 text-xs text-muted">
        No trade history yet
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-surface/50 p-4">
      {trades.map((trade) => (
        <div
          key={trade.id}
          className="border border-border/30 rounded-lg overflow-hidden bg-background/30 hover:bg-background/50 transition-colors"
        >
          {/* Compact Header */}
          <button
            onClick={() => toggleExpand(trade.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-surface/30"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className={`transform transition-transform ${expandedTrades[trade.id] ? "rotate-180" : ""}`}>
                <ChevronDown className="h-4 w-4 text-muted" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${
                      trade.direction === "buy" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {trade.direction.toUpperCase()}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      trade.status === "settled"
                        ? "text-emerald-400"
                        : trade.status === "matched"
                          ? "text-amber-400"
                          : "text-cyan-400"
                    }`}
                  >
                    {trade.status}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(trade.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-xs text-muted mt-1">
                  Amount: {trade.maskedAmount} | Price: {trade.maskedPrice}
                </div>
              </div>
            </div>

            {/* Quick Copy Commitment */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(trade.commitment);
              }}
              className="flex items-center gap-1 ml-4 px-2 py-1 rounded hover:bg-surface/50"
              title="Copy commitment"
            >
              <Copy className="h-3.5 w-3.5 text-muted hover:text-primary" />
            </button>
          </button>

          {/* Expanded Details */}
          {expandedTrades[trade.id] && (
            <div className="border-t border-border/20 bg-surface/20 p-4 space-y-4">
              <TradeTransactions trade={trade} extended={true} />
              
              {trade.proofHash && (
                <button
                  onClick={() => onViewProof?.(trade)}
                  className="mt-4 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded text-xs font-semibold text-primary transition-colors"
                >
                  View Full Proof
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
