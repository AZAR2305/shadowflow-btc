import { NextResponse } from "next/server";
import { ensureApiKeyIfConfigured } from "@/lib/server/executionGateway";
import { Account, RpcProvider } from "starknet";

export const runtime = "nodejs";

interface AddReservesBody {
  amount: string;
  chain?: "btc" | "strk";
}

/**
 * POST /api/otc/liquidity/add-reserves
 * Add STRK or BTC liquidity to the bridge pool
 * Admin only - uses executor account
 */
export async function POST(request: Request) {
  try {
    ensureApiKeyIfConfigured(request);
    const body = (await request.json()) as AddReservesBody;

    if (!body.amount) {
      return NextResponse.json(
        { error: "Missing amount parameter" },
        { status: 400 }
      );
    }

    const amount = BigInt(body.amount);
    if (amount <= 0n) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    const chain = body.chain || "strk";

    // Get executor account
    const executorAddress = process.env.STARKNET_EXECUTOR_ADDRESS;
    const executorPrivateKey = process.env.STARKNET_EXECUTOR_PRIVATE_KEY;

    console.log(`[LIQUIDITY] Env check:`, {
      executorAddress: executorAddress ? `${executorAddress.substring(0, 10)}...` : "UNDEFINED",
      executorPrivateKey: executorPrivateKey ? `${executorPrivateKey.substring(0, 10)}...` : "UNDEFINED",
      allEnvKeys: Object.keys(process.env).filter(k => k.includes("STARKNET") || k.includes("EXECUTOR")).slice(0, 20)
    });

    if (!executorAddress || !executorPrivateKey) {
      return NextResponse.json(
        { error: "Executor account not configured", executorAddress, executorPrivateKey: executorPrivateKey ? "SET" : "MISSING" },
        { status: 500 }
      );
    }

    const rpcUrl =
      process.env.NEXT_PUBLIC_STARKNET_RPC_URL ||
      process.env.STARKNET_RPC_URL ||
      "https://api.starknet.io";
    
    console.log(`[LIQUIDITY] RPC URL: ${rpcUrl}`);
    console.log(`[LIQUIDITY] Executor: ${executorAddress}`);
    
    const provider = new RpcProvider({ nodeUrl: rpcUrl });
    const account = new Account({
      provider,
      address: executorAddress,
      signer: executorPrivateKey,
    });

    // Helper to encode u256 as two felt252 (low, high)
    const encodeU256 = (value: bigint): [string, string] => {
      const U128_MASK = (1n << 128n) - 1n;
      const v = value < 0n ? 0n : value;
      const low = v & U128_MASK;
      const high = v >> 128n;
      return [low.toString(), high.toString()];
    };

    if (chain === "strk") {
      // Add STRK reserves to BUY_STRK contract
      const buyStrkAddress =
        process.env.NEXT_PUBLIC_BUY_STRK_ADDRESS ||
        process.env.BUY_STRK_CONTRACT_ADDRESS;

      const strkTokenAddress =
        process.env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS ||
        process.env.STRK_TOKEN_ADDRESS ||
        "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

      if (!buyStrkAddress) {
        return NextResponse.json(
          {
            error: "BUY_STRK contract address not configured",
          },
          { status: 400 }
        );
      }

      console.log(
        `[LIQUIDITY] Adding ${amount.toString()} STRK to ${buyStrkAddress}...`
      );

      // First, approve STRK token for the BUY_STRK contract to spend
      console.log(`[LIQUIDITY] Approving STRK tokens...`);
      const [approveLow, approveHigh] = encodeU256(amount);
      const approveInvoke = await account.execute({
        contractAddress: strkTokenAddress,
        entrypoint: "approve",
        calldata: [buyStrkAddress, approveLow, approveHigh],
      });

      console.log(`[LIQUIDITY] Approval tx: ${approveInvoke.transaction_hash}`);
      
      // Wait for approval with timeout
      try {
        const waitPromise = provider.waitForTransaction(approveInvoke.transaction_hash);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Approval wait timeout after 30s")), 30000)
        );
        await Promise.race([waitPromise, timeoutPromise]);
      } catch (waitError) {
        console.warn(`[LIQUIDITY] Approval wait issue: ${waitError instanceof Error ? waitError.message : String(waitError)}`);
      }

      // Now add reserves
      console.log(`[LIQUIDITY] Adding reserves...`);
      // For u256, pass as [low, high]
      const [strkLow, strkHigh] = encodeU256(amount);
      const calldata = [strkLow, strkHigh];
      console.log(`[LIQUIDITY] Calldata: ${JSON.stringify(calldata)}`);

      const invoke = await account.execute({
        contractAddress: buyStrkAddress,
        entrypoint: "add_strk_reserves",
        calldata: calldata,
      });

      console.log(`[LIQUIDITY] Transaction: ${invoke.transaction_hash}`);
      
      // Wait for transaction with a 30-second timeout
      try {
        const waitPromise = provider.waitForTransaction(invoke.transaction_hash);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Transaction wait timeout after 30s")), 30000)
        );
        await Promise.race([waitPromise, timeoutPromise]);
      } catch (waitError) {
        console.warn(`[LIQUIDITY] Transaction wait issue: ${waitError instanceof Error ? waitError.message : String(waitError)}`);
        // Continue anyway - the transaction was submitted, just may not be confirmed yet
      }

      return NextResponse.json({
        success: true,
        message: "STRK liquidity added successfully",
        chain: "strk",
        amount: amount.toString(),
        transactionHash: invoke.transaction_hash,
      });
    } else if (chain === "btc") {
      const sellStrkAddress =
        process.env.NEXT_PUBLIC_SELL_STRK_ADDRESS ||
        process.env.SELL_STRK_CONTRACT_ADDRESS;

      const btcTokenAddress =
        process.env.NEXT_PUBLIC_BTC_TOKEN_ADDRESS ||
        process.env.BTC_TOKEN_ADDRESS;

      if (!sellStrkAddress) {
        return NextResponse.json(
          {
            error: "SELL_STRK contract address not configured",
          },
          { status: 400 }
        );
      }

      if (btcTokenAddress) {
        // Approve BTC token if we have a token address
        console.log(`[LIQUIDITY] Approving BTC tokens...`);
        const [approveLow, approveHigh] = encodeU256(amount);
        const approveInvoke = await account.execute({
          contractAddress: btcTokenAddress,
          entrypoint: "approve",
          calldata: [sellStrkAddress, approveLow, approveHigh],
        });

        console.log(`[LIQUIDITY] BTC Approval tx: ${approveInvoke.transaction_hash}`);
        
        // Wait for approval with timeout
        try {
          const waitPromise = provider.waitForTransaction(approveInvoke.transaction_hash);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Approval wait timeout after 30s")), 30000)
          );
          await Promise.race([waitPromise, timeoutPromise]);
        } catch (waitError) {
          console.warn(`[LIQUIDITY] BTC approval wait issue: ${waitError instanceof Error ? waitError.message : String(waitError)}`);
        }
      }

      console.log(
        `[LIQUIDITY] Adding ${amount.toString()} BTC to ${sellStrkAddress}...`
      );

      // For u256, pass as [low, high]
      const [btcLow, btcHigh] = encodeU256(amount);
      const calldata = [btcLow, btcHigh];
      console.log(`[LIQUIDITY] Calldata: ${JSON.stringify(calldata)}`);

      const invoke = await account.execute({
        contractAddress: sellStrkAddress,
        entrypoint: "add_btc_reserve",
        calldata: calldata,
      });

      console.log(`[LIQUIDITY] Transaction: ${invoke.transaction_hash}`);
      
      // Wait for transaction with a 30-second timeout
      try {
        const waitPromise = provider.waitForTransaction(invoke.transaction_hash);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Transaction wait timeout after 30s")), 30000)
        );
        await Promise.race([waitPromise, timeoutPromise]);
      } catch (waitError) {
        console.warn(`[LIQUIDITY] Transaction wait issue: ${waitError instanceof Error ? waitError.message : String(waitError)}`);
        // Continue anyway - the transaction was submitted, just may not be confirmed yet
      }

      return NextResponse.json({
        success: true,
        message: "BTC liquidity added successfully",
        chain: "btc",
        amount: amount.toString(),
        transactionHash: invoke.transaction_hash,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid chain. Must be 'btc' or 'strk'" },
        { status: 400 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[LIQUIDITY] Error:", message);
    console.error("[LIQUIDITY] Stack:", stack);
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}

/**
 * GET /api/otc/liquidity/add-reserves?action=info
 * Get liquidity pool info and requirements
 */
export async function GET(request: Request) {
  try {
    ensureApiKeyIfConfigured(request);

    return NextResponse.json({
      info: "STRK Liquidity Management",
      endpoint: "POST /api/otc/liquidity/add-reserves",
      description: "Add liquidity to bridge reserves (admin only)",
      parameters: {
        amount: {
          type: "string",
          description:
            "Amount in token base units (e.g., '1000000000000000000' for 1 STRK with 18 decimals)",
          required: true,
          example: "1000000000000000000",
        },
        chain: {
          type: "string",
          description: "Chain to add liquidity for",
          required: false,
          default: "strk",
          allowed: ["btc", "strk"],
        },
      },
      examples: {
        addStrkLiquidity: {
          curl: `curl -X POST http://localhost:3000/api/otc/liquidity/add-reserves \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": "1000000000000000000", "chain": "strk"}'`,
          description: "Add 1 STRK to reserves (assuming 18 decimals)",
        },
        addBtcLiquidity: {
          curl: `curl -X POST http://localhost:3000/api/otc/liquidity/add-reserves \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": "100000000", "chain": "btc"}'`,
          description:
            "Add 1 BTC to reserves (100000000 satoshis = 1 BTC with 8 decimals)",
        },
      },
      requirements: {
        authorization: "Admin API key required",
        executor: "STARKNET_EXECUTOR_ADDRESS and STARKNET_EXECUTOR_PRIVATE_KEY must be set",
        balance: "Executor account must have STRK or BTC tokens to transfer",
      },
      troubleshooting: {
        "error: Contract not configured": "Set BUY_STRK_ADDRESS or SELL_STRK_ADDRESS in .env",
        "error: Transfer failed": "Ensure executor has sufficient STRK/BTC balance",
        "error: Invalid amount": "Amount must be > 0 and in correct base units",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
