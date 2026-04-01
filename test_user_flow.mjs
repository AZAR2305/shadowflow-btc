/**
 * User Flow Simulation Script
 * Simulates executing OTC requests using the provided actual wallet addresses.
 */

import fetch from "node-fetch";

const API_BASE = "http://localhost:3000/api";

const BTC_WALLET = "tb1qjps0vffsezm9lqdnkxxy5fgs622wmwk0mrszvw";
const STARKNET_WALLET = "0x02398452a29FD0f4a6FBbB984595Dac412a1483E70B9FC59E16Ba59B80330c24";

async function runSimulation() {
  console.log("🧪 Starting ShadowFlow End-to-End User Flow Simulation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`📡 Wallet Bindings Loaded:`);
  console.log(`   Bitcoin (Testnet4): ${BTC_WALLET}`);
  console.log(`   Starknet (Ready):   ${STARKNET_WALLET}\n`);

  try {
    // 1. Fetching Live Prices precisely mapping to the backend's Oracle
    console.log("▶ STEP 1: Requesting Live Prices from Pyth Oracle (Hermes Network)...");
    
    // Using exactly the Pyth feeds your backend PythPriceService handles
    const btcId = 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
    const strkId = '6a182399ff70ccf3e06024898942028204125a819e519a335ffa4579e66cd870';
    
    const pythReq = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${btcId}&ids[]=${strkId}`);
    const pythData = await pythReq.json();

    const prices = pythData.parsed;
    const formatPrice = (p) => parseFloat(p.price) * Math.pow(10, p.expo);
    
    const btcPrice = formatPrice(prices[0].price);
    const strkPrice = formatPrice(prices[1].price);
    const oracleRate = btcPrice / strkPrice;

    console.log(`   ✅ Synced Live Oracle Exchange Metrics:`);
    console.log(`      BTC:  $${btcPrice.toFixed(2)}`);
    console.log(`      STRK: $${strkPrice.toFixed(2)}`);

    const btcAmount = 0.005;
    const expectedStrk = btcAmount * oracleRate;
    console.log(`   💡 Sending ${btcAmount} BTC → Target Receiving EXACTLY ${expectedStrk} STRK`);

    // 2. Clear Previous Mock Execution States natively via the backend API
    console.log("\n▶ STEP 2: Clearing Stale Internal State/Locks...");
    await fetch(`${API_BASE}/otc/intents?scope=all`, { method: "DELETE" });

    // 3. Creating an Intent (Simulating confirming the OTC trade)
    console.log("\n▶ STEP 3: Submitting OTC Intent and Executing Web3 Flow ...");
    
    // Exact payload structure matching app/api/otc/intents/route.ts
    const intentPayload = {
      walletAddress: BTC_WALLET,
      direction: "buy",
      templateId: "simple",
      selectedPath: "ShadowFlow Router V1",
      amount: btcAmount,
      priceThreshold: expectedStrk,
      sendChain: "btc",
      receiveChain: "strk",
      receiveWalletAddress: STARKNET_WALLET,
      // Essential parameters for immediate settlement verification
      depositConfirmed: true,
      depositAmount: btcAmount
    };

    const intentRes = await fetch(`${API_BASE}/otc/intents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intentPayload)
    });

    if (!intentRes.ok) {
        console.error(`   ❌ Failed to submit intent: HTTP ${intentRes.status}`);
        const errData = await intentRes.text();
        console.error(`      Server says: ${errData}`);
    } else {
        const intentData = await intentRes.json();
        console.log(`   ✅ Trade Intent Registered Securely!`);
        if (intentData.priceVerification) {
          console.log(`      Oracle Verification: ${intentData.priceVerification.verified ? "Passed ✓" : "Failed ✗"} (Deviation: ${intentData.priceVerification.deviation})`);
        }
        if (intentData.zkProof) {
          console.log(`      ZK Proof Generated:  ${intentData.zkProof.verified ? "Passed ✓" : "Failed ✗"} Hash: ${intentData.zkProof.proofHash}`);
        }
        if (intentData.web3Execution) {
          console.log(`      Web3 Settled:  Status: ${intentData.web3Execution.status}`);
          console.log(`      Bridge Executed: ${intentData.web3Execution.bridgeExecuted ? "Yes" : "No"}`);
          console.log(`      Bridge Tx Hash: ${intentData.web3Execution.bridgeTxHash ?? "N/A (no real on-chain swap tx)"}`);
          if (!intentData.web3Execution.bridgeTxHash) {
            throw new Error("No real bridge transaction hash returned.");
          }
        }
    }

    console.log("\n🚀 SIMULATION COMPLETE\n");
  } catch (error) {
    console.error("❌ Fatal Error during Simulation:", error);
  }
}

runSimulation();
