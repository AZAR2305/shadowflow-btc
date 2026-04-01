"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { OtcWaitingPage } from "@/components/otc-waiting-page";

export default function OtcWaitingPageRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const intentId = searchParams.get("intentId") || "";
  const sendAmount = searchParams.get("sendAmount") || "0";
  const sendChain = (searchParams.get("sendChain") || "btc") as "btc" | "strk";
  const receiveAmount = searchParams.get("receiveAmount") || "0";
  const receiveChain = (searchParams.get("receiveChain") || "strk") as "btc" | "strk";
  const walletAddress = searchParams.get("walletAddress") || "";

  return (
    <OtcWaitingPage
      intentId={intentId}
      sendAmount={sendAmount}
      sendChain={sendChain}
      receiveAmount={receiveAmount}
      receiveChain={receiveChain}
      walletAddress={walletAddress}
      onMatchFound={(matchId) => {
        console.log("✅ Match found:", matchId);
        // The component will handle navigation
      }}
      onNoMatch={() => {
        console.log("No match found, redirecting to liquidity pool");
      }}
    />
  );
}
