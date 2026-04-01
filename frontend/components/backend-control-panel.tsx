"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

import type { ExecutionLog, OtcMatchRecord, TradeRecord, ZKProof, TEEAttestation } from "@/types";

interface WalletBalances {
  btcBalance: string;
  strkBalance: string;
}

interface StrategySummary {
  id: string;
  direction: "buy" | "sell";
  status: "open" | "matched" | "settled";
  commitment: string;
  createdAt: number;
}

interface ChainState {
  merkleRoot: string;
  spentNullifiers: string[];
}

interface DashboardState {
  balances: WalletBalances;
  strategies: StrategySummary[];
  trades: TradeRecord[];
  matches: OtcMatchRecord[];
  logs: ExecutionLog[];
  proof: ZKProof | null;
  attestation: TEEAttestation | null;
  chainState: ChainState;
}

interface IntentFormState {
  direction: "buy" | "sell";
  templateId: "simple" | "split" | "guarded";
  selectedPath: string;
  amount: string;
  priceThreshold: string;
  splitCount: string;
  depositAmount: string;
  depositConfirmed: boolean;
}

const defaultState: DashboardState = {
  balances: { btcBalance: "0.0000", strkBalance: "0.00" },
  strategies: [],
  trades: [],
  matches: [],
  logs: [],
  proof: null,
  attestation: null,
  chainState: { merkleRoot: "0x0", spentNullifiers: [] },
};

const defaultIntentState: IntentFormState = {
  direction: "buy",
  templateId: "simple",
  selectedPath: "btc_otc_main",
  amount: "0.0500",
  priceThreshold: "60000",
  splitCount: "1",
  depositAmount: "0.0500",
  depositConfirmed: true,
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

function shortHex(value: string, start = 10, end = 8): string {
  if (!value || value.length <= start + end + 3) {
    return value;
  }
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function formatTime(value: number): string {
  return new Date(value).toLocaleString();
}

export function BackendControlPanel() {
  const [walletAddress, setWalletAddress] = useState("0xabc123shadowflow");
  const [intent, setIntent] = useState<IntentFormState>(defaultIntentState);
  const [data, setData] = useState<DashboardState>(defaultState);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const encodedWallet = useMemo(() => encodeURIComponent(walletAddress.trim()), [walletAddress]);

  const fetchBackendState = useCallback(async () => {
    const wallet = walletAddress.trim();
    if (!wallet) {
      setError("Wallet address is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        balances,
        strategies,
        trades,
        matches,
        logs,
        proof,
        attestation,
        chainState,
      ] = await Promise.all([
        requestJson<WalletBalances>(`/api/wallet/balances?walletAddress=${encodedWallet}`),
        requestJson<StrategySummary[]>(`/api/otc/strategies?walletAddress=${encodedWallet}`),
        requestJson<TradeRecord[]>(`/api/otc/trades?walletAddress=${encodedWallet}`),
        requestJson<OtcMatchRecord[]>(`/api/otc/matches?walletAddress=${encodedWallet}`),
        requestJson<ExecutionLog[]>(`/api/otc/execution-logs?walletAddress=${encodedWallet}`),
        requestJson<ZKProof | null>(`/api/otc/proofs/latest?walletAddress=${encodedWallet}`),
        requestJson<TEEAttestation | null>(`/api/tee/attestations/latest?walletAddress=${encodedWallet}`),
        requestJson<ChainState>("/api/chain/state"),
      ]);

      setData({ balances, strategies, trades, matches, logs, proof, attestation, chainState });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load backend data.");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, encodedWallet]);

  const handleIntentSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const wallet = walletAddress.trim();
      if (!wallet) {
        setError("Wallet address is required before submitting an intent.");
        return;
      }

      setSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        await requestJson("/api/otc/intents", {
          method: "POST",
          body: JSON.stringify({
            walletAddress: wallet,
            direction: intent.direction,
            templateId: intent.templateId,
            selectedPath: intent.selectedPath,
            amount: Number(intent.amount),
            priceThreshold: Number(intent.priceThreshold),
            splitCount: Number(intent.splitCount),
            depositAmount: Number(intent.depositAmount),
            depositConfirmed: intent.depositConfirmed,
          }),
        });

        setSuccess("Intent submitted successfully. Backend state refreshed.");
        await fetchBackendState();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Intent submission failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [walletAddress, intent, fetchBackendState],
  );

  return (
    <section id="intent-panel" className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-[28px] border-4 border-black bg-white p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label htmlFor="walletAddress" className="mb-2 block text-sm font-bold text-[#0B0B0B]">
                Wallet address
              </label>
              <input
                id="walletAddress"
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
                className="w-full rounded-xl border-2 border-black px-4 py-3 text-sm font-medium text-[#0B0B0B] outline-none focus:ring-2 focus:ring-[#2F81F7]"
                placeholder="0x..."
              />
            </div>
            <button
              type="button"
              onClick={fetchBackendState}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-black px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh from backend
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border-2 border-black bg-[#FFF3D9] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5B4A20]">BTC balance</p>
              <p className="mt-2 text-2xl font-bold text-[#0B0B0B]">{data.balances.btcBalance}</p>
            </div>
            <div className="rounded-2xl border-2 border-black bg-[#E6F2FF] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#224B7A]">STRK balance</p>
              <p className="mt-2 text-2xl font-bold text-[#0B0B0B]">{data.balances.strkBalance}</p>
            </div>
            <div className="rounded-2xl border-2 border-black bg-[#FFE6EB] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#7A2030]">Merkle root</p>
              <p className="mt-2 break-all text-sm font-semibold text-[#0B0B0B]">{shortHex(data.chainState.merkleRoot, 14, 12)}</p>
            </div>
            <div className="rounded-2xl border-2 border-black bg-[#E8FFE8] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1E6B1E]">Spent nullifiers</p>
              <p className="mt-2 text-2xl font-bold text-[#0B0B0B]">{data.chainState.spentNullifiers.length}</p>
            </div>
          </div>

          {error ? (
            <div className="mt-6 flex items-start gap-2 rounded-xl border-2 border-[#D63B3B] bg-[#FFECEC] px-4 py-3 text-sm font-medium text-[#8C2323]">
              <XCircle className="mt-0.5 h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : null}

          {success ? (
            <div className="mt-6 flex items-start gap-2 rounded-xl border-2 border-[#2F9E44] bg-[#ECFFF0] px-4 py-3 text-sm font-medium text-[#1E6B31]">
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
              <span>{success}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-5" id="live-state">
          <form
            onSubmit={handleIntentSubmit}
            className="xl:col-span-2 rounded-[28px] border-4 border-black bg-white p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
          >
            <h2 className="text-2xl font-bold text-[#0B0B0B]">Create OTC intent</h2>
            <p className="mt-2 text-sm font-medium text-[#4A4A4A]">Submit to backend route /api/otc/intents.</p>

            <div className="mt-6 grid gap-4">
              <label className="text-sm font-semibold text-[#0B0B0B]">
                Direction
                <select
                  value={intent.direction}
                  onChange={(event) => setIntent((prev) => ({ ...prev, direction: event.target.value as "buy" | "sell" }))}
                  className="mt-2 w-full rounded-xl border-2 border-black px-3 py-2"
                >
                  <option value="buy">buy</option>
                  <option value="sell">sell</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-[#0B0B0B]">
                Template
                <select
                  value={intent.templateId}
                  onChange={(event) =>
                    setIntent((prev) => ({ ...prev, templateId: event.target.value as "simple" | "split" | "guarded" }))
                  }
                  className="mt-2 w-full rounded-xl border-2 border-black px-3 py-2"
                >
                  <option value="simple">simple</option>
                  <option value="split">split</option>
                  <option value="guarded">guarded</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-[#0B0B0B]">
                Strategy path
                <input
                  value={intent.selectedPath}
                  onChange={(event) => setIntent((prev) => ({ ...prev, selectedPath: event.target.value }))}
                  className="mt-2 w-full rounded-xl border-2 border-black px-3 py-2"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-[#0B0B0B]">
                  Amount
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={intent.amount}
                    onChange={(event) => setIntent((prev) => ({ ...prev, amount: event.target.value }))}
                    className="mt-2 w-full rounded-xl border-2 border-black px-3 py-2"
                  />
                </label>

                <label className="text-sm font-semibold text-[#0B0B0B]">
                  Price threshold
                  <input
                    type="number"
                    min="0"
                    value={intent.priceThreshold}
                    onChange={(event) => setIntent((prev) => ({ ...prev, priceThreshold: event.target.value }))}
                    className="mt-2 w-full rounded-xl border-2 border-black px-3 py-2"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-[#0B0B0B]">
                  Split count
                  <input
                    type="number"
                    min="1"
                    value={intent.splitCount}
                    onChange={(event) => setIntent((prev) => ({ ...prev, splitCount: event.target.value }))}
                    className="mt-2 w-full rounded-xl border-2 border-black px-3 py-2"
                  />
                </label>

                <label className="text-sm font-semibold text-[#0B0B0B]">
                  Deposit amount
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={intent.depositAmount}
                    onChange={(event) => setIntent((prev) => ({ ...prev, depositAmount: event.target.value }))}
                    className="mt-2 w-full rounded-xl border-2 border-black px-3 py-2"
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B0B0B]">
                <input
                  type="checkbox"
                  checked={intent.depositConfirmed}
                  onChange={(event) => setIntent((prev) => ({ ...prev, depositConfirmed: event.target.checked }))}
                  className="h-4 w-4 rounded border-black"
                />
                Deposit confirmed
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FF4A60] px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Submit intent
              </button>
            </div>
          </form>

          <div className="xl:col-span-3 space-y-6">
            <div className="rounded-[28px] border-4 border-black bg-white p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-xl font-bold text-[#0B0B0B]">Proof and attestation state</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border-2 border-black bg-[#F9F9F9] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#4A4A4A]">Latest proof</p>
                  <p className="mt-2 break-all text-sm font-semibold text-[#0B0B0B]">
                    {data.proof ? shortHex(data.proof.proofHash, 16, 12) : "No proof yet"}
                  </p>
                  <p className="mt-1 text-xs text-[#555]">Verified: {data.proof?.verified ? "yes" : "no"}</p>
                </div>

                <div className="rounded-2xl border-2 border-black bg-[#F9F9F9] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#4A4A4A]">TEE attestation</p>
                  <p className="mt-2 text-sm font-semibold text-[#0B0B0B]">
                    {data.attestation ? `${data.attestation.enclaveType} / ${data.attestation.valid ? "valid" : "invalid"}` : "No attestation yet"}
                  </p>
                  <p className="mt-1 break-all text-xs text-[#555]">
                    {data.attestation ? shortHex(data.attestation.measurementHash, 16, 12) : "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border-4 border-black bg-white p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-xl font-bold text-[#0B0B0B]">Trades</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="py-2 pr-3 font-bold">Direction</th>
                      <th className="py-2 pr-3 font-bold">Status</th>
                      <th className="py-2 pr-3 font-bold">Masked amount</th>
                      <th className="py-2 pr-3 font-bold">Masked price</th>
                      <th className="py-2 pr-3 font-bold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trades.slice(0, 8).map((trade) => (
                      <tr key={trade.id} className="border-b border-[#E7E7E7]">
                        <td className="py-2 pr-3 uppercase">{trade.direction}</td>
                        <td className="py-2 pr-3">{trade.status}</td>
                        <td className="py-2 pr-3">{trade.maskedAmount}</td>
                        <td className="py-2 pr-3">{trade.maskedPrice}</td>
                        <td className="py-2 pr-3">{formatTime(trade.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.trades.length === 0 ? <p className="pt-3 text-sm text-[#666]">No trades yet for this wallet.</p> : null}
              </div>
            </div>

            <div className="rounded-[28px] border-4 border-black bg-white p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-xl font-bold text-[#0B0B0B]">Matches and execution logs</h3>
              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold text-[#0B0B0B]">Matches</p>
                  <div className="max-h-[220px] space-y-2 overflow-auto rounded-xl border-2 border-black p-3">
                    {data.matches.slice(0, 8).map((match) => (
                      <div key={match.id} className="rounded-lg bg-[#F6F6F6] p-2 text-xs">
                        <p className="font-semibold">{match.status.toUpperCase()} @ {match.price}</p>
                        <p>Amount: {match.amount}</p>
                        <p>Buyer: {shortHex(match.buyerWallet, 10, 6)}</p>
                        <p>Seller: {shortHex(match.sellerWallet, 10, 6)}</p>
                      </div>
                    ))}
                    {data.matches.length === 0 ? <p className="text-xs text-[#666]">No matches yet.</p> : null}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-[#0B0B0B]">Execution logs</p>
                  <div className="max-h-[220px] space-y-2 overflow-auto rounded-xl border-2 border-black p-3">
                    {data.logs.slice(0, 12).map((log, index) => (
                      <div key={`${log.nodeId}-${log.timestamp}-${index}`} className="rounded-lg bg-[#F6F6F6] p-2 text-xs">
                        <p className="font-semibold">{log.action}</p>
                        <p>Node: {log.nodeId}</p>
                        <p>Masked: {log.maskedAmount}</p>
                        <p>{formatTime(log.timestamp)}</p>
                      </div>
                    ))}
                    {data.logs.length === 0 ? <p className="text-xs text-[#666]">No logs yet.</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
