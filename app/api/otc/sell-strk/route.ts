import { NextRequest, NextResponse } from "next/server";
import { Web3IntegrationService } from "@/lib/server/web3IntegrationService";
import { PythPriceService } from "@/lib/server/pythPriceService";
import { ZKProofService } from "@/lib/server/zkProofService";

/**
 * POST /api/otc/sell-strk
 * Bridge STRK → BTC
 *
 * Body:
 *   {
 *     walletAddress: string,              // Starknet sender address
 *     btcAddress: string,                 // BTC recipient address
 *     strkAmount: number,                 // Amount of STRK to send
 *     minBtcReceive: number,              // Minimum BTC to accept (slippage protection)
 *   }
 *
 * Response:
 *   {
 *     transactionHash: string,
 *     strkAmount: number,
 *     btcAmount: number,
 *     rate: number,                       // BTC per STRK
 *     status: "pending" | "confirmed",
 *     proofHash: string,
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, btcAddress, strkAmount, minBtcReceive } = body;

    // ============================================
    // Validation
    // ============================================
    if (!walletAddress || !btcAddress || !strkAmount || strkAmount <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields: walletAddress, btcAddress, strkAmount" },
        { status: 400 }
      );
    }

    // ============================================
    // Step 1: Fetch current STRK/BTC rate from Pyth
    // ============================================
    const pythService = PythPriceService.getInstance();
    const strkPrice = await pythService.getPrice('STRK');
    const btcPrice = await pythService.getPrice('BTC');

    const rate = strkPrice.formattedPrice / btcPrice.formattedPrice; // BTC per STRK
    const expectedBtcAmount = strkAmount * rate;

    if (expectedBtcAmount < minBtcReceive) {
      return NextResponse.json(
        {
          error: `Expected BTC (${expectedBtcAmount}) below minimum (${minBtcReceive})`,
          expectedBtcAmount,
          minBtcReceive,
        },
        { status: 400 }
      );
    }

    // ============================================
    // Step 3: Execute full Web3 flow
    // ============================================
    const web3Service = Web3IntegrationService.getInstance();

    const intentId = `sell-strk-${Date.now()}`;
    const zkProof = ZKProofService.generatePriceVerifiedIntentProof(
      intentId,
      strkAmount.toString(),
      "strk",
      expectedBtcAmount.toString(),
      "btc",
      rate,
      walletAddress,
      btcAddress,
    );

    const executionResult = await web3Service.executeIntentWithFullFlow({
      intentId,
      sendAmount: strkAmount.toString(),
      sendChain: "strk",
      receiveAmount: expectedBtcAmount.toString(),
      receiveChain: "btc",
      senderWallet: walletAddress,
      receiverWallet: btcAddress,
      zkProof,
    });

    // ============================================
    // Return enriched response
    // ============================================
    return NextResponse.json({
      transactionHash: executionResult.escrow?.transactionHash || "0x0",
      strkAmount,
      btcAmount: expectedBtcAmount,
      rate: rate.toFixed(8),
      status: executionResult.finalStatus || "pending",
      proofHash: executionResult.proof.onchainProofHash || executionResult.proof.offchainProof || "0x0",
      priceData: {
        strkPrice: strkPrice.formattedPrice,
        btcPrice: btcPrice.formattedPrice,
        timestamp: Date.now(),
      },
      web3Execution: executionResult.steps || [],
      message: `Successfully initiated STRK → BTC bridge swap. Sending ${strkAmount} STRK to receive ${expectedBtcAmount.toFixed(
        8
      )} BTC`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sell STRK error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/otc/sell-strk",
    method: "POST",
    description: "Bridge STRK to BTC via on-chain contract",
    body: {
      walletAddress: "string (Starknet address)",
      btcAddress: "string (Bitcoin address)",
      strkAmount: "number (STRK amount)",
      minBtcReceive: "number (minimum BTC output for slippage protection)",
    },
  });
}
