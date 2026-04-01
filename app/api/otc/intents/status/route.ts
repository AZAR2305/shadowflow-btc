import { NextResponse } from "next/server";
import { OtcMatchingService } from "@/lib/server/otcMatchingService";

/**
 * GET /api/otc/intents/status?intentId=0x...
 * Check the status of a pending intent
 * Returns match details if a match was found
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const intentId = searchParams.get("intentId");

    if (!intentId) {
      return NextResponse.json(
        { error: "Missing intentId query parameter" },
        { status: 400 }
      );
    }

    const matchingService = OtcMatchingService.getInstance();
    const intent = matchingService.getIntent(intentId);

    console.log(`[STATUS-CHECK] Intent ${intentId.slice(0, 10)}...`);
    console.log(`[STATUS-CHECK] Found intent:`, !!intent);
    
    if (!intent) {
      // Get all pending intents for debugging
      const allIntents = matchingService.getPendingIntents();
      console.log(`[STATUS-CHECK] Total pending intents in system: ${allIntents.length}`);
      
      return NextResponse.json(
        { 
          error: "Intent not found", 
          intentId,
          totalPendingIntents: allIntents.length,
          debug: allIntents.map(i => ({ id: i.intentId.slice(0, 10) + '...', status: i.status }))
        },
        { status: 404 }
      );
    }

    // Check if expired
    if (intent.expiresAt < Date.now()) {
      return NextResponse.json({
        intentId,
        status: "expired",
        message: "Intent has expired. Please submit a new intent.",
        expiresAt: intent.expiresAt,
        expiredAt: Date.now(),
      });
    }

    // Check if matched
    if (intent.matchedWith) {
      // Find the match object
      let match = null;
      for (const m of matchingService.getActiveMatches()) {
        if ((m.intentA === intentId && m.intentB === intent.matchedWith) ||
            (m.intentB === intentId && m.intentA === intent.matchedWith)) {
          match = m;
          break;
        }
      }

      if (match) {
        const otherIntentId = match.intentA === intentId ? match.intentB : match.intentA;
        const otherIntent = matchingService.getIntent(otherIntentId);

        return NextResponse.json({
          intentId,
          status: "matched",
          matchId: match.matchId,
          message: "✅ Match found! Waiting for both parties to sign.",
          match: {
            matchId: match.matchId,
            matchedAt: match.matchedAt,
            status: match.status,
            partyA: {
              wallet: match.partyA.wallet,
              sendAmount: match.partyA.sendAmount,
              sendChain: match.partyA.sendChain,
              receiveAmount: match.partyA.receiveAmount,
              receiveChain: match.partyA.receiveChain,
              signed: intentId === match.intentA ? !!intent.signature : !!otherIntent?.signature,
            },
            partyB: {
              wallet: match.partyB.wallet,
              sendAmount: match.partyB.sendAmount,
              sendChain: match.partyB.sendChain,
              receiveAmount: match.partyB.receiveAmount,
              receiveChain: match.partyB.receiveChain,
              signed: intentId === match.intentB ? !!intent.signature : !!otherIntent?.signature,
            },
          },
          nextAction: {
            description: "Both parties need to sign the intent",
            yourStatus: intent.signature ? "✅ Signed" : "⏳ Waiting for your signature",
            theirStatus: otherIntent?.signature ? "✅ Signed" : "⏳ Waiting for other party",
            readyToExecute: !!(intent.signature && otherIntent?.signature),
            endpoint: !!(intent.signature && otherIntent?.signature) 
              ? "POST /api/otc/intents?step=execute"
              : "Keep polling this endpoint",
          },
          expiresAt: intent.expiresAt,
          timeRemaining: Math.max(0, intent.expiresAt - Date.now()),
        });
      }
    }

    // Still pending, no match yet
    return NextResponse.json({
      intentId,
      status: "pending",
      message: "⏳ Waiting for a matching user...",
      intent: {
        sendAmount: intent.sendAmount,
        sendChain: intent.sendChain,
        receiveAmount: intent.receiveAmount,
        receiveChain: intent.receiveChain,
        senderWallet: intent.senderWallet,
        signed: !!intent.signature,
      },
      matchingInfo: {
        lookingFor: `User who wants to swap ${intent.receiveAmount} ${intent.receiveChain.toUpperCase()} → ${intent.sendAmount} ${intent.sendChain.toUpperCase()}`,
        timeWaiting: Date.now() - intent.createdAt,
      },
      nextAction: {
        description: "Keep polling for matches or switch to liquidity pool",
        options: [
          {
            name: "Keep waiting for peer",
            endpoint: "GET /api/otc/intents/status?intentId=" + intentId,
            pollInterval: "2-3 seconds",
            maxWaitTime: intent.expiresAt - Date.now(),
          },
          {
            name: "Switch to liquidity pool fallback",
            endpoint: "POST /api/otc/intents?step=execute",
            params: {
              intentId,
              signature: "your_wallet_signature",
              fallbackMode: "use_liquidity",
            },
          },
        ],
      },
      expiresAt: intent.expiresAt,
      timeRemaining: Math.max(0, intent.expiresAt - Date.now()),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
