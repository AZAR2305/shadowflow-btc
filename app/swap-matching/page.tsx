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
  const amount = searchParams.amount;
  const price = searchParams.price;

  if (!amount || !price) {
    return (
      <main className="flex flex-col min-h-screen bg-white p-6">
        <Navigation />
        <div className="mt-8 max-w-2xl">
          <h1 className="text-xl font-bold">Missing intent amounts</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Provide `amount` and `price` query parameters (redirect from the OTC intent page).
          </p>
        </div>
      </main>
    );
  }

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
          }}
        />
      </div>
    </main>
  );
}
