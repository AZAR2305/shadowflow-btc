import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { hash } from "starknet";

import type { ExecutionLog, OtcLifecycleStatus, OtcMatchRecord, TEEAttestation, TradeRecord, ZKProof, ChainType, CrossChainInfo } from "@/types";
import { CrossChainService } from "./crossChainService";

type Direction = "buy" | "sell";
type StrategyTemplate = "simple" | "split" | "guarded";

export interface StrategySummary {
  id: string;
  direction: Direction;
  status: OtcLifecycleStatus;
  commitment: string;
  createdAt: number;
}

interface WalletBalanceState {
  btcBalance: string;
  strkBalance: string;
}

interface WalletState {
  balances: WalletBalanceState;
  strategies: StrategySummary[];
  trades: TradeRecord[];
  logs: ExecutionLog[];
  matches: OtcMatchRecord[];
  latestAttestation: TEEAttestation | null;
  latestProof: ZKProof | null;
}

interface OtcOrder {
  id: string;
  walletAddress: string;
  direction: Direction;
  templateId: StrategyTemplate;
  selectedPath: string;
  priceThreshold: number;
  amount: number;
  remainingAmount: number;
  depositAmount: number;
  createdAt: number;
  commitment: string;
  strategyId: string;
  tradeId: string;
  sendChain: ChainType;
  receiveChain: ChainType;
  receiveWalletAddress: string;
  onChainIntentTxHash?: string;
}

interface OrderBook {
  buy: OtcOrder[];
  sell: OtcOrder[];
}

interface OtcState {
  wallets: Record<string, WalletState>;
  orderBook: OrderBook;
  matches: OtcMatchRecord[];
}

interface SubmitIntentPayload {
  walletAddress: string;
  direction: Direction;
  templateId: StrategyTemplate;
  priceThreshold: number;
  amount: number;
  splitCount: number;
  selectedPath: string;
  depositConfirmed: boolean;
  depositAmount: number;
  sendChain: ChainType;
  receiveChain: ChainType;
  receiveWalletAddress: string;
}

const STATE_PATH = path.join(process.cwd(), "proofs", "otc-state.json");

const DEFAULT_BTC_BALANCE = 1.25;
const DEFAULT_STRK_BALANCE = 250;

const toKey = (walletAddress: string): string => walletAddress.toLowerCase();

async function loadState(): Promise<OtcState> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as OtcState;
    return {
      wallets: parsed.wallets ?? {},
      orderBook: {
        buy: parsed.orderBook?.buy ?? [],
        sell: parsed.orderBook?.sell ?? [],
      },
      matches: parsed.matches ?? [],
    };
  } catch {
    return {
      wallets: {},
      orderBook: { buy: [], sell: [] },
      matches: [],
    };
  }
}

async function saveState(state: OtcState): Promise<void> {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

function makeDefaultWalletState(): WalletState {
  return {
    balances: {
      btcBalance: DEFAULT_BTC_BALANCE.toFixed(4),
      strkBalance: DEFAULT_STRK_BALANCE.toFixed(2),
    },
    strategies: [],
    trades: [],
    logs: [],
    matches: [],
    latestAttestation: null,
    latestProof: null,
  };
}

async function getOrCreateWalletState(walletAddress: string): Promise<{ state: OtcState; wallet: WalletState; key: string }> {
  const state = await loadState();
  const key = toKey(walletAddress);
  if (!state.wallets[key]) {
    state.wallets[key] = makeDefaultWalletState();
  }

  return { state, wallet: state.wallets[key], key };
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function maskAmount(amount: number): string {
  const rounded = Math.max(0, amount).toFixed(4);
  const [whole] = rounded.split(".");
  return `${"*".repeat(Math.max(3, Math.min(6, whole.length)))}.${"*".repeat(4)}`;
}

function statusFromAmounts(totalAmount: number, remainingAmount: number): OtcLifecycleStatus {
  if (remainingAmount <= 0) {
    return "settled";
  }
  if (remainingAmount < totalAmount) {
    return "matched";
  }
  return "open";
}

function makeCommitment(walletAddress: string, amount: number, direction: Direction, selectedPath: string): string {
  const nowHex = `0x${Date.now().toString(16)}`;
  const amountScaled = `0x${Math.round(amount * 100_000_000).toString(16)}`;
  const dirTag = direction === "buy" ? "0x1" : "0x2";
  const pathTag = `0x${Buffer.from(selectedPath).toString("hex").slice(0, 60) || "0"}`;
  const walletTag = `0x${Buffer.from(walletAddress).toString("hex").slice(0, 60) || "0"}`;

  return hash.computePoseidonHashOnElements([walletTag, amountScaled, dirTag, pathTag, nowHex]);
}

function generateOnChainIntentHash(walletAddress: string, direction: Direction, amount: number, sendChain: ChainType, receiveChain: ChainType, receiveWalletAddress: string): string {
  return CrossChainService.generateOnChainIntentHash(walletAddress, direction, amount, sendChain, receiveChain, receiveWalletAddress);
}

function createCrossChainInfo(order: OtcOrder): CrossChainInfo {
  return {
    sendChain: order.sendChain,
    receiveChain: order.receiveChain,
    receiveWalletAddress: order.receiveWalletAddress,
    onChainIntentTxHash: order.onChainIntentTxHash,
  };
}

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOrCreateWallet(state: OtcState, walletAddress: string): WalletState {
  const key = toKey(walletAddress);
  if (!state.wallets[key]) {
    state.wallets[key] = makeDefaultWalletState();
  }
  return state.wallets[key];
}

function ensureMatchFlags(match: OtcMatchRecord): OtcMatchRecord {
  return {
    ...match,
    buyerConfirmed: Boolean(match.buyerConfirmed),
    sellerConfirmed: Boolean(match.sellerConfirmed),
  };
}

function findStrategy(wallet: WalletState, strategyId: string): StrategySummary {
  const strategy = wallet.strategies.find((item) => item.id === strategyId);
  if (!strategy) {
    throw new Error(`Strategy not found: ${strategyId}`);
  }
  return strategy;
}

function findTrade(wallet: WalletState, tradeId: string): TradeRecord {
  const trade = wallet.trades.find((item) => item.id === tradeId);
  if (!trade) {
    throw new Error(`Trade not found: ${tradeId}`);
  }
  return trade;
}

function applyMatchedStatus(
  wallet: WalletState,
  strategyId: string,
  tradeId: string,
  totalAmount: number,
  remainingAmount: number,
  counterpartyWallet: string,
  settlementCommitment: string,
  proofHash: string,
  matchedAmount: number,
  settlementFinalized: boolean,
): void {
  const strategy = findStrategy(wallet, strategyId);
  const trade = findTrade(wallet, tradeId);

  const status = settlementFinalized
    ? statusFromAmounts(totalAmount, remainingAmount)
    : remainingAmount < totalAmount
      ? "matched"
      : "open";
  strategy.status = status;
  trade.status = status;
  trade.remainingAmount = Number(remainingAmount.toFixed(8));
  trade.matchedAmount = Number((matchedAmount + (trade.matchedAmount ?? 0)).toFixed(8));
  trade.counterpartyWallet = counterpartyWallet;
  trade.settlementCommitment = settlementCommitment;
  trade.proofHash = proofHash;
}

function addExecutionLogs(
  wallet: WalletState,
  templateId: StrategyTemplate,
  pathId: string,
  masked: string,
  timestamp: number,
  event: "OPEN" | "MATCH" | "SETTLED",
): void {
  const openStep = event === "OPEN" ? 0 : 2;
  wallet.logs.unshift(
    {
      stepIndex: openStep,
      nodeId: templateId,
      action: "CONDITION_CHECK",
      maskedAmount: masked,
      timestamp,
      constraintsSatisfied: true,
      witnessGenerated: event !== "OPEN",
    },
    {
      stepIndex: openStep + 1,
      nodeId: pathId,
      action: "EXECUTE",
      maskedAmount: masked,
      timestamp: timestamp + 1,
      constraintsSatisfied: true,
      witnessGenerated: event !== "OPEN",
    },
  );
}

function tryMatchOrder(state: OtcState, incoming: OtcOrder): OtcMatchRecord[] {
  const matchedRecords: OtcMatchRecord[] = [];
  const impliedBtcPerStrk = (order: OtcOrder): number | null => {
    if (order.amount <= 0 || order.priceThreshold <= 0) return null;
    if (order.sendChain === "strk" && order.receiveChain === "btc") {
      return order.priceThreshold / order.amount;
    }
    if (order.sendChain === "btc" && order.receiveChain === "strk") {
      return order.amount / order.priceThreshold;
    }
    return null;
  };
  const toBtc = (sendAmount: number, sendChain: ChainType, btcPerStrk: number): number => {
    if (sendChain === "btc") return sendAmount;
    return sendAmount * btcPerStrk;
  };
  const fromBtc = (btcAmount: number, sendChain: ChainType, btcPerStrk: number): number => {
    if (sendChain === "btc") return btcAmount;
    if (btcPerStrk <= 0) return 0;
    return btcAmount / btcPerStrk;
  };
  const receiveFromSend = (order: OtcOrder, executedSendAmount: number): number => {
    if (order.amount <= 0) return 0;
    return executedSendAmount * (order.priceThreshold / order.amount);
  };
  const creditReceive = (wallet: WalletState, chain: ChainType, amount: number): void => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (chain === "btc") {
      const btc = toNumber(wallet.balances.btcBalance);
      wallet.balances.btcBalance = (btc + amount).toFixed(8);
      return;
    }
    const strk = toNumber(wallet.balances.strkBalance);
    wallet.balances.strkBalance = (strk + amount).toFixed(4);
  };

  const oppositeBook = incoming.direction === "buy" ? state.orderBook.sell : state.orderBook.buy;
  oppositeBook.sort((a, b) => a.createdAt - b.createdAt);

  for (let index = 0; index < oppositeBook.length && incoming.remainingAmount > 0; ) {
    const candidate = oppositeBook[index];

    if (candidate.walletAddress === incoming.walletAddress) {
      index += 1;
      continue;
    }

    if (candidate.selectedPath !== incoming.selectedPath) {
      index += 1;
      continue;
    }

    const reversePair =
      incoming.sendChain === candidate.receiveChain &&
      incoming.receiveChain === candidate.sendChain;
    const samePair =
      incoming.sendChain === candidate.sendChain &&
      incoming.receiveChain === candidate.receiveChain;
    if (!reversePair && !samePair) {
      index += 1;
      continue;
    }

    const buyOrder = incoming.direction === "buy" ? incoming : candidate;
    const sellOrder = incoming.direction === "sell" ? incoming : candidate;

    const buyRate = impliedBtcPerStrk(buyOrder);
    const sellRate = impliedBtcPerStrk(sellOrder);
    if (buyRate === null || sellRate === null) {
      index += 1;
      continue;
    }

    if (buyRate < sellRate) {
      index += 1;
      continue;
    }

    const incomingBtc = toBtc(incoming.remainingAmount, incoming.sendChain, incoming.direction === "buy" ? buyRate : sellRate);
    const candidateBtc = toBtc(candidate.remainingAmount, candidate.sendChain, candidate.direction === "buy" ? buyRate : sellRate);
    const fillBtc = Math.min(incomingBtc, candidateBtc);
    if (fillBtc <= 0) {
      index += 1;
      continue;
    }

    const incomingExecutedSend = fromBtc(fillBtc, incoming.sendChain, incoming.direction === "buy" ? buyRate : sellRate);
    const candidateExecutedSend = fromBtc(fillBtc, candidate.sendChain, candidate.direction === "buy" ? buyRate : sellRate);
    const fillAmount = incoming.direction === "buy" ? incomingExecutedSend : candidateExecutedSend;

    const executionPrice = Number(((buyRate + sellRate) / 2).toFixed(12)); // BTC per STRK
    const now = Date.now();
    const settlementCommitment = makeCommitment(
      buyOrder.walletAddress,
      fillAmount,
      "buy",
      `${sellOrder.walletAddress}:${executionPrice}`,
    );
    const proofHash = settlementCommitment;

    incoming.remainingAmount = Number((incoming.remainingAmount - incomingExecutedSend).toFixed(8));
    candidate.remainingAmount = Number((candidate.remainingAmount - candidateExecutedSend).toFixed(8));

    const buyerWallet = getOrCreateWallet(state, buyOrder.walletAddress);
    const sellerWallet = getOrCreateWallet(state, sellOrder.walletAddress);

    // Credit what each side receives, based on each order's stated receive ratio.
    creditReceive(buyerWallet, buyOrder.receiveChain, receiveFromSend(buyOrder, incoming.direction === "buy" ? incomingExecutedSend : candidateExecutedSend));
    creditReceive(sellerWallet, sellOrder.receiveChain, receiveFromSend(sellOrder, incoming.direction === "sell" ? incomingExecutedSend : candidateExecutedSend));

    applyMatchedStatus(
      buyerWallet,
      buyOrder.strategyId,
      buyOrder.tradeId,
      buyOrder.amount,
      buyOrder.remainingAmount,
      sellOrder.walletAddress,
      settlementCommitment,
      proofHash,
      fillAmount,
      false,
    );
    applyMatchedStatus(
      sellerWallet,
      sellOrder.strategyId,
      sellOrder.tradeId,
      sellOrder.amount,
      sellOrder.remainingAmount,
      buyOrder.walletAddress,
      settlementCommitment,
      proofHash,
      fillAmount,
      false,
    );

    const matchStatus = "matched";
    const matchRecord: OtcMatchRecord = {
      id: nextId("match"),
      buyerWallet: buyOrder.walletAddress,
      sellerWallet: sellOrder.walletAddress,
      buyTradeId: buyOrder.tradeId,
      sellTradeId: sellOrder.tradeId,
      amount: Number(fillAmount.toFixed(8)),
      price: executionPrice,
      createdAt: now,
      settlementCommitment,
      proofHash,
      buyerConfirmed: false,
      sellerConfirmed: false,
      status: matchStatus,
      buyerCrossChain: createCrossChainInfo(buyOrder),
      sellerCrossChain: createCrossChainInfo(sellOrder),
      buyerEscrowConfirmed: false,
      sellerEscrowConfirmed: false,
    };

    state.matches.unshift(matchRecord);
    buyerWallet.matches.unshift(matchRecord);
    sellerWallet.matches.unshift(matchRecord);

    addExecutionLogs(
      buyerWallet,
      buyOrder.templateId,
      buyOrder.selectedPath,
      maskAmount(fillAmount),
      now,
      "MATCH",
    );
    addExecutionLogs(
      sellerWallet,
      sellOrder.templateId,
      sellOrder.selectedPath,
      maskAmount(fillAmount),
      now,
      "MATCH",
    );

    const attestation: TEEAttestation = {
      enclaveType: "SGX",
      measurementHash: makeCommitment(buyOrder.walletAddress, fillAmount, "buy", "tee-attestation"),
      timestamp: now,
      valid: true,
    };

    const proof: ZKProof = {
      proofHash,
      commitment: settlementCommitment,
      finalStateHash: settlementCommitment,
      nullifier: makeCommitment(sellOrder.walletAddress, fillAmount, "sell", "nullifier"),
      merkleRoot: settlementCommitment,
      publicInputs: {
        commitment: settlementCommitment,
        finalStateHash: settlementCommitment,
        nullifier: makeCommitment(sellOrder.walletAddress, fillAmount, "sell", "nullifier"),
        merkleRoot: settlementCommitment,
      },
      verified: true,
      constraintCount: 3,
      proofSize: 1024,
      timestamp: now,
      teeAttested: true,
    };

    buyerWallet.latestAttestation = attestation;
    sellerWallet.latestAttestation = attestation;
    buyerWallet.latestProof = proof;
    sellerWallet.latestProof = proof;

    matchedRecords.push(matchRecord);

    if (candidate.remainingAmount <= 0) {
      oppositeBook.splice(index, 1);
    } else {
      index += 1;
    }
  }

  return matchedRecords;
}

function updateBalancesForIntent(wallet: WalletState, payload: SubmitIntentPayload): void {
  const btc = toNumber(wallet.balances.btcBalance);
  const strk = toNumber(wallet.balances.strkBalance);

  // Simple demo accounting model for OTC reservation.
  if (payload.direction === "sell") {
    wallet.balances.btcBalance = Math.max(0, btc - payload.depositAmount).toFixed(4);
    wallet.balances.strkBalance = strk.toFixed(2);
    return;
  }

  wallet.balances.strkBalance = Math.max(0, strk - payload.depositAmount).toFixed(2);
  wallet.balances.btcBalance = btc.toFixed(4);
}

export async function getWalletBalances(walletAddress: string): Promise<WalletBalanceState> {
  const { state, wallet } = await getOrCreateWalletState(walletAddress);
  await saveState(state);
  return wallet.balances;
}

export async function listStrategies(walletAddress: string): Promise<StrategySummary[]> {
  const { wallet } = await getOrCreateWalletState(walletAddress);
  return wallet.strategies.sort((a, b) => b.createdAt - a.createdAt);
}

export async function listTrades(walletAddress: string): Promise<TradeRecord[]> {
  const { wallet } = await getOrCreateWalletState(walletAddress);
  return wallet.trades.sort((a, b) => b.createdAt - a.createdAt);
}

export async function listMatches(walletAddress: string): Promise<OtcMatchRecord[]> {
  const { wallet } = await getOrCreateWalletState(walletAddress);
  return wallet.matches
    .map((match) => ensureMatchFlags(match))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function loadMatchById(matchId: string): Promise<OtcMatchRecord | null> {
  const state = await loadState();
  const directMatch = state.matches.find((m) => m.id === matchId);
  if (directMatch) {
    return ensureMatchFlags(directMatch);
  }

  // Fallback for older state where matches may only exist under wallet scopes.
  for (const wallet of Object.values(state.wallets)) {
    const scopedMatch = wallet.matches.find((m) => m.id === matchId);
    if (scopedMatch) {
      return ensureMatchFlags(scopedMatch);
    }
  }

  return null;
}

export async function listExecutionLogs(walletAddress: string): Promise<ExecutionLog[]> {
  const { wallet } = await getOrCreateWalletState(walletAddress);
  return wallet.logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
}

export async function getLatestAttestation(walletAddress: string): Promise<TEEAttestation | null> {
  const { wallet } = await getOrCreateWalletState(walletAddress);
  return wallet.latestAttestation;
}

export async function getLatestProof(walletAddress: string): Promise<ZKProof | null> {
  const { wallet } = await getOrCreateWalletState(walletAddress);
  return wallet.latestProof;
}

export async function submitIntent(payload: SubmitIntentPayload): Promise<{
  strategy: StrategySummary;
  trade: TradeRecord;
  matches: OtcMatchRecord[];
  proof: ZKProof | null;
}> {
  const { state, wallet } = await getOrCreateWalletState(payload.walletAddress);

  if (!payload.depositConfirmed || payload.depositAmount <= 0) {
    throw new Error("Deposit must be confirmed before submitting an OTC intent.");
  }

  const btcBalance = toNumber(wallet.balances.btcBalance);
  const strkBalance = toNumber(wallet.balances.strkBalance);

  // Reserve against the chain the user is actually sending from.
  if (payload.sendChain === "btc" && btcBalance < payload.depositAmount) {
    throw new Error("Insufficient BTC balance for intent reservation.");
  }

  if (payload.sendChain === "strk" && strkBalance < payload.depositAmount) {
    throw new Error("Insufficient STRK balance for intent reservation.");
  }

  const createdAt = Date.now();
  const commitment = makeCommitment(
    payload.walletAddress,
    payload.amount,
    payload.direction,
    payload.selectedPath,
  );

  const strategy: StrategySummary = {
    id: nextId("strategy"),
    direction: payload.direction,
    status: "open",
    commitment,
    createdAt,
  };

  const trade: TradeRecord = {
    id: nextId("trade"),
    direction: payload.direction,
    status: "open",
    createdAt,
    commitment,
    proofHash: undefined,
    maskedAmount: maskAmount(payload.amount),
    maskedPrice: `~$${Math.round(payload.priceThreshold).toLocaleString()}`,
    usesTEE: true,
    remainingAmount: Number(payload.amount.toFixed(8)),
    matchedAmount: 0,
  };

  const order: OtcOrder = {
    id: nextId("order"),
    walletAddress: payload.walletAddress,
    direction: payload.direction,
    templateId: payload.templateId,
    selectedPath: payload.selectedPath,
    priceThreshold: payload.priceThreshold,
    amount: payload.amount,
    remainingAmount: payload.amount,
    depositAmount: payload.depositAmount,
    createdAt,
    commitment,
    strategyId: strategy.id,
    tradeId: trade.id,
    sendChain: payload.sendChain,
    receiveChain: payload.receiveChain,
    receiveWalletAddress: payload.receiveWalletAddress,
    onChainIntentTxHash: generateOnChainIntentHash(payload.walletAddress, payload.direction, payload.amount, payload.sendChain, payload.receiveChain, payload.receiveWalletAddress),
  };

  updateBalancesForIntent(wallet, payload);
  wallet.strategies.unshift(strategy);
  wallet.trades.unshift(trade);

  addExecutionLogs(wallet, payload.templateId, payload.selectedPath, trade.maskedAmount, createdAt, "OPEN");

  if (payload.direction === "buy") {
    state.orderBook.buy.push(order);
  } else {
    state.orderBook.sell.push(order);
  }

  const matches = tryMatchOrder(state, order);
  if (order.remainingAmount <= 0) {
    const myBook = payload.direction === "buy" ? state.orderBook.buy : state.orderBook.sell;
    const idx = myBook.findIndex((item) => item.id === order.id);
    if (idx >= 0) {
      myBook.splice(idx, 1);
    }
  }

  const refreshedWallet = getOrCreateWallet(state, payload.walletAddress);

  await saveState(state);

  return {
    strategy: findStrategy(refreshedWallet, strategy.id),
    trade: findTrade(refreshedWallet, trade.id),
    matches,
    proof: refreshedWallet.latestProof,
  };
}

export async function confirmMatchParticipant(matchId: string, walletAddress: string): Promise<OtcMatchRecord> {
  const state = await loadState();
  const match = state.matches.find((item) => item.id === matchId);

  if (!match) {
    throw new Error(`Match not found: ${matchId}`);
  }

  if (match.status === "settled") {
    return ensureMatchFlags(match);
  }

  const normalizedWallet = toKey(walletAddress);
  const buyerKey = toKey(match.buyerWallet);
  const sellerKey = toKey(match.sellerWallet);

  if (normalizedWallet !== buyerKey && normalizedWallet !== sellerKey) {
    throw new Error("Wallet is not a participant of this match.");
  }

  if (normalizedWallet === buyerKey) {
    match.buyerConfirmed = true;
  }

  if (normalizedWallet === sellerKey) {
    match.sellerConfirmed = true;
  }

  const updated = ensureMatchFlags(match);

  const buyerWallet = getOrCreateWallet(state, match.buyerWallet);
  const sellerWallet = getOrCreateWallet(state, match.sellerWallet);

  buyerWallet.matches = buyerWallet.matches.map((item) =>
    item.id === matchId
      ? { ...item, buyerConfirmed: updated.buyerConfirmed, sellerConfirmed: updated.sellerConfirmed }
      : item,
  );
  sellerWallet.matches = sellerWallet.matches.map((item) =>
    item.id === matchId
      ? { ...item, buyerConfirmed: updated.buyerConfirmed, sellerConfirmed: updated.sellerConfirmed }
      : item,
  );

  await saveState(state);
  return updated;
}

export async function settleMatch(matchId: string, walletAddress?: string): Promise<OtcMatchRecord> {
  const state = await loadState();
  const match = state.matches.find((item) => item.id === matchId);

  if (!match) {
    throw new Error(`Match not found: ${matchId}`);
  }

  if (walletAddress) {
    const key = toKey(walletAddress);
    const buyerKey = toKey(match.buyerWallet);
    const sellerKey = toKey(match.sellerWallet);
    if (key !== buyerKey && key !== sellerKey) {
      throw new Error("Wallet is not a participant of this match.");
    }
  }

  if (match.status === "settled") {
    return ensureMatchFlags(match);
  }

  if (!match.buyerConfirmed || !match.sellerConfirmed) {
    throw new Error("Both buyer and seller confirmations are required before settlement.");
  }

  match.status = "settled";
  match.buyerConfirmed = true;
  match.sellerConfirmed = true;

  const buyerWallet = getOrCreateWallet(state, match.buyerWallet);
  const sellerWallet = getOrCreateWallet(state, match.sellerWallet);

  buyerWallet.matches = buyerWallet.matches.map((item) =>
    item.id === matchId
      ? { ...item, status: "settled", buyerConfirmed: true, sellerConfirmed: true }
      : item,
  );
  sellerWallet.matches = sellerWallet.matches.map((item) =>
    item.id === matchId
      ? { ...item, status: "settled", buyerConfirmed: true, sellerConfirmed: true }
      : item,
  );

  const buyerTrade = buyerWallet.trades.find((item) => item.id === match.buyTradeId);
  if (buyerTrade) {
    buyerTrade.status = (buyerTrade.remainingAmount ?? 0) <= 0 ? "settled" : "matched";
    const buyerStrategy = buyerWallet.strategies.find((item) => item.commitment === buyerTrade.commitment);
    if (buyerStrategy) {
      buyerStrategy.status = buyerTrade.status;
    }
  }

  const sellerTrade = sellerWallet.trades.find((item) => item.id === match.sellTradeId);
  if (sellerTrade) {
    sellerTrade.status = (sellerTrade.remainingAmount ?? 0) <= 0 ? "settled" : "matched";
    const sellerStrategy = sellerWallet.strategies.find((item) => item.commitment === sellerTrade.commitment);
    if (sellerStrategy) {
      sellerStrategy.status = sellerTrade.status;
    }
  }

  await saveState(state);
  return ensureMatchFlags(match);
}

export async function clearOtcState(scope: "all" | "wallet", walletAddress?: string): Promise<{ cleared: string }> {
  const state = await loadState();

  if (scope === "all" || !walletAddress) {
    state.wallets = {};
    state.orderBook = { buy: [], sell: [] };
    state.matches = [];
    await saveState(state);
    return { cleared: "all" };
  }

  const walletKey = toKey(walletAddress);

  delete state.wallets[walletKey];
  state.orderBook.buy = state.orderBook.buy.filter((item) => toKey(item.walletAddress) !== walletKey);
  state.orderBook.sell = state.orderBook.sell.filter((item) => toKey(item.walletAddress) !== walletKey);
  state.matches = state.matches.filter(
    (item) => toKey(item.buyerWallet) !== walletKey && toKey(item.sellerWallet) !== walletKey,
  );

  for (const key of Object.keys(state.wallets)) {
    const wallet = state.wallets[key];
    wallet.matches = wallet.matches.filter(
      (item) => toKey(item.buyerWallet) !== walletKey && toKey(item.sellerWallet) !== walletKey,
    );
  }

  await saveState(state);
  return { cleared: walletKey };
}

export async function confirmEscrowDeposit(matchId: string, walletAddress: string): Promise<OtcMatchRecord> {
  const state = await loadState();
  const match = state.matches.find((item) => item.id === matchId);

  if (!match) {
    throw new Error(`Match not found: ${matchId}`);
  }

  const normalizedWallet = toKey(walletAddress);
  const buyerKey = toKey(match.buyerWallet);
  const sellerKey = toKey(match.sellerWallet);

  if (normalizedWallet === buyerKey) {
    match.buyerEscrowConfirmed = true;
    // Generate realistic escrow transaction hash using CrossChainService
    const escrowTxHash = CrossChainService.generateEscrowTransactionHash(
      matchId,
      match.buyerWallet,
      match.amount,
      match.buyerCrossChain.sendChain,
    );
    match.buyerCrossChain.escrowTxHash = escrowTxHash;
  } else if (normalizedWallet === sellerKey) {
    match.sellerEscrowConfirmed = true;
    // Generate realistic escrow transaction hash using CrossChainService
    const escrowTxHash = CrossChainService.generateEscrowTransactionHash(
      matchId,
      match.sellerWallet,
      match.amount,
      match.sellerCrossChain.sendChain,
    );
    match.sellerCrossChain.escrowTxHash = escrowTxHash;
  } else {
    throw new Error("Wallet is not a participant of this match.");
  }

  const updated = ensureMatchFlags(match);
  const buyerWallet = getOrCreateWallet(state, match.buyerWallet);
  const sellerWallet = getOrCreateWallet(state, match.sellerWallet);

  buyerWallet.matches = buyerWallet.matches.map((item) =>
    item.id === matchId
      ? {
          ...item,
          buyerEscrowConfirmed: updated.buyerEscrowConfirmed,
          sellerEscrowConfirmed: updated.sellerEscrowConfirmed,
          buyerCrossChain: updated.buyerCrossChain,
          sellerCrossChain: updated.sellerCrossChain,
        }
      : item,
  );
  sellerWallet.matches = sellerWallet.matches.map((item) =>
    item.id === matchId
      ? {
          ...item,
          buyerEscrowConfirmed: updated.buyerEscrowConfirmed,
          sellerEscrowConfirmed: updated.sellerEscrowConfirmed,
          buyerCrossChain: updated.buyerCrossChain,
          sellerCrossChain: updated.sellerCrossChain,
        }
      : item,
  );

  await saveState(state);
  return updated;
}

export async function settleMatchWithCrossChain(matchId: string, walletAddress?: string): Promise<OtcMatchRecord> {
  const state = await loadState();
  const match = state.matches.find((item) => item.id === matchId);

  if (!match) {
    throw new Error(`Match not found: ${matchId}`);
  }

  if (walletAddress) {
    const key = toKey(walletAddress);
    const buyerKey = toKey(match.buyerWallet);
    const sellerKey = toKey(match.sellerWallet);
    if (key !== buyerKey && key !== sellerKey) {
      throw new Error("Wallet is not a participant of this match.");
    }
  }

  if (match.status === "settled") {
    return ensureMatchFlags(match);
  }

  if (!match.buyerConfirmed || !match.sellerConfirmed) {
    throw new Error("Both buyer and seller confirmations are required before settlement.");
  }

  if (!match.buyerEscrowConfirmed || !match.sellerEscrowConfirmed) {
    throw new Error("Both escrow deposits must be confirmed before settlement.");
  }

  match.status = "settled";
  match.buyerConfirmed = true;
  match.sellerConfirmed = true;

  // Validate wallet addresses
  if (!CrossChainService.validateWalletAddress(match.buyerCrossChain.receiveWalletAddress, match.buyerCrossChain.receiveChain)) {
    throw new Error(`Invalid buyer receive wallet address for ${match.buyerCrossChain.receiveChain}`);
  }

  if (!CrossChainService.validateWalletAddress(match.sellerCrossChain.receiveWalletAddress, match.sellerCrossChain.receiveChain)) {
    throw new Error(`Invalid seller receive wallet address for ${match.sellerCrossChain.receiveChain}`);
  }

  // Create settlement routing plan using CrossChainService
  const { buyerSettlement, sellerSettlement } = CrossChainService.createSettlementRoutingPlan(
    match.buyerWallet,
    match.sellerWallet,
    match.buyerCrossChain.sendChain,
    match.buyerCrossChain.receiveChain,
    match.buyerCrossChain.receiveWalletAddress,
    match.sellerCrossChain.sendChain,
    match.sellerCrossChain.receiveChain,
    match.sellerCrossChain.receiveWalletAddress,
    match.amount,
  );

  // Set match ID for routing
  buyerSettlement.matchId = matchId;
  sellerSettlement.matchId = matchId;

  // Generate settlement transaction hashes
  buyerSettlement.txHash = CrossChainService.generateSettlementTransactionHash(
    matchId,
    buyerSettlement.fromWallet,
    buyerSettlement.toWallet,
    buyerSettlement.amount,
    buyerSettlement.toChain,
  );

  sellerSettlement.txHash = CrossChainService.generateSettlementTransactionHash(
    matchId,
    sellerSettlement.fromWallet,
    sellerSettlement.toWallet,
    sellerSettlement.amount,
    sellerSettlement.toChain,
  );

  // Mark settlements as completed
  buyerSettlement.status = "completed";
  sellerSettlement.status = "completed";
  buyerSettlement.completedAt = Date.now();
  sellerSettlement.completedAt = Date.now();

  // Update cross-chain info with settlement transaction hashes
  match.buyerCrossChain.settlementTxHash = buyerSettlement.txHash;
  match.sellerCrossChain.settlementTxHash = sellerSettlement.txHash;

  // Add settlement transfer info to match
  match.buyerSettlement = {
    fromWallet: buyerSettlement.fromWallet,
    toWallet: buyerSettlement.toWallet,
    fromChain: buyerSettlement.fromChain,
    toChain: buyerSettlement.toChain,
    amount: buyerSettlement.amount,
    txHash: buyerSettlement.txHash,
    status: buyerSettlement.status as "completed",
  };

  match.sellerSettlement = {
    fromWallet: sellerSettlement.fromWallet,
    toWallet: sellerSettlement.toWallet,
    fromChain: sellerSettlement.fromChain,
    toChain: sellerSettlement.toChain,
    amount: sellerSettlement.amount,
    txHash: sellerSettlement.txHash,
    status: sellerSettlement.status as "completed",
  };

  const buyerWallet = getOrCreateWallet(state, match.buyerWallet);
  const sellerWallet = getOrCreateWallet(state, match.sellerWallet);

  buyerWallet.matches = buyerWallet.matches.map((item) =>
    item.id === matchId
      ? {
          ...item,
          status: "settled" as const,
          buyerConfirmed: true,
          sellerConfirmed: true,
          buyerCrossChain: match.buyerCrossChain,
          sellerCrossChain: match.sellerCrossChain,
          buyerSettlement: match.buyerSettlement,
          sellerSettlement: match.sellerSettlement,
        }
      : item,
  );
  sellerWallet.matches = sellerWallet.matches.map((item) =>
    item.id === matchId
      ? {
          ...item,
          status: "settled" as const,
          buyerConfirmed: true,
          sellerConfirmed: true,
          buyerCrossChain: match.buyerCrossChain,
          sellerCrossChain: match.sellerCrossChain,
          buyerSettlement: match.buyerSettlement,
          sellerSettlement: match.sellerSettlement,
        }
      : item,
  );

  const buyerTrade = buyerWallet.trades.find((item) => item.id === match.buyTradeId);
  if (buyerTrade) {
    buyerTrade.status = (buyerTrade.remainingAmount ?? 0) <= 0 ? "settled" : "matched";
    const buyerStrategy = buyerWallet.strategies.find((item) => item.commitment === buyerTrade.commitment);
    if (buyerStrategy) {
      buyerStrategy.status = buyerTrade.status;
    }
  }

  const sellerTrade = sellerWallet.trades.find((item) => item.id === match.sellTradeId);
  if (sellerTrade) {
    sellerTrade.status = (sellerTrade.remainingAmount ?? 0) <= 0 ? "settled" : "matched";
    const sellerStrategy = sellerWallet.strategies.find((item) => item.commitment === sellerTrade.commitment);
    if (sellerStrategy) {
      sellerStrategy.status = sellerTrade.status;
    }
  }

  await saveState(state);
  return ensureMatchFlags(match);
}
