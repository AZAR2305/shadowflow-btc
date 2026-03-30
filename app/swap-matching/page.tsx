import { Navigation } from "@/components/navigation";
import { SwapMatchingInterface } from "@/components/swap-matching-interface";

interface SwapMatchingPageProps {
  searchParams: {
    wallet?: string;
    direction?: "buy" | "sell";
    amount?: string;
    price?: string;
    sendChain?: "btc" | "strk";
    receiveChain?: "btc" | "strk";
    receiveWalletAddress?: string;
  };
}

export const metadata = {
  title: "Swap Matching - ShadowFlowBTC++",
  description: "Real-time swap matching interface with animation",
};

export default function SwapMatchingPage({ searchParams }: SwapMatchingPageProps) {
  const walletAddress = searchParams.wallet || "0x...";
  const direction = (searchParams.direction || "buy") as "buy" | "sell";
  const amount = searchParams.amount || "0.05";
  const price = searchParams.price || "60000";

  // Default chains: buy = send STRK, receive BTC; sell = send BTC, receive STRK
  const defaultSend = direction === "buy" ? "strk" : "btc";
  const defaultReceive = direction === "buy" ? "btc" : "strk";
  const sendChain = (searchParams.sendChain || defaultSend) as "btc" | "strk";
  const receiveChain = (searchParams.receiveChain || defaultReceive) as "btc" | "strk";
  const receiveWalletAddress = searchParams.receiveWalletAddress || "";

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <Navigation />
      <div className="flex-1">
        <SwapMatchingInterface
          walletAddress={walletAddress}
          initialIntent={{
            direction,
            amount,
            priceThreshold: price,
            sendChain,
            receiveChain,
            receiveWalletAddress,
          }}
        />
      </div>
    </main>
  );
}
