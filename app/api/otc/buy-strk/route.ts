import { NextRequest, NextResponse } from "next/server";
import { Web3IntegrationService } from "@/lib/server/web3IntegrationService";
import { PythPriceService } from "@/lib/server/pythPriceService";
import { ZKProofService } from "@/lib/server/zkProofService";

/**
 * POST /api/otc/buy-strk
 * Bridge BTC → STRK
 *
 * Body:
 *   {
 *     walletAddress: string,              // Starknet recipient address
 *     btcAddress: string,                 // BTC sender address
 *     btcAmount: number,                  // Amount of BTC to send
 *     minStrkReceive: number,             // Minimum STRK to accept (slippage protection)
 *   }
 *
 * Response:
 *   {
 *     transactionHash: string,
 *     btcAmount: number,
 *     strkAmount: number,
 *     rate: number,                       // STRK per BTC
 *     status: "pending" | "confirmed",
 *     proofHash: string,
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, btcAddress, btcAmount, minStrkReceive } = body;

    // ============================================
    // Validation
    // ============================================
    if (!walletAddress || !btcAddress || !btcAmount || btcAmount <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields: walletAddress, btcAddress, btcAmount" },
        { status: 400 }
      );
    }

    // ============================================
    // Step 1: Fetch current BTC/STRK rate from Pyth
    // ============================================
    const pythService = PythPriceService.getInstance();
    const btcPrice = await pythService.getPrice('BTC');
    const strkPrice = await pythService.getPrice('STRK');

    const rate = btcPrice.formattedPrice / strkPrice.formattedPrice; // STRK per BTC
    const expectedStrkAmount = btcAmount * rate;

    if (expectedStrkAmount < minStrkReceive) {
      return NextResponse.json(
        {
          error: `Expected STRK (${expectedStrkAmount}) below minimum (${minStrkReceive})`,
          expectedStrkAmount,
          minStrkReceive,
        },
        { status: 400 }
      );
    }

    // ============================================
    // Step 3: Execute full Web3 flow
    // ============================================
    const web3Service = Web3IntegrationService.getInstance();

    const intentId = `buy-strk-${Date.now()}`
    const zkProof = ZKProofService.generatePriceVerifiedIntentProof(
      intentId,
      btcAmount.toString(),
      "btc",
      expectedStrkAmount.toString(),
      "strk",
      rate,
      btcAddress,
      walletAddress,
    );

    const executionResult = await web3Service.executeIntentWithFullFlow({
      intentId,
      sendAmount: btcAmount.toString(),
      sendChain: "btc",
      receiveAmount: expectedStrkAmount.toString(),
      receiveChain: "strk",
      senderWallet: btcAddress,
      receiverWallet: walletAddress,
      zkProof,
    });

    // ============================================
    // Return enriched response
    // ============================================
    return NextResponse.json({
      transactionHash: executionResult.escrow?.transactionHash || "0x0",
      btcAmount,
      strkAmount: expectedStrkAmount,
      rate: rate.toFixed(2),
      status: executionResult.finalStatus || "pending",
      proofHash: executionResult.proof.onchainProofHash || executionResult.proof.offchainProof || "0x0",
      priceData: {
        btcPrice: parseFloat(btcPrice.price),
        strkPrice: parseFloat(strkPrice.price),
        timestamp: Date.now(),
      },
      web3Execution: executionResult.steps || [],
      message: `Successfully initiated BTC → STRK bridge swap. Sending ${btcAmount} BTC to receive ${expectedStrkAmount.toFixed(
        2
      )} STRK`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Buy STRK error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/otc/buy-strk",
    method: "POST",
    description: "Bridge BTC to STRK via on-chain contract",
    body: {
      walletAddress: "string (Starknet address)",
      btcAddress: "string (Bitcoin address)",
      btcAmount: "number (BTC amount)",
      minStrkReceive: "number (minimum STRK output for slippage protection)",
    },
  });
}
