/**
 * Two-user OTC matching test
 * 1) Clears state
 * 2) Submits buyer intent (STRK -> BTC)
 * 3) Submits seller intent (BTC -> STRK)
 * 4) Reads matches for both wallets
 */

import fetch from "node-fetch";

const API_BASE = "http://localhost:3000/api";

const BUYER_WALLET = "0x02398452a29FD0f4a6FBbB984595Dac412a1483E70B9FC59E16Ba59B80330c24";
const SELLER_WALLET = "tb1qseller0vffsezm9lqdnkxxy5fgs622wmwk0fghij";
const BUYER_RECEIVE_STRK = "0x0731ce505c05b6ebb89e07553c6d2d38ec1d6672dd217e7af4e2f8261fe0274e";
const SELLER_RECEIVE_BTC = "tb1qjps0vffsezm9lqdnkxxy5fgs622wmwk0mrszvw";

const BTC_ID = "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
const STRK_ID = "6a182399ff70ccf3e06024898942028204125a819e519a335ffa4579e66cd870";

const formatPrice = (p) => parseFloat(p.price) * Math.pow(10, p.expo);

async function main() {
  console.log("🧪 Two-user matching test starting...");

  const pythRes = await fetch(
    `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${BTC_ID}&ids[]=${STRK_ID}`,
  );
  const pythData = await pythRes.json();
  const btc = formatPrice(pythData.parsed[0].price);
  const strk = formatPrice(pythData.parsed[1].price);

  const btcPerStrk = strk / btc;
  const strkPerBtc = btc / strk;

  // Buyer sends STRK and wants BTC.
  const buyerSendStrk = 1000;
  const buyerReceiveBtc = buyerSendStrk * btcPerStrk;

  // Seller sends BTC and wants STRK.
  const sellerSendBtc = 0.001;
  const sellerReceiveStrk = sellerSendBtc * strkPerBtc;

  await fetch(`${API_BASE}/otc/intents?scope=all`, { method: "DELETE" });
  console.log("✅ Cleared state");

  const buyerIntent = {
    walletAddress: BUYER_WALLET,
    direction: "buy",
    templateId: "simple",
    selectedPath: "btc_otc_main",
    amount: buyerSendStrk,
    priceThreshold: buyerReceiveBtc,
    sendChain: "strk",
    receiveChain: "btc",
    receiveWalletAddress: SELLER_RECEIVE_BTC,
    depositConfirmed: true,
    depositAmount: 100,
  };

  const buyerRes = await fetch(`${API_BASE}/otc/intents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buyerIntent),
  });
  console.log("buyer intent:", buyerRes.status);

  const sellerIntent = {
    walletAddress: SELLER_WALLET,
    direction: "sell",
    templateId: "simple",
    selectedPath: "btc_otc_main",
    amount: sellerSendBtc,
    priceThreshold: sellerReceiveStrk,
    sendChain: "btc",
    receiveChain: "strk",
    receiveWalletAddress: BUYER_RECEIVE_STRK,
    depositConfirmed: true,
    depositAmount: 0.001,
  };

  const sellerRes = await fetch(`${API_BASE}/otc/intents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sellerIntent),
  });
  console.log("seller intent:", sellerRes.status);

  const buyerMatchesRes = await fetch(
    `${API_BASE}/otc/matches?walletAddress=${encodeURIComponent(BUYER_WALLET)}`,
  );
  const sellerMatchesRes = await fetch(
    `${API_BASE}/otc/matches?walletAddress=${encodeURIComponent(SELLER_WALLET)}`,
  );

  const buyerMatches = await buyerMatchesRes.json();
  const sellerMatches = await sellerMatchesRes.json();

  console.log(`buyer matches: ${buyerMatches.length}`);
  console.log(`seller matches: ${sellerMatches.length}`);
  if (buyerMatches[0]) {
    console.log("top match:", {
      id: buyerMatches[0].id,
      status: buyerMatches[0].status,
      amount: buyerMatches[0].amount,
      price: buyerMatches[0].price,
    });
  }
}

main().catch((err) => {
  console.error("❌ two-user matching test failed:", err);
  process.exit(1);
});

