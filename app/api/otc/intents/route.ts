import { NextResponse } from "next/server";

import { ensureApiKeyIfConfigured } from "@/lib/server/executionGateway";
import { clearOtcState, submitIntent } from "@/lib/server/otcStateStore";
import { CrossChainService } from "@/lib/server/crossChainService";
import { PythPriceService } from "@/lib/server/pythPriceService";
import { ZKProofService } from "@/lib/server/zkProofService";
import { EscrowContractService } from "@/lib/server/escrowContractService";
import { Web3IntegrationService } from "@/lib/server/web3IntegrationService";

export const runtime = "nodejs";

interface IntentBody {
  walletAddress?: string;
  direction?: "buy" | "sell";
  templateId?: "simple" | "split" | "guarded";
  priceThreshold?: number;
  amount?: number;
  splitCount?: number;
  selectedPath?: string;
  depositConfirmed?: boolean;
  depositAmount?: number;
  sendChain?: "btc" | "strk";
  receiveChain?: "btc" | "strk";
  receiveWalletAddress?: string;
}

export async function POST(request: Request) {
  try {
    ensureApiKeyIfConfigured(request);
    const body = (await request.json()) as IntentBody;

    if (!body.walletAddress || !body.direction || !body.templateId || !body.selectedPath) {
      return NextResponse.json(
        { error: "Missing walletAddress, direction, templateId, or selectedPath" },
        { status: 400 },
      );
    }

    const amount = Number(body.amount ?? 0);
    let priceThreshold = Number(body.priceThreshold ?? 0);
    const splitCount = Number(body.splitCount ?? 1);
    const depositAmount = Number(body.depositAmount ?? 0);
    const sendChain = body.sendChain ?? "strk";
    const receiveChain = body.receiveChain ?? "btc";
    const receiveWalletAddress = body.receiveWalletAddress ?? "";

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid amount (must be > 0)" },
        { status: 400 },
      );
    }

    if (!receiveWalletAddress) {
      return NextResponse.json(
        { error: "receiveWalletAddress is required for cross-chain settlement" },
        { status: 400 },
      );
    }

    if (sendChain === receiveChain) {
      return NextResponse.json(
        { error: "Send and receive chains must be different" },
        { status: 400 },
      );
    }

    // Validate wallet addresses for their respective chains
    if (!CrossChainService.validateWalletAddress(body.walletAddress, sendChain)) {
      return NextResponse.json(
        { error: `Invalid wallet address for ${sendChain} chain (expected ${sendChain === "btc" ? "bc1q..." : "0x..."})` },
        { status: 400 },
      );
    }
    if (!CrossChainService.validateWalletAddress(receiveWalletAddress, receiveChain)) {
      return NextResponse.json(
        { error: `Invalid receive wallet address for ${receiveChain} chain (expected ${receiveChain === "btc" ? "bc1q..." : "0x..."})` },
        { status: 400 },
      );
    }

    // ============================================
    // NEW: Get live prices from Pyth Oracle
    // ============================================
    const pythService = PythPriceService.getInstance();
    const btcPrice = await pythService.getPrice('BTC');
    const strkPrice = await pythService.getPrice('STRK');

    if (!btcPrice || !strkPrice) {
      return NextResponse.json(
        { error: 'Failed to fetch live prices from Pyth Oracle' },
        { status: 500 }
      );
    }

    // Calculate conversion rate and verify stated price.
    // statedRate must be in the same direction as the oracle:
    //   statedRate = receiveAmount / sendAmount
    // where send/receive chains are user-selected.
    const oracleRate =
      sendChain === "btc"
        ? btcPrice.formattedPrice / strkPrice.formattedPrice // STRK per BTC
        : strkPrice.formattedPrice / btcPrice.formattedPrice; // BTC per STRK

    // If the client didn't provide (or provided 0) the receive amount,
    // compute the oracle-equal CRT receive amount on the server.
    if (!Number.isFinite(priceThreshold) || priceThreshold <= 0) {
      priceThreshold = amount * oracleRate;
    }

    const statedRate = priceThreshold / amount; // receiveAmount / sendAmount

    // Verify price is within 1% tolerance of oracle
    const rateTolerance = 0.01; // 1%
    const priceDeviation = Math.abs(statedRate - oracleRate) / oracleRate;

    if (priceDeviation > rateTolerance) {
      return NextResponse.json(
        {
          error: 'Stated exchange rate deviates too much from oracle price',
          details: {
            oracleRate: oracleRate.toFixed(8),
            statedRate: statedRate.toFixed(8),
            deviation: (priceDeviation * 100).toFixed(2) + '%',
            maxTolerance: (rateTolerance * 100) + '%',
          }
        },
        { status: 400 }
      );
    }

    // ============================================
    // NEW: Generate ZK Proof with price verification
    // ============================================
    const intentId = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;
    
    const zkProof = ZKProofService.generatePriceVerifiedIntentProof(
      intentId,
      amount.toString(),
      sendChain as 'btc' | 'strk',
      priceThreshold.toString(),
      receiveChain as 'btc' | 'strk',
      oracleRate,
      body.walletAddress,
      receiveWalletAddress
    );

    // ============================================
    // NEW: Create escrow deposit
    // ============================================
    const escrowService = EscrowContractService.getInstance();
    const escrowTx = await escrowService.depositToEscrow(
      amount.toString(),
      sendChain as 'btc' | 'strk',
      body.walletAddress,
      zkProof.proofHash
    );

    // ============================================
    // Submit intent with all verification data
    // ============================================
    const result = await submitIntent({
      walletAddress: body.walletAddress,
      direction: body.direction,
      templateId: body.templateId,
      priceThreshold,
      amount,
      splitCount,
      selectedPath: body.selectedPath,
      depositConfirmed: Boolean(body.depositConfirmed),
      depositAmount,
      sendChain: sendChain as "btc" | "strk",
      receiveChain: receiveChain as "btc" | "strk",
      receiveWalletAddress,
    });

    // ============================================
    // NEW: Execute full Web3 integration flow
    // (ZK verification + on-chain escrow + liquidity bridge)
    // ============================================
    const web3Service = Web3IntegrationService.getInstance();
    
    let executionResult = { finalStatus: 'failed' };
    try {
      executionResult = await web3Service.executeIntentWithFullFlow({
        intentId,
        sendAmount: amount.toString(),
        sendChain: sendChain as 'btc' | 'strk',
        receiveAmount: priceThreshold.toString(),
        receiveChain: receiveChain as 'btc' | 'strk',
        senderWallet: body.walletAddress,
        receiverWallet: receiveWalletAddress,
        zkProof,
      });
    } catch (web3Error) {
      console.error('Web3 execution error:', web3Error);
      executionResult = { finalStatus: 'failed' };
    }

    // Return enriched response with all verification data
    return NextResponse.json({
      ...result,
      priceVerification: {
        oracleRate: oracleRate.toFixed(8),
        statedRate: statedRate.toFixed(8),
        deviation: (priceDeviation * 100).toFixed(2) + '%',
        verified: priceDeviation <= rateTolerance,
        btcPrice: btcPrice.formattedPrice.toFixed(2),
        strkPrice: strkPrice.formattedPrice.toFixed(2),
        timestamp: Date.now(),
      },
      zkProof: {
        proofHash: zkProof.proofHash,
        verified: zkProof.verified,
        commitment: zkProof.commitment,
        nullifier: zkProof.nullifier,
        timestamp: zkProof.timestamp,
      },
      escrow: {
        transactionHash: escrowTx.transactionHash,
        amount: escrowTx.amount,
        chain: escrowTx.chain,
        status: escrowTx.status,
        timestamp: escrowTx.timestamp,
      },
      web3Execution: {
        status: executionResult.finalStatus,
        steps: (executionResult as any).steps || [],
        proofVerified: (executionResult as any).proof?.verified || false,
        escrowLocked: (executionResult as any).escrow?.status === 'locked',
        bridgeExecuted: (executionResult as any).bridge?.swapExecuted || false,
      },
      message: 'Intent created with full Web3 verification and execution'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const unauthorized = message.includes("Unauthorized");
    return NextResponse.json({ error: message }, { status: unauthorized ? 401 : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    ensureApiKeyIfConfigured(request);
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const walletAddress = searchParams.get("walletAddress") ?? undefined;

    if (scope !== "all" && !walletAddress) {
      return NextResponse.json(
        { error: "Provide scope=all or walletAddress" },
        { status: 400 },
      );
    }

    const result = await clearOtcState(scope === "all" ? "all" : "wallet", walletAddress);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const unauthorized = message.includes("Unauthorized");
    return NextResponse.json({ error: message }, { status: unauthorized ? 401 : 500 });
  }
}
