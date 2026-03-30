import { NextResponse } from "next/server";

import { ensureApiKeyIfConfigured } from "@/lib/server/executionGateway";
import { settleMatchWithCrossChain } from "@/lib/server/otcStateStore";

export const runtime = "nodejs";

interface SettleBody {
  matchId?: string;
  walletAddress?: string;
}

export async function POST(request: Request) {
  try {
    ensureApiKeyIfConfigured(request);
    const body = (await request.json()) as SettleBody;

    if (!body.matchId) {
      return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
    }

    // Validate that both participants are confirmed and escrows are ready
    // The actual validation happens in settleMatchWithCrossChain

    const settled = await settleMatchWithCrossChain(body.matchId, body.walletAddress);
    
    return NextResponse.json({
      success: true,
      match: settled,
      message: "Settlement completed successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const unauthorized = message.includes("Unauthorized");
    const statusCode = message.includes("not found") ? 404 : 
                       message.includes("Both") ? 409 : 
                       message.includes("Invalid") ? 400 : 500;
    
    return NextResponse.json(
      { error: message, code: statusCode === 409 ? "SETTLEMENT_NOT_READY" : "SETTLEMENT_FAILED" },
      { status: statusCode }
    );
  }
}
