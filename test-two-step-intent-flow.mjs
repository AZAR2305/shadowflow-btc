#!/usr/bin/env node

/**
 * Test script for the two-step intent flow:
 * 1. Validate ZK proof + get messageToSign
 * 2. User signs message
 * 3. Execute with signature
 */

import crypto from 'crypto';

const API_URL = 'http://localhost:3000';

// Test wallet addresses
const BTC_WALLET = 'tb1qjps0vffsezm9lqdnkxxy5fgs622wmwk0mrszvw';
const STRK_WALLET = '0x02398452a29FD0f4a6FBbB984595Dac412a1483E70B9FC59E16Ba59B80330c24';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'bright');
  console.log('='.repeat(70) + '\n');
}

/**
 * Simulate wallet signing
 * In real app, this would be done by user's wallet (MetaMask, Argent, etc.)
 */
function simulateWalletSignature(messageToSign) {
  // Create a simple signature by hashing the message
  // Real implementation would use Ed25519 or similar
  const hash = crypto.createHash('sha256').update(messageToSign).digest('hex');
  return '0x' + hash;
}

/**
 * STEP 1: Validate intent and get ZK proof
 */
async function stepValidate() {
  header('STEP 1️⃣  - VALIDATE INTENT & CHECK ZK PROOF');

  const validatePayload = {
    step: 'validate',
    walletAddress: BTC_WALLET,
    sendChain: 'btc',
    receiveChain: 'strk',
    receiveWalletAddress: STRK_WALLET,
    amount: 0.0001,
    priceThreshold: 197.19, // ~1 BTC = 1,971,953 STRK, so 0.0001 BTC ≈ 197 STRK
  };

  log('Sending validation request...', 'cyan');
  log(`POST ${API_URL}/api/otc/intents`, 'blue');
  console.log('Payload:', JSON.stringify(validatePayload, null, 2));

  try {
    const response = await fetch(`${API_URL}/api/otc/intents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validatePayload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    log('✅ Validation successful!', 'green');
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    log(`❌ Validation failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * STEP 2: User signs the message
 */
function stepSignMessage(messageToSign) {
  header('STEP 2️⃣  - USER SIGNS MESSAGE WITH WALLET');

  log('Message to sign:', 'cyan');
  console.log(`"${messageToSign}"\n`);

  log('User opens wallet signing dialog...', 'yellow');
  log('(Simulating wallet signature)', 'yellow');

  const signature = simulateWalletSignature(messageToSign);
  log('✅ Message signed!', 'green');
  log(`Signature: ${signature}`, 'blue');

  return signature;
}

/**
 * STEP 3: Execute intent with signature
 */
async function stepExecute(intentData, signature) {
  header('STEP 3️⃣  - EXECUTE INTENT WITH SIGNATURE');

  const executePayload = {
    step: 'execute',
    walletAddress: BTC_WALLET,
    sendChain: 'btc',
    receiveChain: 'strk',
    receiveWalletAddress: STRK_WALLET,
    amount: 0.0001,
    priceThreshold: 197.19, // ~1 BTC = 1,971,953 STRK
    intentId: intentData.intentId,
    signature: signature,
  };

  log('Sending execution request with signature...', 'cyan');
  log(`POST ${API_URL}/api/otc/intents`, 'blue');
  console.log('Payload:', JSON.stringify(executePayload, null, 2));

  try {
    const response = await fetch(`${API_URL}/api/otc/intents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(executePayload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    log('✅ Execution successful!', 'green');
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    log(`❌ Execution failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Main flow
 */
async function runFlow() {
  try {
    header('TWO-STEP INTENT FLOW TEST');
    log('Testing the full two-step process:', 'bright');
    log('1. Validate ZK proof', 'cyan');
    log('2. User signs message', 'cyan');
    log('3. Execute with signature\n', 'cyan');

    // Step 1: Validate
    const validateResult = await stepValidate();

    if (!validateResult.messageToSign) {
      throw new Error('No messageToSign in validation response');
    }

    // Step 2: Sign
    const signature = stepSignMessage(validateResult.messageToSign.message);

    // Step 3: Execute
    const executeResult = await stepExecute(validateResult, signature);

    // Summary
    header('TEST SUMMARY');
    log('✅ All steps completed successfully!', 'green');
    console.log('\nFlow Summary:');
    console.log(`  Intent ID:        ${validateResult.intentId}`);
    console.log(`  ZK Proof:         ${validateResult.zkProof?.proofHash}`);
    console.log(`  Price Verified:   ${validateResult.priceVerification?.verified}`);
    console.log(`  Oracle Rate:      ${validateResult.priceVerification?.oracleRate} STRK/BTC`);
    console.log(`  Signature Status: ${signature ? '✓ Signed' : '✗ Not signed'}`);
    console.log(`  TX Hash:          ${executeResult.transactionHash || 'Pending'}`);

    log('\n✨ Two-step intent flow is working correctly!', 'green');
  } catch (error) {
    log('\n❌ Test failed!', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Run the test
runFlow();
