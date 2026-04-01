"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2, ArrowRight } from "lucide-react";

interface IntentStatus {
  intentId: string;
  status: "pending" | "matched" | "executing" | "executed" | "failed";
  message: string;
  matchId?: string;
  matchedWith?: {
    wallet: string;
    sending: string;
    receiving: string;
  };
  transactionHash?: string;
  error?: string;
}

interface OtcWaitingPageProps {
  intentId: string;
  sendAmount: string;
  sendChain: "btc" | "strk";
  receiveAmount: string;
  receiveChain: "btc" | "strk";
  walletAddress: string;
  onMatchFound?: (matchId: string) => void;
  onNoMatch?: () => void;
}

export function OtcWaitingPage({
  intentId,
  sendAmount,
  sendChain,
  receiveAmount,
  receiveChain,
  walletAddress,
  onMatchFound,
  onNoMatch,
}: OtcWaitingPageProps) {
  const router = useRouter();
  const [status, setStatus] = useState<IntentStatus>({
    intentId,
    status: "pending",
    message: "⏳ Searching for a matching peer...",
  });
  const [timeWaited, setTimeWaited] = useState(0);
  const hasNavigatedToMatch = useRef(false);

  // Poll for match status every 2 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        if (hasNavigatedToMatch.current) {
          return;
        }

        const response = await fetch(
          `/api/otc/intents/status?intentId=${encodeURIComponent(intentId)}`
        );
        const data = await response.json();

        console.log("[OTC-WAITING] Poll result:", data.status, data.message);

        if (data.status === "matched" && data.match) {
          setStatus({
            intentId,
            status: "matched",
            message: "✅ MATCHED! Found a peer!",
            matchId: data.matchId,
            matchedWith: {
              wallet: data.match.partyB?.wallet || "Unknown",
              sending: `${data.match.partyB?.sendAmount} ${data.match.partyB?.sendChain.toUpperCase() || ""}`,
              receiving: `${data.match.partyB?.receiveAmount} ${data.match.partyB?.receiveChain.toUpperCase() || ""}`,
            },
          });
          if (!hasNavigatedToMatch.current) {
            hasNavigatedToMatch.current = true;
            onMatchFound?.(data.matchId);

            const params = new URLSearchParams({
              intentId,
              matchId: data.matchId || "",
              wallet: walletAddress,
              direction: sendChain === "btc" ? "buy" : "sell",
              amount: sendAmount,
              price: receiveAmount,
              sendChain,
              receiveChain,
            });

            setTimeout(() => {
              router.push(`/swap-matching?${params.toString()}`);
            }, 300);
          }
        } else if (data.status === "expired") {
          setStatus({
            intentId,
            status: "failed",
            message: "⏰ Intent expired. Please create a new one.",
            error: "Intent validity window has passed.",
          });
          onNoMatch?.();
        }
      } catch (err) {
        console.warn("[OTC-WAITING] Error polling for matches:", err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [
    intentId,
    walletAddress,
    onMatchFound,
    onNoMatch,
    router,
    sendAmount,
    sendChain,
    receiveAmount,
    receiveChain,
  ]);

  // Track time waited (for display only, no timeout)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeWaited((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {/* Status Badge */}
          <div className="mb-6 flex items-center justify-center">
            {status.status === "pending" ? (
              <div className="flex items-center gap-3 rounded-full bg-blue-100 px-6 py-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="font-semibold text-blue-900">Waiting for Match</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-full bg-green-100 px-6 py-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-900">Match Found!</span>
              </div>
            )}
          </div>

          {/* Main Message */}
          <h1 className="text-center text-3xl font-bold mb-4">{status.message}</h1>

          {/* Intent Details */}
          <div className="mb-8 rounded-2xl border-2 border-black bg-gray-50 p-6">
            <p className="mb-4 text-sm font-semibold uppercase text-gray-700">Your Intent</p>
            <div className="flex items-center justify-between gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{sendAmount}</p>
                <p className="text-sm text-gray-600">{sendChain.toUpperCase()}</p>
              </div>
              <ArrowRight className="h-6 w-6 text-gray-400" />
              <div className="text-center">
                <p className="text-2xl font-bold">{receiveAmount}</p>
                <p className="text-sm text-gray-600">{receiveChain.toUpperCase()}</p>
              </div>
            </div>
            {status.matchedWith && (
              <div className="mt-6 border-t-2 border-black pt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-green-900">✅ Matched Peer</p>
                <div className="flex items-center justify-between gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">They're sending</p>
                    <p className="font-bold">{status.matchedWith.sending}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-green-600" />
                  <div className="text-center">
                    <p className="text-sm text-gray-600">You'll receive</p>
                    <p className="font-bold">{status.matchedWith.receiving}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Time Waited */}
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-600">
              <Clock className="inline h-4 w-4 mr-1" />
              Waiting for {timeWaited} seconds
            </p>
          </div>

          {/* Status Timeline */}
          <div className="mb-8 space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="h-12 w-0.5 bg-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-900">✓ Intent Submitted</p>
                <p className="text-sm text-gray-600">Your intent is in the order book</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    status.status === "matched" ? "bg-green-600 text-white" : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {status.status === "matched" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                </div>
                <div className="h-12 w-0.5 bg-gray-300" />
              </div>
              <div>
                <p className={`font-semibold ${status.status === "matched" ? "text-green-900" : "text-gray-600"}`}>
                  {status.status === "matched" ? "✓ Match Found!" : "⏳ Waiting for Match"}
                </p>
                <p className="text-sm text-gray-600">
                  {status.status === "matched"
                    ? "A peer wants to swap with you!"
                    : "Searching for a peer with complementary needs..."}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    status.status === "executing" ? "bg-green-600 text-white" : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {status.status === "executing" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                </div>
              </div>
              <div>
                <p className={`font-semibold ${status.status === "executing" ? "text-blue-900" : "text-gray-600"}`}>
                  Execute Swap
                </p>
                <p className="text-sm text-gray-600">
                  {status.status === "matched"
                    ? "Both parties sign to execute"
                    : "Waiting for match to proceed"}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {status.status === "matched" ? (
              <button
                onClick={() => {
                  const params = new URLSearchParams({
                    intentId,
                    matchId: status.matchId || "",
                    wallet: walletAddress,
                    direction: sendChain === "btc" ? "buy" : "sell",
                    amount: sendAmount,
                    price: receiveAmount,
                    sendChain,
                    receiveChain,
                  });
                  router.push(`/swap-matching?${params.toString()}`);
                }}
                className="w-full rounded-xl bg-green-600 px-6 py-4 font-semibold text-white hover:bg-green-700"
              >
                ✓ Proceed to Swap Matching
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push("/otc-order-book")}
                  className="w-full rounded-xl border-2 border-black bg-white px-6 py-4 font-semibold hover:bg-gray-50"
                >
                  📊 View Order Book (All Pending Intents)
                </button>
                <button
                  onClick={() => router.push("/otc-intent")}
                  className="w-full rounded-xl border-2 border-gray-400 bg-gray-50 px-6 py-4 font-semibold text-gray-900 hover:bg-gray-100"
                >
                  Create Another Intent
                </button>
              </>
            )}
          </div>

          {/* Info Message */}
          <div className="mt-6 rounded-lg bg-blue-50 p-4">
            <p className="text-xs text-blue-900">
              <span className="font-semibold">💡 Tip:</span> Check the order book to see if there are other pending
              intents. More peers = faster matches!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
