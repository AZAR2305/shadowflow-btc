"use client";

import { FormEvent, useCallback, useMemo, useState, useEffect } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useXverseWallet } from "@/hooks/useXverseWallet";

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
  sendChain: "btc" | "strk";
  receiveChain: "btc" | "strk";
  receiveWalletAddress: string;
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
  sendChain: "strk",
  receiveChain: "btc",
  receiveWalletAddress: "",
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

export function OtcIntentPage() {
  const router = useRouter();
  const {
    wallet,
    isConnecting,
    connectWallet,
    connectXverse,
    connectUnisat,
    error: walletError,
    xverseAvailable,
    unisatAvailable,
  } = useXverseWallet();
  const [walletAddress, setWalletAddress] = useState("");
  const [intent, setIntent] = useState<IntentFormState>(defaultIntentState);
  const [data, setData] = useState<DashboardState>(defaultState);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Set wallet address from BTC wallet when connected
  useEffect(() => {
    if (wallet?.address) {
      setWalletAddress(wallet.address);
    }
  }, [wallet?.address]);

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
            sendChain: intent.sendChain,
            receiveChain: intent.receiveChain,
            receiveWalletAddress: intent.receiveWalletAddress,
          }),
        });

        setSuccess("Intent submitted successfully! Redirecting to swap matching...");
        
        // Redirect to swap matching interface
        setTimeout(() => {
          const params = new URLSearchParams({
            wallet: wallet,
            direction: intent.direction,
            amount: intent.amount,
            price: intent.priceThreshold,
          });
          router.push(`/swap-matching?${params.toString()}`);
        }, 500);

        await fetchBackendState();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Intent submission failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [walletAddress, intent, fetchBackendState, router],
  );

  const handleClearAllIntents = useCallback(async () => {
    setClearing(true);
    setError(null);
    setSuccess(null);

    try {
      await requestJson("/api/otc/intents?scope=all", { method: "DELETE" });
      setSuccess("Previous buyer/seller intents cleared. You can create a new intent now.");
      setData(defaultState);
      setIntent(defaultIntentState);
      if (walletAddress.trim()) {
        await fetchBackendState();
      }
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Failed to clear intents.");
    } finally {
      setClearing(false);
    }
  }, [walletAddress, fetchBackendState]);

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-3xl font-bold">OTC Intent</h1>
          <p className="mt-2 text-sm text-[#555]">Submit buy/sell intents and monitor backend state in one place.</p>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label htmlFor="walletAddress" className="mb-2 block text-sm font-semibold">Wallet Address</label>
              {wallet?.connected ? (
                <div className="w-full rounded-xl border-2 border-green-600 bg-green-50 px-4 py-3 text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-6)}
                  </span>
                  <span className="text-xs text-green-700">{wallet.provider.toUpperCase()} connected</span>
                </div>
              ) : (
                <input
                  id="walletAddress"
                  value={walletAddress}
                  onChange={(event) => setWalletAddress(event.target.value)}
                  className="w-full rounded-xl border-2 border-black px-4 py-3 text-sm"
                  placeholder="bc1... or tb1... or connect BTC wallet"
                />
              )}
            </div>
            {!wallet?.connected && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={connectWallet}
                  disabled={isConnecting || (!xverseAvailable && !unisatAvailable)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FF8000] px-6 text-sm font-semibold text-white disabled:opacity-60 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  Connect BTC Wallet
                </button>

                <button
                  type="button"
                  onClick={connectXverse}
                  disabled={isConnecting || !xverseAvailable}
                  className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-black bg-white px-4 text-sm font-semibold disabled:opacity-60"
                >
                  Xverse
                </button>

                <button
                  type="button"
                  onClick={connectUnisat}
                  disabled={isConnecting || !unisatAvailable}
                  className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-black bg-white px-4 text-sm font-semibold disabled:opacity-60"
                >
                  Unisat
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={fetchBackendState}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-black px-6 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>

            <button
              type="button"
              onClick={handleClearAllIntents}
              disabled={clearing}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#FFECEC] px-6 text-sm font-semibold text-[#8C2323] disabled:opacity-60"
            >
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Clear Previous Intents
            </button>
          </div>

          {walletError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border-2 border-[#D63B3B] bg-[#FFECEC] px-4 py-3 text-sm text-[#8C2323]">
              <XCircle className="h-4 w-4" />
              {walletError}
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border-2 border-black bg-[#FFF3D9] p-3">
              <p className="text-xs font-semibold uppercase">BTC</p>
              <p className="mt-1 text-xl font-bold">{data.balances.btcBalance}</p>
            </div>
            <div className="rounded-2xl border-2 border-black bg-[#E6F2FF] p-3">
              <p className="text-xs font-semibold uppercase">STRK</p>
              <p className="mt-1 text-xl font-bold">{data.balances.strkBalance}</p>
            </div>
            <div className="rounded-2xl border-2 border-black bg-[#FFE6EB] p-3">
              <p className="text-xs font-semibold uppercase">Merkle Root</p>
              <p className="mt-1 text-sm font-semibold">{shortHex(data.chainState.merkleRoot, 14, 12)}</p>
            </div>
            <div className="rounded-2xl border-2 border-black bg-[#E8FFE8] p-3">
              <p className="text-xs font-semibold uppercase">Spent Nullifiers</p>
              <p className="mt-1 text-xl font-bold">{data.chainState.spentNullifiers.length}</p>
            </div>
          </div>

          {error ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border-2 border-[#D63B3B] bg-[#FFECEC] px-4 py-3 text-sm text-[#8C2323]">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border-2 border-[#2F9E44] bg-[#ECFFF0] px-4 py-3 text-sm text-[#1E6B31]">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleIntentSubmit} className="rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-bold">Create Intent</h2>
            <div className="mt-4 grid gap-3">
              <label className="text-sm font-semibold">
                Direction
                <select
                  value={intent.direction}
                  onChange={(event) => setIntent((prev) => ({ ...prev, direction: event.target.value as "buy" | "sell" }))}
                  className="mt-1 w-full rounded-xl border-2 border-black px-3 py-2"
                >
                  <option value="buy">buy</option>
                  <option value="sell">sell</option>
                </select>
              </label>

              <label className="text-sm font-semibold">
                Template
                <select
                  value={intent.templateId}
                  onChange={(event) => setIntent((prev) => ({ ...prev, templateId: event.target.value as "simple" | "split" | "guarded" }))}
                  className="mt-1 w-full rounded-xl border-2 border-black px-3 py-2"
                >
                  <option value="simple">simple</option>
                  <option value="split">split</option>
                  <option value="guarded">guarded</option>
                </select>
              </label>

              <label className="text-sm font-semibold">
                Strategy Path
                <input
                  value={intent.selectedPath}
                  onChange={(event) => setIntent((prev) => ({ ...prev, selectedPath: event.target.value }))}
                  className="mt-1 w-full rounded-xl border-2 border-black px-3 py-2"
                />
              </label>

              <div className="rounded-2xl border-3 border-blue-400 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase text-blue-900">Cross-Chain Exchange</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-[#666]">
                      You Send
                      <select
                        value={intent.sendChain}
                        onChange={(event) => {
                          const newSend = event.target.value as "btc" | "strk";
                          setIntent((prev) => ({
                            ...prev,
                            sendChain: newSend,
                            receiveChain: newSend === prev.receiveChain ? (newSend === "btc" ? "strk" : "btc") : prev.receiveChain,
                          }));
                        }}
                        className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-1 text-sm font-bold"
                      >
                        <option value="btc">🔵 Bitcoin (BTC)</option>
                        <option value="strk">⚡ Starknet (STRK)</option>
                      </select>
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-[#666]">
                      You Receive
                      <select
                        value={intent.receiveChain}
                        onChange={(event) => {
                          const newReceive = event.target.value as "btc" | "strk";
                          setIntent((prev) => ({
                            ...prev,
                            receiveChain: newReceive,
                            sendChain: newReceive === prev.sendChain ? (newReceive === "btc" ? "strk" : "btc") : prev.sendChain,
                          }));
                        }}
                        className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-1 text-sm font-bold"
                      >
                        <option value="btc">🔵 Bitcoin (BTC)</option>
                        <option value="strk">⚡ Starknet (STRK)</option>
                      </select>
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-[#666]">
                      Receive Wallet
                      <input
                        type="text"
                        value={intent.receiveWalletAddress}
                        onChange={(event) => setIntent((prev) => ({ ...prev, receiveWalletAddress: event.target.value }))}
                        placeholder={intent.receiveChain === "btc" ? "bc1q..." : "0x..."}
                        className="mt-1 w-full rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-mono"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-3 border-green-400 bg-green-50 p-4">
                <p className="text-xs font-bold uppercase text-green-900">Amount & Price</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold uppercase text-[#666]">
                      How much {intent.sendChain === "btc" ? "🔵 BTC" : "⚡ STRK"} will you send?
                      <div className="mt-1 flex items-center gap-2 rounded-lg border-2 border-black bg-white">
                        <input
                          type="number"
                          min="0"
                          step={intent.sendChain === "btc" ? "0.0001" : "0.01"}
                          value={intent.amount}
                          onChange={(event) => setIntent((prev) => ({ ...prev, amount: event.target.value }))}
                          className="flex-1 border-0 bg-transparent px-3 py-2 text-sm font-bold outline-none"
                        />
                        <span className="px-2 text-xs font-bold uppercase">{intent.sendChain}</span>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-[#666]">
                      How much {intent.receiveChain === "btc" ? "🔵 BTC" : "⚡ STRK"} do you want?
                      <div className="mt-1 flex items-center gap-2 rounded-lg border-2 border-black bg-white">
                        <input
                          type="number"
                          min="0"
                          step={intent.receiveChain === "btc" ? "0.0001" : "0.01"}
                          value={intent.priceThreshold}
                          onChange={(event) => setIntent((prev) => ({ ...prev, priceThreshold: event.target.value }))}
                          className="flex-1 border-0 bg-transparent px-3 py-2 text-sm font-bold outline-none"
                        />
                        <span className="px-2 text-xs font-bold uppercase">{intent.receiveChain}</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Split Count
                  <input
                    type="number"
                    min="1"
                    value={intent.splitCount}
                    onChange={(event) => setIntent((prev) => ({ ...prev, splitCount: event.target.value }))}
                    className="mt-1 w-full rounded-xl border-2 border-black px-3 py-2"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Deposit Amount
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={intent.depositAmount}
                    onChange={(event) => setIntent((prev) => ({ ...prev, depositAmount: event.target.value }))}
                    className="mt-1 w-full rounded-xl border-2 border-black px-3 py-2"
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={intent.depositConfirmed}
                  onChange={(event) => setIntent((prev) => ({ ...prev, depositConfirmed: event.target.checked }))}
                  className="h-4 w-4"
                />
                Deposit Confirmed
              </label>

              <button
                type="submit"
                disabled={submitting || !intent.receiveWalletAddress.trim()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FF4A60] px-6 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Submit Intent
              </button>
            </div>
          </form>

          <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-bold">Latest Proof & TEE</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border-2 border-black p-3">
                <p className="text-xs font-semibold uppercase">Proof Hash</p>
                <p className="mt-1 break-all font-semibold">{data.proof ? shortHex(data.proof.proofHash, 16, 12) : "No proof yet"}</p>
                <p className="mt-1 text-xs text-[#666]">Verified: {data.proof?.verified ? "yes" : "no"}</p>
              </div>

              <div className="rounded-xl border-2 border-black p-3">
                <p className="text-xs font-semibold uppercase">TEE</p>
                <p className="mt-1 font-semibold">
                  {data.attestation ? `${data.attestation.enclaveType} / ${data.attestation.valid ? "valid" : "invalid"}` : "No attestation yet"}
                </p>
                <p className="mt-1 break-all text-xs text-[#666]">
                  {data.attestation ? shortHex(data.attestation.measurementHash, 16, 12) : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
