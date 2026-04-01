import { NextResponse } from "next/server";
import { ensureApiKeyIfConfigured } from "@/lib/server/executionGateway";
import { DiagnosticService } from "@/lib/server/diagnosticService";

export const runtime = "nodejs";

/**
 * GET /api/otc/diagnostics - View current diagnostic patterns and recommendations
 * POST /api/otc/diagnostics - Log a new diagnostic issue
 * GET /api/otc/diagnostics/faucets?chain=strk - Get faucet recommendations
 * GET /api/otc/diagnostics/export - Export full diagnostic data
 */

export async function GET(request: Request) {
  try {
    ensureApiKeyIfConfigured(request);
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "report";
    const chain = (searchParams.get("chain") || "strk") as "btc" | "strk";

    const diagnosticService = DiagnosticService.getInstance();

    switch (action) {
      case "report":
        // Return iteration report with patterns and next steps
        return NextResponse.json(diagnosticService.getIterationReport());

      case "patterns":
        // Return detailed issue patterns
        return NextResponse.json(diagnosticService.getIssuePatterns());

      case "faucets":
        // Return faucet recommendations for specified chain
        const suggestions = await diagnosticService.getLiquiditySuggestions(
          chain === "strk" ? "STRK" : "BTC",
          chain,
          0 // No specific amount required for this query
        );
        return NextResponse.json(suggestions);

      case "export":
        // Export all diagnostics as JSON for external analysis
        const exportData = diagnosticService.exportDiagnostics();
        // Set headers to prompt download as file
        const response = NextResponse.json(exportData);
        response.headers.set(
          "Content-Disposition",
          `attachment; filename="shadowflow-diagnostics-${Date.now()}.json"`
        );
        return response;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const unauthorized = message.includes("Unauthorized");
    return NextResponse.json(
      { error: message },
      { status: unauthorized ? 401 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    ensureApiKeyIfConfigured(request);
    const body = await request.json() as {
      action?: string;
      category?: string;
      error?: string;
      sendChain?: string;
      receiveChain?: string;
      amount?: number;
      issueId?: string;
      resolution?: string;
    };

    const diagnosticService = DiagnosticService.getInstance();

    if (body.action === "resolve" && body.issueId && body.resolution) {
      // Resolve a previously logged issue
      diagnosticService.resolveIssue(body.issueId, body.resolution);
      return NextResponse.json({
        success: true,
        message: `Issue ${body.issueId} marked as resolved`,
      });
    }

    if (
      body.category &&
      body.error &&
      body.sendChain &&
      body.receiveChain &&
      body.amount
    ) {
      // Log a new diagnostic issue
      diagnosticService.logIssue(
        body.category,
        body.error,
        body.sendChain,
        body.receiveChain,
        body.amount
      );

      // Return liquidity suggestions if it's a liquidity issue
      if (body.category === "insufficient_liquidity") {
        const suggestions = await diagnosticService.getLiquiditySuggestions(
          body.receiveChain === "strk" ? "STRK" : "BTC",
          body.receiveChain as "btc" | "strk",
          body.amount
        );
        return NextResponse.json({
          success: true,
          message: "Issue logged and liquidity suggestions generated",
          suggestions,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Issue logged for iteration",
        report: diagnosticService.getIterationReport(),
      });
    }

    return NextResponse.json(
      { error: "Missing required fields: category, error, sendChain, receiveChain, amount" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const unauthorized = message.includes("Unauthorized");
    return NextResponse.json(
      { error: message },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
