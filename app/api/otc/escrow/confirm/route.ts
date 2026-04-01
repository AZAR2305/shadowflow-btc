import { NextResponse } from "next/server";

import { ensureApiKeyIfConfigured } from "@/lib/server/executionGateway";
import { confirmEscrowDeposit } from "@/lib/server/otcStateStore";

export const runtime = "nodejs";

interface EscrowConfirmBody {
  matchId?: string;
  walletAddress?: string;
}

export async function POST(request: Request) {
  try {
    ensureApiKeyIfConfigured(request);
    const body = (await request.json()) as EscrowConfirmBody;

    if (!body.matchId || !body.walletAddress) {
      return NextResponse.json(
        { error: "Missing matchId or walletAddress" },
        { status: 400 },
      );
    }

    const updated = await confirmEscrowDeposit(body.matchId, body.walletAddress);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const unauthorized = message.includes("Unauthorized");
    return NextResponse.json({ error: message }, { status: unauthorized ? 401 : 500 });
  }
}
