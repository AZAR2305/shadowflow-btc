"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { RefreshCw, CheckCircle2, Clock } from "lucide-react";

interface PendingIntent {
  intentId: string;
  offer: string;
  createdAt: number;
  expiresAt: number;
  sender: string;
}

export default function OrderBookPage() {
  const router = useRouter();
  const [pendingIntents, setPendingIntents] = useState<PendingIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchOrderBook = async () => {
    try {
      setError(null);
      const response = await fetch("/api/otc/matches?view=pending");
      if (!response.ok) {
        throw new Error(`Failed to fetch order book (${response.status})`);
      }
      const data = await response.json();
      setPendingIntents(data.orderBook || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load order book";
      setError(msg);
      console.error("[ORDER-BOOK] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderBook();

    // Auto-refresh every 3 seconds if enabled
    if (!autoRefresh) return;
    const interval = setInterval(fetchOrderBook, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms - Date.now()) / 1000);
    if (seconds < 0) return "Expired";
    if (seconds < 60) return `${seconds}s left`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m left`;
  };

  const formatTimeAgo = (ms: number) => {
    const seconds = Math.floor((Date.now() - ms) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <section className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">📋 Order Book</h1>
          <button
            onClick={() => fetchOrderBook()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border-2 border-black bg-white px-4 py-2 font-semibold hover:shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="mb-6 rounded-lg border-2 border-blue-500 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">💡 How Matching Works</p>
          <p className="mt-2 text-sm text-blue-800">
            When your intent is in the order book and someone submits a complementary swap, the system automatically
            creates a match. Your intent must have an opposite direction (e.g., if you're selling STRK, a buyer must want
            to buy STRK).
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border-2 border-red-500 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-900">⚠️ Error</p>
            <p className="mt-1 text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Auto-refresh Toggle */}
        <div className="mb-6 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-2 border-black"
            />
            Auto-refresh every 3 seconds
          </label>
        </div>

        {loading && pendingIntents.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-4 text-gray-600">Loading order book...</p>
          </div>
        ) : pendingIntents.length === 0 ? (
          <div className="rounded-2xl border-2 border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-lg font-semibold text-gray-900">No Pending Intents</p>
            <p className="mt-2 text-sm text-gray-600">
              No active intents are waiting for a match. Create one from the OTC Intent page!
            </p>
            <button
              onClick={() => router.push("/otc-intent")}
              className="mt-4 rounded-lg border-2 border-black bg-black px-6 py-2 font-semibold text-white hover:shadow-md"
            >
              Create Intent
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingIntents.map((intent) => (
              <div
                key={intent.intentId}
                className="rounded-lg border-2 border-black bg-white p-4 hover:shadow-md transition-shadow"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold uppercase text-gray-600">Offer</p>
                    <p className="mt-1 font-bold text-black">{intent.offer}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-600">Submitted</p>
                      <p className="mt-1 text-sm font-semibold">{formatTimeAgo(intent.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-600">Expires</p>
                      <p className="mt-1 text-sm font-semibold">{formatTime(intent.expiresAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-600">Posted By</p>
                      <p className="mt-1 text-sm font-semibold">{intent.sender}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Status Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Total Pending Intents: {pendingIntents.length}</p>
          {autoRefresh && <p>Auto-refreshing every 3 seconds...</p>}
        </div>
      </section>
    </main>
  );
}
