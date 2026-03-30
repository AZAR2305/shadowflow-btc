import { NextResponse } from "next/server";

import { ensureApiKeyIfConfigured } from "@/lib/server/executionGateway";
import { getWalletBalances } from "@/lib/server/otcStateStore";
import { fetchBtcTestnetBalance, fetchStrkBalance } from "@/lib/balanceFetcher";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    ensureApiKeyIfConfigured(request);
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");
    const btcAddressParam = searchParams.get("btcAddress");
    const starknetAddressParam = searchParams.get("starknetAddress");

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    const balances = await getWalletBalances(walletAddress);

    const lowerWallet = walletAddress.toLowerCase();
    const btcAddress =
      (btcAddressParam && btcAddressParam.trim()) ||
      (lowerWallet.startsWith("tb1") || lowerWallet.startsWith("bc1") ? walletAddress : "");
    const starknetAddress =
      (starknetAddressParam && starknetAddressParam.trim()) ||
      (walletAddress.startsWith("0x") ? walletAddress : "");

    const [btcExternal, strkExternal] = await Promise.all([
      btcAddress ? fetchBtcTestnetBalance(btcAddress) : Promise.resolve(null),
      starknetAddress ? fetchStrkBalance(starknetAddress) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      btcBalance: btcExternal ?? balances.btcBalance,
      strkBalance: strkExternal ?? balances.strkBalance,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const unauthorized = message.includes("Unauthorized");
    return NextResponse.json({ error: message }, { status: unauthorized ? 401 : 500 });
  }
}
