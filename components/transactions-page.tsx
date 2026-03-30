"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import type { ExecutionLog, OtcMatchRecord, TradeRecord } from "@/types";

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

function formatTime(value: number): string {
  return new Date(value).toLocaleString();
}

function shortHex(value?: string, start = 10, end = 8): string {
  if (!value) {
    return "-";
  }
  if (value.length <= start + end + 3) {
    return value;
  }
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function TransactionsPage() {
  const [walletAddress, setWalletAddress] = useState("0xabc123shadowflow");
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [matches, setMatches] = useState<OtcMatchRecord[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encodedWallet = useMemo(() => encodeURIComponent(walletAddress.trim()), [walletAddress]);

  const refresh = useCallback(async () => {
    const wallet = walletAddress.trim();
    if (!wallet) {
      setError("Wallet address is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextTrades, nextMatches, nextLogs] = await Promise.all([
        requestJson<TradeRecord[]>(`/api/otc/trades?walletAddress=${encodedWallet}`),
        requestJson<OtcMatchRecord[]>(`/api/otc/matches?walletAddress=${encodedWallet}`),
        requestJson<ExecutionLog[]>(`/api/otc/execution-logs?walletAddress=${encodedWallet}`),
      ]);

      setTrades(nextTrades);
      setMatches(nextMatches);
      setLogs(nextLogs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, encodedWallet]);

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="mt-2 text-sm text-[#555]">View trades, match records, and execution logs.</p>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label htmlFor="walletAddress" className="mb-2 block text-sm font-semibold">Wallet Address</label>
              <input
                id="walletAddress"
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
                className="w-full rounded-xl border-2 border-black px-4 py-3 text-sm"
                placeholder="0x..."
              />
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-black px-6 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>

          {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
        </div>

        <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-xl font-bold">Trades</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="py-2 pr-3 font-bold">Direction</th>
                  <th className="py-2 pr-3 font-bold">Status</th>
                  <th className="py-2 pr-3 font-bold">Masked Amount</th>
                  <th className="py-2 pr-3 font-bold">Masked Price</th>
                  <th className="py-2 pr-3 font-bold">Counterparty</th>
                  <th className="py-2 pr-3 font-bold">Created</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-[#E7E7E7]">
                    <td className="py-2 pr-3 uppercase">{trade.direction}</td>
                    <td className="py-2 pr-3">{trade.status}</td>
                    <td className="py-2 pr-3">{trade.maskedAmount}</td>
                    <td className="py-2 pr-3">{trade.maskedPrice}</td>
                    <td className="py-2 pr-3">{shortHex(trade.counterpartyWallet, 10, 6)}</td>
                    <td className="py-2 pr-3">{formatTime(trade.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trades.length === 0 ? <p className="pt-3 text-sm text-[#666]">No trades available.</p> : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-bold">Matches</h2>
            <div className="mt-4 max-h-[300px] space-y-2 overflow-auto">
              {matches.map((match) => (
                <div key={match.id} className="rounded-xl border-2 border-black p-3 text-sm">
                  <p className="font-semibold">{match.status.toUpperCase()} @ {match.price}</p>
                  <p>Amount: {match.amount}</p>
                  <p>Buyer: {shortHex(match.buyerWallet, 10, 6)}</p>
                  <p>Seller: {shortHex(match.sellerWallet, 10, 6)}</p>
                </div>
              ))}
              {matches.length === 0 ? <p className="text-sm text-[#666]">No matches available.</p> : null}
            </div>
          </div>

          <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-bold">Execution Logs</h2>
            <div className="mt-4 max-h-[300px] space-y-2 overflow-auto">
              {logs.map((log, idx) => (
                <div key={`${log.nodeId}-${log.timestamp}-${idx}`} className="rounded-xl border-2 border-black p-3 text-sm">
                  <p className="font-semibold">{log.action}</p>
                  <p>Node: {log.nodeId}</p>
                  <p>Masked: {log.maskedAmount}</p>
                  <p>{formatTime(log.timestamp)}</p>
                </div>
              ))}
              {logs.length === 0 ? <p className="text-sm text-[#666]">No logs available.</p> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
