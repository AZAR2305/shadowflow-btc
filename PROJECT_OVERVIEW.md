# ShadowFlow OTC P2P Cross-Chain Swap System

## **Project Vision**

ShadowFlow is a **peer-to-peer (P2P) decentralized OTC (Over-The-Counter) swap platform** that enables **atomic cross-chain swaps between Bitcoin and Starknet** without trusted intermediaries.

**Problem it solves:**
- Users want to swap BTC ↔ STRK without centralized exchanges
- No existing P2P matching for cross-chain swaps
- Atomic execution ensures fairness (both get assets or both lose nothing)

---

## **Core Architecture**

### **1. Intent System (Matching Engine)**
```
User A submits intent:
  "I want to send 0.0001 BTC and receive ~194.89 STRK"

User B submits intent:
  "I want to send 197 STRK and receive ~0.0001 BTC"
                          ↓
                    INTENT MATCHING
                          ↓
        System finds: A's send = B's receive ✅
                    A's receive = B's send ✅
                          ↓
                    MATCHED PAIR FOUND 🎯
```

### **2. ZK Proof Verification (Privacy)**
- Each intent is validated with a price-verified ZK proof
- Proves intent validity WITHOUT revealing wallet keys
- Oracle prices from Pyth Oracle validate exchange rates

### **3. Atomic Escrow (Safety)**
```
Both users' assets locked in escrow contracts:
- Party A's STRK locked in EscrowContract
- Party B's BTC amount verified via Bitcoin wallet

Both must sign (asymmetric signing):
  - Bitcoin user: signs with Xverse/Unisat wallet
  - Starknet user: signs with ArgentX/Braavos wallet
```

### **4. Bridge Contracts (Execution)**
```
Once both signed:
  - BuyStrkContract: Converts BTC → STRK
  - SellStrkContract: Converts STRK → BTC
  - Assets atomic-transferred to counterparties
```

---

## **Full Test Flow**

### **Setup Phase**
```
User A (Bitcoin Testnet4):
  - Wallet: Xverse/Unisat (Testnet4)
  - Balance: 0.02673884 BTC ✅
  - Intent: Send 0.0001 BTC → Receive 194.89 STRK

User B (Starknet Sepolia):
  - Wallet: ArgentX/Braavos (Sepolia)
  - Balance: 250+ STRK ✅
  - Intent: Send 197 STRK → Receive ~0.0001 BTC
```

### **Step-by-Step Execution**

#### **STEP 1: User A Creates Intent (BTC→STRK)**
```
User A fills form:
  ├─ Connected Wallet (BTC): tb1qjps0vf...
  ├─ Receive Wallet (STRK): 0x057086ac...
  ├─ Send Amount: 0.0001 BTC
  ├─ Receive Amount: 194.89 STRK (auto-calculated from oracle)
  └─ Click "Submit Intent"
        ↓
POST /api/otc/intents?step=validate
  ├─ Fetch oracle prices (BTC/STRK from Pyth)
  ├─ Validate rate deviation: 1.08% vs 2% tolerance ✅
  ├─ Generate ZK proof for intent
  ├─ Store intent in OtcMatchingService
  └─ Return: intentId=0x19d4380b..., proof, message to sign
```

#### **STEP 2: User A Signs Intent**
```
Frontend:
  ├─ Request signature from Starknet wallet (ArgentX)
  ├─ Message: "OTC:0x19d4380b"
  └─ User sees popup, clicks "Sign"
        ↓
Signature obtained: 0x1b8f59b1a2bb...
```

#### **STEP 3: User A Executes Intent**
```
POST /api/otc/intents?step=execute
  ├─ Find matching intent in database
  ├─ Match Found! Intent 0x19d4390c (User B's intent)
  ├─ Verify both have signed ✅
  ├─ Call escrow service with match object
  └─ Execute atomic swap via contracts
        ↓
[ESCROW] Calling BuyStrkContract.buy_strk_with_btc
  ├─ Convert 0.0001 BTC → 194.89 STRK
  └─ Send to User A's Starknet wallet
        ↓
[ESCROW] Calling SellStrkContract.sell_strk_for_btc
  ├─ Convert 197 STRK → 0.0001 BTC
  └─ Send to User B's Bitcoin wallet
        ↓
✅ ATOMIC SWAP COMPLETED
   - User A: Received 194.89 STRK in wallet
   - User B: Received 0.0001 BTC in wallet
```

#### **STEP 4: User B Follows Same Flow**
```
User B also creates intent:
  ├─ Connected Wallet (STRK): 0x239845...
  ├─ Receive Wallet (BTC): tb1qjps0vf...
  ├─ Send Amount: 197 STRK
  ├─ Receive Amount: 0.0001 BTC
  └─ Submit → Sign → Execute
```

---

## **Key Validations**

| Check | Value | Status |
|-------|-------|--------|
| Oracle Rate | 1 BTC = 1,948,966 STRK | ✅ |
| User A Sends | 0.0001 BTC | ✅ |
| User A Receives | 194.89 STRK | ✅ |
| User B Sends | 197 STRK | ✅ |
| User B Receives | ~0.0001 BTC | ✅ |
| Price Deviation | 1.08% < 2% tolerance | ✅ |
| Both Signed | Yes | ✅ |
| Escrow Locked | Yes | ✅ |
| Contracts Called | BuyStrk + SellStrk | ✅ |

---

## **Technology Stack**

### **Frontend**
- Next.js 14 with React 18
- Starknet.js for wallet connections
- Real-time polling (2s intervals)

### **Backend**
- Next.js API Routes
- Starknet.js for contract calls
- Pyth Oracle for price feeds
- ZK proof verification

### **Smart Contracts (Cairo)**
- **EscrowContract**: Locks both parties' assets
- **BuyStrkContract**: BTC → STRK conversion
- **SellStrkContract**: STRK → BTC conversion
- **GaragaVerifier**: ZK proof verification

### **Chain Configuration**
- **Bitcoin**: Testnet4 (Mempool.space API)
- **Starknet**: Sepolia (Cartridge RPC)

---

## **Security Model**

1. **ZK Privacy**: Intents validated without revealing keys
2. **Atomic Execution**: Both succeed or both fail
3. **Proof-Based**: Each intent must have valid ZK proof
4. **Rate Validation**: Oracle prices prevent price manipulation
5. **Signature-Based**: Both parties must sign with their wallets

---

## **Current Status ✅**

| Feature | Status |
|---------|--------|
| Intent Creation | ✅ Working |
| ZK Proof Generation | ✅ Working |
| Intent Matching | ✅ Working |
| Wallet Signature | ✅ Working |
| Price Validation | ✅ Working |
| Contract Calls | ✅ Implemented |
| Atomic Swap | ✅ Executing |
| Full P2P Match | ✅ Tested |

---

## **Test Scenarios**

### **Scenario 1: Successful P2P Match ✅**
- User A: BTC → STRK
- User B: STRK → BTC
- Both sign and swap completes

### **Scenario 2: Price Deviation Rejection**
- User submits with rate >2% off oracle
- Validation rejects with error message

### **Scenario 3: Wallet Mismatch Auto-Correction**
- User changes chain selection
- Receiver wallet auto-updates to correct chain

### **Scenario 4: Singleton Persistence**
- Dev server hot-reload happens
- Intents survive in global storage

---
