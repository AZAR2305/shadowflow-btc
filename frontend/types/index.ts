export type NodeType = "condition" | "split" | "execute" | "constraint" | "btc_transfer" | "btc_send" | "btc_buy";

export interface ConditionData {
  asset: "BTC";
  operator: "<" | ">" | "==";
  price: number; // PRIVATE — never log or transmit
}

export interface SplitData {
  splitCount: number; // PRIVATE — never log or transmit
  splitMode: "equal" | "random";
}

export interface ExecuteData {
  direction: "buy" | "sell";
  amount: number; // PRIVATE — never log or transmit
  delayMs: number; // PRIVATE — never log or transmit
}

export interface BtcTransferData {
  asset: "BTC";
  fromAddress: string; // PRIVATE — sender BTC testnet4 address, never log
  toAddress: string;   // PRIVATE — recipient BTC testnet4 address, never log
  btcAmount: number;   // PRIVATE — amount in BTC, never log
  htlcTimelock: number; // PUBLIC — locktime in blocks (e.g. 144 = ~24h)
  commitment: string;  // PUBLIC — Poseidon(secret, nullifier) stored on Starknet
}

export interface BtcSendData {
  asset: "BTC";
  senderAddress: string;    // PRIVATE — sender BTC address, never log
  recipientAddress: string; // PRIVATE — recipient BTC address, never log
  btcAmount: number;        // PRIVATE — amount in BTC, never log
  fee: number;              // PUBLIC — network fee in satoshis
  commitment: string;       // PUBLIC — Poseidon hash stored on Starknet
}

export interface BtcBuyData {
  asset: "BTC_to_STRK";
  senderBtcAddress: string; // PRIVATE — sender BTC address, never log
  recipientStrkAddress: string; // PRIVATE — recipient Starknet address, never log
  btcAmount: number;        // PRIVATE — amount in BTC, never log
  expectedStrkAmount: number; // PUBLIC — expected STRK output
  proofHash: string;        // PUBLIC — ZK proof commitment
}

export interface ConstraintData {
  field: string;
  operator: "<" | ">" | "==" | ">=" | "<=";
  value: number; // PRIVATE — never log or transmit
}

export interface StrategyNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: ConditionData | SplitData | ExecuteData | ConstraintData | BtcTransferData | BtcSendData | BtcBuyData;
}

export interface NodeGraph {
  nodes: StrategyNode[];
  edges: {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }[];
}

export interface Strategy {
  id: string;
  graph: NodeGraph;
  salt: string;
  createdAt: number;
}

export interface ZKConstraint {
  nodeId: string;
  constraintType: "range_check" | "sum_partition" | "state_transition" | "assertion" | "asset_commitment";
  publicInputs: string[];
  privateWitness: string[]; // PRIVATE — never log or transmit
  estimatedSize: number; // in bytes for cost estimation
}

export interface MerkleProof {
  leaf: bigint;
  pathElements: bigint[]; // PRIVATE
  pathIndices: number[]; // PRIVATE
  root: bigint; // PUBLIC
  treeDepth: number;
}

export interface ProofMerklePath {
  leaf: string;
  pathElements: string[];
  pathIndices: number[];
  root: string;
  treeDepth: number;
}

export interface RangeProofWitness {
  bits: bigint[]; // PRIVATE: bit decomposition
  blindingFactor: bigint; // PRIVATE
  publicCommitment: bigint; // PUBLIC: Poseidon(value, blinding)
  lowerBound: bigint; // PRIVATE
  upperBound: bigint; // PRIVATE
}

export interface NullifierData {
  nullifier: bigint; // PUBLIC: stored on chain
  spent: boolean; // PUBLIC: tracked in smart contract
}

export interface CircuitPublicInputs {
  commitment: string;
  finalStateHash: string;
  nullifier: string;
  merkleRoot: string;
}

export interface CircuitPrivateInputs {
  strategyHash: string;
  salt: string;
  tradeAmount: string;
  priceLower: string;
  priceUpper: string;
  executionSteps: string[];
  merklePath: string[];
  nullifierSecret: string;
}

export interface ZKProof {
  proofHash: string;
  commitment: string; // PUBLIC
  finalStateHash: string; // PUBLIC
  nullifier: string; // PUBLIC
  merkleRoot: string; // PUBLIC
  publicInputs: CircuitPublicInputs;
  verified: boolean;
  constraintCount: number;
  proofSize: number; // in bytes
  timestamp: number;
  artifactFile?: string;
  teeAttested?: boolean;
  merklePath?: ProofMerklePath;
}

export interface AggregatedProof {
  aggregatedProofHash: string;
  individualCommitments: string[];
  finalStateHashes: string[];
  proofCount: number;
  verified: boolean;
  totalConstraintCount: number;
}

export interface ExecutionLog {
  stepIndex: number;
  nodeId: string;
  action: "CONDITION_CHECK" | "SPLIT" | "EXECUTE" | "CONSTRAINT_PASS" | "DELAY";
  maskedAmount: string;
  timestamp: number; // PRIVATE — never log or transmit
  constraintsSatisfied: boolean;
  witnessGenerated: boolean;
}

export interface WalletConnection {
  connected: boolean;
  address: string | null;
  network: "starknet-testnet" | "starknet-mainnet";
  walletName: "argentx" | "braavos" | "metamask-snap" | "ready" | null;
}

export interface TEEAttestation {
  enclaveType: "SGX" | "Nitro";
  measurementHash: string;
  timestamp: number;
  valid: boolean;
}

export type OtcLifecycleStatus = "open" | "matched" | "settling" | "settled";
export type ChainType = "btc" | "strk";

export interface CrossChainInfo {
  sendChain: ChainType;
  receiveChain: ChainType;
  receiveWalletAddress: string; // PRIVATE: destination wallet on receive chain
  onChainIntentTxHash?: string; // Transaction hash when intent created on-chain
  escrowTxHash?: string; // Transaction hash when escrowed
  settlementTxHash?: string; // Transaction hash when settled on-chain
}

export interface SettlementTransferInfo {
  fromWallet: string;
  toWallet: string;
  fromChain: ChainType;
  toChain: ChainType;
  amount: number;
  txHash: string;
  status: "pending" | "completed" | "failed";
}

export interface OtcMatchRecord {
  id: string;
  buyerWallet: string;
  sellerWallet: string;
  buyTradeId: string;
  sellTradeId: string;
  amount: number;
  price: number;
  createdAt: number;
  settlementCommitment: string;
  proofHash?: string;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  status: "matched" | "settling" | "settled";
  buyerCrossChain: CrossChainInfo;
  sellerCrossChain: CrossChainInfo;
  buyerEscrowConfirmed?: boolean;
  sellerEscrowConfirmed?: boolean;
  buyerSettlement?: SettlementTransferInfo; // Settlement transfer details for buyer
  sellerSettlement?: SettlementTransferInfo; // Settlement transfer details for seller
}

export interface TradeRecord {
  id: string;
  direction: "buy" | "sell";
  status: OtcLifecycleStatus;
  createdAt: number;
  commitment: string;
  proofHash?: string;
  maskedAmount: string; // PRIVATE — never log or transmit
  maskedPrice: string; // PRIVATE — never log or transmit
  usesTEE: boolean;
  remainingAmount?: number;
  matchedAmount?: number;
  counterpartyWallet?: string;
  settlementCommitment?: string;
}
