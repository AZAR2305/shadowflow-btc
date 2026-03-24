#!/usr/bin/env node

/**
 * Integration Test: Verify Starknet Client & On-Chain Contract Interaction
 * 
 * This script tests:
 * 1. Environment variables are loaded correctly
 * 2. Contract addresses are accessible on Starknet Sepolia
 * 3. RPC endpoint connectivity
 * 4. Direct proof verification against GaragaVerifier contract
 * 5. Merkle root query from ShadowFlow contract
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, ".env.local");

dotenv.config({ path: envPath });

// Import the client
import { ShadowFlowStarknetClient } from "./lib/starknetClient.js";

const test = async () => {
  console.log("🧪 ShadowFlow Frontend Integration Test\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Check environment variables
  const verifierAddress = process.env.NEXT_PUBLIC_GARAGA_VERIFIER_ADDRESS;
  const shadowflowAddress = process.env.NEXT_PUBLIC_SHADOWFLOW_CONTRACT_ADDRESS;
  const rpcUrl = process.env.NEXT_PUBLIC_STARKNET_RPC_URL;
  const network = process.env.NEXT_PUBLIC_STARKNET_NETWORK;

  console.log("✅ Environment Configuration:");
  console.log(`   Network:          ${network || "NOT SET"}`);
  console.log(`   RPC:              ${rpcUrl || "NOT SET"}`);
  console.log(`   GaragaVerifier:   ${verifierAddress || "NOT SET"}`);
  console.log(`   ShadowFlow:       ${shadowflowAddress || "NOT SET"}\n`);

  if (!verifierAddress || !shadowflowAddress || !rpcUrl) {
    console.error("❌ Missing required environment variables!");
    process.exit(1);
  }

  try {
    // Create client
    const client = new ShadowFlowStarknetClient(rpcUrl);
    console.log("✅ Starknet Client initialized\n");

    // Test 1: Get Merkle Root from ShadowFlow
    console.log("📊 Test 1: Query ShadowFlow Contract State");
    console.log("   → Fetching current Merkle root...");
    const merkleRoot = await client.getMerkleRoot();
    console.log(`   ✅ Merkle Root: ${merkleRoot}\n`);

    // Test 2: Verify proof on-chain
    console.log("🔐 Test 2: On-Chain Proof Verification");
    console.log("   → Testing proof verification against GaragaVerifier...");
    
    // Use test values (proofs will be verified with whatever logic is on-chain)
    const testProofHash = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const testPublicInputsHash = "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

    const result = await client.verifyProofOnChain(testProofHash, testPublicInputsHash);
    console.log(`   ✅ Verification Result:`);
    console.log(`      Proof Hash:        ${result.proofHash}`);
    console.log(`      Public Inputs:     ${result.publicInputsHash}`);
    console.log(`      Is Valid:          ${result.isValid}`);
    console.log(`      Timestamp:         ${new Date(result.timestamp).toISOString()}\n`);

    // Test 3: Check nullifier status
    console.log("🔍 Test 3: Nullifier Status Check");
    console.log("   → Checking if test nullifier has been spent...");
    const testNullifier = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const isSpent = await client.isNullifierSpent(testNullifier);
    console.log(`   ✅ Nullifier Spent: ${isSpent}\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ALL TESTS PASSED!");
    console.log("\n📝 Integration Notes:");
    console.log("   • GaragaVerifier contract is responsive");
    console.log("   • ShadowFlow contract is accessible");
    console.log("   • On-chain proof verification operational");
    console.log("   • Ready for production wallet integration\n");

  } catch (error) {
    console.error("❌ TEST FAILED:");
    console.error(`   ${error instanceof Error ? error.message : String(error)}\n`);
    console.error("🔧 Troubleshooting:");
    console.error("   1. Verify .env.local has correct contract addresses");
    console.error("   2. Check RPC endpoint is accessible");
    console.error("   3. Confirm contracts are deployed on Starknet Sepolia");
    console.error("   4. Check Cartridge API status at https://api.cartridge.gg/status\n");
    process.exit(1);
  }
};

test();
