"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { OtcMatchRecord } from "@/types";
import { TransactionHash } from "./TransactionHash";

interface MatchTransactionsProps {
  match: OtcMatchRecord;
  userRole?: "buyer" | "seller";
}

export function MatchTransactions({ match, userRole }: MatchTransactionsProps) {
  const [expanded, setExpanded] = useState(false);

  const buyerInfo = match.buyerCrossChain;
  const sellerInfo = match.sellerCrossChain;

  const userInfo = userRole === "seller" ? sellerInfo : buyerInfo;
  const counterpartyInfo = userRole === "seller" ? buyerInfo : sellerInfo;

  const buyerSettlement = match.buyerSettlement;
  const sellerSettlement = match.sellerSettlement;

  const statusColor =
    match.status === "settled"
      ? "text-emerald-400"
      : match.status === "settling"
        ? "text-amber-400"
        : "text-cyan-400";

  return (
    <div className="rounded-lg border border-border/50 bg-surface/30 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface/50 transition-colors"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Match #{match.id.slice(0, 8)}</span>
            <span className={`text-xs font-medium ${statusColor}`}>
              {match.status.toUpperCase()}
            </span>
            <span className="text-xs text-muted">
              {new Date(match.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="text-xs text-muted mt-1">
            {match.amount} amount @ {match.price.toFixed(8)} BTC/STRK
          </div>
        </div>
        
        <div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-border/30 px-4 py-4 space-y-6 bg-surface/20">
          {/* Match Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted">Buyer Confirmation</h4>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    match.buyerConfirmed ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
                <span className="text-xs">
                  {match.buyerConfirmed ? "✓ Confirmed" : "✗ Pending"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted">Seller Confirmation</h4>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    match.sellerConfirmed ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
                <span className="text-xs">
                  {match.sellerConfirmed ? "✓ Confirmed" : "✗ Pending"}
                </span>
              </div>
            </div>
          </div>

          {/* On-Chain Transactions */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">On-Chain Transactions</h4>

            <div className="space-y-3">
              {/* Buyer Intent */}
              <TransactionHash
                hash={buyerInfo.onChainIntentTxHash}
                chain="strk"
                label="Buyer Intent Created"
                txType="intent:create"
                status={buyerInfo.onChainIntentTxHash ? "completed" : "pending"}
              />

              {/* Buyer Escrow */}
              <TransactionHash
                hash={buyerInfo.escrowTxHash}
                chain="strk"
                label="Buyer Escrow Locked"
                txType="escrow:lock"
                status={buyerInfo.escrowTxHash ? "completed" : "pending"}
              />

              {/* Buyer Settlement */}
              <TransactionHash
                hash={buyerInfo.settlementTxHash}
                chain={buyerInfo.receiveChain}
                label="Buyer Settlement Transfer"
                txType="settlement:transfer"
                status={buyerInfo.settlementTxHash ? "completed" : "pending"}
              />
            </div>

            <div className="border-t border-border/20 pt-4 space-y-3">
              {/* Seller Intent */}
              <TransactionHash
                hash={sellerInfo.onChainIntentTxHash}
                chain="strk"
                label="Seller Intent Created"
                txType="intent:create"
                status={sellerInfo.onChainIntentTxHash ? "completed" : "pending"}
              />

              {/* Seller Escrow */}
              <TransactionHash
                hash={sellerInfo.escrowTxHash}
                chain="strk"
                label="Seller Escrow Locked"
                txType="escrow:lock"
                status={sellerInfo.escrowTxHash ? "completed" : "pending"}
              />

              {/* Seller Settlement */}
              <TransactionHash
                hash={sellerInfo.settlementTxHash}
                chain={sellerInfo.receiveChain}
                label="Seller Settlement Transfer"
                txType="settlement:transfer"
                status={sellerInfo.settlementTxHash ? "completed" : "pending"}
              />
            </div>
          </div>

          {/* Final Settlement Details */}
          {match.buyerSettlement && (
            <div className="space-y-4 border-t border-border/20 pt-4">
              <h4 className="font-semibold text-sm">Settlement Details</h4>
              
              <div className="grid grid-cols-1 gap-4 text-xs">
                <div className="rounded bg-surface/50 p-3">
                  <div className="font-semibold text-emerald-400 mb-2">Buyer Settlement</div>
                  <div className="space-y-2 text-muted">
                    <div className="flex justify-between">
                      <span>From:</span>
                      <code className="font-code text-cyan-300">
                        {buyerSettlement.fromWallet.slice(0, 8)}...
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span>To:</span>
                      <code className="font-code text-cyan-300">
                        {buyerSettlement.toWallet.slice(0, 8)}...
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span>{buyerSettlement.amount} BTC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={buyerSettlement.status === "completed" ? "text-emerald-400" : "text-amber-400"}>
                        {buyerSettlement.status}
                      </span>
                    </div>
                  </div>
                </div>

                {sellerSettlement && (
                  <div className="rounded bg-surface/50 p-3">
                    <div className="font-semibold text-red-400 mb-2">Seller Settlement</div>
                    <div className="space-y-2 text-muted">
                      <div className="flex justify-between">
                        <span>From:</span>
                        <code className="font-code text-cyan-300">
                          {sellerSettlement.fromWallet.slice(0, 8)}...
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span>To:</span>
                        <code className="font-code text-cyan-300">
                          {sellerSettlement.toWallet.slice(0, 8)}...
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span>{sellerSettlement.amount} STRK</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={sellerSettlement.status === "completed" ? "text-emerald-400" : "text-amber-400"}>
                          {sellerSettlement.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Commitment Hash */}
          <div className="border-t border-border/20 pt-4 space-y-2">
            <h4 className="text-xs font-semibold text-muted">Settlement Commitment</h4>
            <div className="rounded bg-surface/50 p-2">
              <code className="text-xs font-code text-cyan-400 break-all">
                {match.settlementCommitment}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
