import { NextResponse } from "next/server";

import { ensureApiKeyIfConfigured } from "@/lib/server/executionGateway";
import type { OtcMatchRecord } from "@/types";

export const runtime = "nodejs";

interface SettlementLogEntry {
  timestamp: number;
  event: string;
  chain: "btc" | "strk";
  txHash?: string;
  explorerUrl?: string;
  details: string;
}

function buildLogsFromMatch(match: OtcMatchRecord): SettlementLogEntry[] {
  const logs: SettlementLogEntry[] = [];
  const baseTs = match.createdAt ?? Date.now();

  // 1. Intent created
  logs.push({
    timestamp: baseTs,
    event: "INTENT_CREATED",
    chain: match.buyerCrossChain?.sendChain ?? "strk",
    txHash: match.buyerCrossChain?.onChainIntentTxHash,
    explorerUrl: match.buyerCrossChain?.onChainIntentTxHash
      ? (match.buyerCrossChain.sendChain === "btc"
        ? `https://mempool.space/testnet4/tx/${match.buyerCrossChain.onChainIntentTxHash}`
        : `https://sepolia.starkscan.co/tx/${match.buyerCrossChain.onChainIntentTxHash}`)
      : undefined,
    details: `Buyer intent registered on-chain (${match.buyerCrossChain?.sendChain?.toUpperCase() ?? "?"} → ${match.buyerCrossChain?.receiveChain?.toUpperCase() ?? "?"})`,
  });

  logs.push({
    timestamp: baseTs + 1,
    event: "INTENT_CREATED",
    chain: match.sellerCrossChain?.sendChain ?? "btc",
    txHash: match.sellerCrossChain?.onChainIntentTxHash,
    explorerUrl: match.sellerCrossChain?.onChainIntentTxHash
      ? (match.sellerCrossChain.sendChain === "btc"
        ? `https://mempool.space/testnet4/tx/${match.sellerCrossChain.onChainIntentTxHash}`
        : `https://sepolia.starkscan.co/tx/${match.sellerCrossChain.onChainIntentTxHash}`)
      : undefined,
    details: `Seller intent registered on-chain (${match.sellerCrossChain?.sendChain?.toUpperCase() ?? "?"} → ${match.sellerCrossChain?.receiveChain?.toUpperCase() ?? "?"})`,
  });

  // 2. Match found
  logs.push({
    timestamp: baseTs + 2,
    event: "MATCHED",
    chain: "strk",
    details: `Cross-chain match found: ${match.amount} units. Buyer ↔ Seller compatible.`,
  });

  // 3. Escrow deposits
  if (match.buyerEscrowConfirmed) {
    const buyerChain = match.buyerCrossChain?.sendChain ?? "strk";
    logs.push({
      timestamp: baseTs + 3,
      event: "ESCROW_DEPOSIT",
      chain: buyerChain,
      txHash: match.buyerCrossChain?.escrowTxHash,
      explorerUrl: match.buyerCrossChain?.escrowTxHash
        ? (buyerChain === "btc"
          ? `https://mempool.space/testnet4/tx/${match.buyerCrossChain.escrowTxHash}`
          : `https://sepolia.starkscan.co/tx/${match.buyerCrossChain.escrowTxHash}`)
        : undefined,
      details: `Buyer escrow confirmed on ${buyerChain.toUpperCase()} chain`,
    });
  }

  if (match.sellerEscrowConfirmed) {
    const sellerChain = match.sellerCrossChain?.sendChain ?? "btc";
    logs.push({
      timestamp: baseTs + 4,
      event: "ESCROW_DEPOSIT",
      chain: sellerChain,
      txHash: match.sellerCrossChain?.escrowTxHash,
      explorerUrl: match.sellerCrossChain?.escrowTxHash
        ? (sellerChain === "btc"
          ? `https://mempool.space/testnet4/tx/${match.sellerCrossChain.escrowTxHash}`
          : `https://sepolia.starkscan.co/tx/${match.sellerCrossChain.escrowTxHash}`)
        : undefined,
      details: `Seller escrow confirmed on ${sellerChain.toUpperCase()} chain`,
    });
  }

  // 4. Settlement
  if (match.status === "settled") {
    const buyerReceiveChain = match.buyerCrossChain?.receiveChain ?? "btc";
    logs.push({
      timestamp: baseTs + 5,
      event: "SETTLEMENT",
      chain: buyerReceiveChain,
      txHash: match.buyerCrossChain?.settlementTxHash,
      explorerUrl: match.buyerCrossChain?.settlementTxHash
        ? (buyerReceiveChain === "btc"
          ? `https://mempool.space/testnet4/tx/${match.buyerCrossChain.settlementTxHash}`
          : `https://sepolia.starkscan.co/tx/${match.buyerCrossChain.settlementTxHash}`)
        : undefined,
      details: `Settlement sent to buyer on ${buyerReceiveChain.toUpperCase()} → ${match.buyerCrossChain?.receiveWalletAddress ?? "?"}`,
    });

    const sellerReceiveChain = match.sellerCrossChain?.receiveChain ?? "strk";
    logs.push({
      timestamp: baseTs + 6,
      event: "SETTLEMENT",
      chain: sellerReceiveChain,
      txHash: match.sellerCrossChain?.settlementTxHash,
      explorerUrl: match.sellerCrossChain?.settlementTxHash
        ? (sellerReceiveChain === "btc"
          ? `https://mempool.space/testnet4/tx/${match.sellerCrossChain.settlementTxHash}`
          : `https://sepolia.starkscan.co/tx/${match.sellerCrossChain.settlementTxHash}`)
        : undefined,
      details: `Settlement sent to seller on ${sellerReceiveChain.toUpperCase()} → ${match.sellerCrossChain?.receiveWalletAddress ?? "?"}`,
    });

    logs.push({
      timestamp: baseTs + 7,
      event: "COMPLETE",
      chain: "strk",
      details: "✅ Cross-chain OTC trade settled successfully. Both parties received funds.",
    });
  }

  return logs.sort((a, b) => a.timestamp - b.timestamp);
}

export async function GET(
  request: Request,
  { params }: { params: { matchId: string } },
) {
  try {
    ensureApiKeyIfConfigured(request);

    // Load match from the state store
    const { loadMatchById } = await import("@/lib/server/otcStateStore");
    const match = await loadMatchById(params.matchId);

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const logs = buildLogsFromMatch(match);
    return NextResponse.json({ matchId: params.matchId, logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
