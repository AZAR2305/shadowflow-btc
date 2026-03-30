"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { OtcMatchRecord } from "@/types";
import { IntentCard, type PortStatus, type TradeState } from "@/components/trading/IntentCard";
import { MatchTerminal } from "@/components/trading/MatchTerminal";
import { TradeProgress } from "@/components/trading/TradeProgress";
import { SwapContainer } from "@/components/trading/SwapContainer";
import { ConnectionCanvas, type CanvasPoint } from "@/components/trading/ConnectionCanvas";

type MatchUiState =
  | "searching"
  | "matched"
  | "buyer_connecting"
  | "buyer_confirmed"
  | "seller_connecting"
  | "seller_confirmed"
  | "executing"
  | "completed";

type DragRole = "buyer" | "seller";

type PortMap = {
  buyerInput: CanvasPoint | null;
  buyerOutput: CanvasPoint | null;
  sellerInput: CanvasPoint | null;
  sellerOutput: CanvasPoint | null;
};

type ApiTradeRecord = {
  direction?: "buy" | "sell";
  status?: "open" | "matched" | "settled";
};

function pointFromElement(element: HTMLElement | null, root: DOMRect): CanvasPoint | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - root.left,
    y: rect.top + rect.height / 2 - root.top,
  };
}

function distance(a: CanvasPoint | null, b: CanvasPoint | null): number {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function toTradeState(state: MatchUiState): TradeState {
  if (state === "completed") return "completed";
  if (state === "executing") return "executing";
  if (
    state === "matched" ||
    state === "buyer_confirmed" ||
    state === "seller_connecting" ||
    state === "buyer_connecting" ||
    state === "seller_confirmed"
  ) {
    return "matched";
  }
  return "waiting";
}

function toPortStatus(state: MatchUiState, role: DragRole): PortStatus {
  if (state === "completed") return "settled";
  if (role === "buyer") {
    if (state === "buyer_confirmed" || state === "seller_connecting" || state === "seller_confirmed" || state === "executing") return "ready";
    return "pending";
  }
  if (state === "seller_confirmed" || state === "executing") return "ready";
  return "pending";
}

function deriveUiStateFromMatch(match: OtcMatchRecord | null, participantRole: "buy" | "sell"): MatchUiState {
  if (!match) {
    return "searching";
  }

  if (match.status === "settled") {
    return "completed";
  }

  const buyerConfirmed = Boolean(match.buyerConfirmed);
  const sellerConfirmed = Boolean(match.sellerConfirmed);

  if (buyerConfirmed && sellerConfirmed) {
    return "executing";
  }

  if (buyerConfirmed) {
    return participantRole === "sell" ? "seller_connecting" : "buyer_confirmed";
  }

  return "matched";
}

export function SwapMatchingInterface({
  walletAddress,
  initialIntent,
}: {
  walletAddress: string;
  initialIntent: {
    direction: "buy" | "sell";
    amount: string;
    priceThreshold: string;
  };
}) {
  const [matches, setMatches] = useState<OtcMatchRecord[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<OtcMatchRecord | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [uiState, setUiState] = useState<MatchUiState>("searching");
  const [progress, setProgress] = useState(0);
  const [buyerConfirmed, setBuyerConfirmed] = useState(false);
  const [sellerConfirmed, setSellerConfirmed] = useState(false);
  const [settlementRequested, setSettlementRequested] = useState(false);
  const [swapPrepared, setSwapPrepared] = useState(false);
  const [swapPhase, setSwapPhase] = useState<"idle" | "crossing">("idle");
  const [swapped, setSwapped] = useState(false);

  const [sendChain, setSendChain] = useState<"btc" | "strk">("strk");
  const [receiveChain, setReceiveChain] = useState<"btc" | "strk">("btc");
  const [receiveWalletAddress, setReceiveWalletAddress] = useState("");
  const [receiveChainError, setReceiveChainError] = useState<string | null>(null);

  const [dragFrom, setDragFrom] = useState<DragRole | null>(null);
  const [dragPoint, setDragPoint] = useState<CanvasPoint | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<DragRole | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [ports, setPorts] = useState<PortMap>({
    buyerInput: null,
    buyerOutput: null,
    sellerInput: null,
    sellerOutput: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentRegistering, setIntentRegistering] = useState(false);
  const [intentBootstrapped, setIntentBootstrapped] = useState(false);

  const layoutRef = useRef<HTMLDivElement>(null);
  const buyerInputRef = useRef<HTMLButtonElement>(null);
  const buyerOutputRef = useRef<HTMLButtonElement>(null);
  const sellerInputRef = useRef<HTMLButtonElement>(null);
  const sellerOutputRef = useRef<HTMLButtonElement>(null);

  const counterpartyDirection = useMemo(() => {
    return initialIntent.direction === "buy" ? "sell" : "buy";
  }, [initialIntent.direction]);
  const participantRole = initialIntent.direction;

  const roleLabel = initialIntent.direction === "buy" ? "Buyer Intent (You)" : "Seller Intent (You)";
  const counterpartyLabel = initialIntent.direction === "buy" ? "Seller Counterparty" : "Buyer Counterparty";

  const pickActiveMatch = useCallback(
    (items: OtcMatchRecord[]): OtcMatchRecord | null => {
      if (items.length === 0) return null;
      const liveMatch = items.find((item) => item.status === "matched");
      if (liveMatch) return liveMatch;
      if (activeMatchId) {
        return items.find((item) => item.id === activeMatchId) ?? null;
      }
      return null;
    },
    [activeMatchId],
  );

  const settleOnBackend = useCallback(
    async (matchId: string) => {
      try {
        const response = await fetch("/api/otc/matches/settle", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ matchId, walletAddress }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to settle match.");
        }
      } catch (settleError) {
        setError(settleError instanceof Error ? settleError.message : "Settlement request failed.");
      }
    },
    [walletAddress],
  );

  const confirmOnBackend = useCallback(
    async (matchId: string) => {
      const response = await fetch("/api/otc/matches/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId,
          walletAddress,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to confirm participant transaction.");
      }

      return (await response.json()) as OtcMatchRecord;
    },
    [walletAddress],
  );

  const confirmEscrowDeposit = useCallback(
    async (matchId: string) => {
      const response = await fetch("/api/otc/escrow/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId,
          walletAddress,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to confirm escrow deposit.");
      }

      return (await response.json()) as OtcMatchRecord;
    },
    [walletAddress],
  );

  const ensureIntentInOrderBook = useCallback(async () => {
    if (intentBootstrapped) {
      return;
    }

    if (sendChain === receiveChain) {
      setError("Send and receive chains must be different. Please select different chains.");
      return;
    }

    if (!receiveWalletAddress.trim()) {
      setError(`Please provide a receive wallet address for ${receiveChain.toUpperCase()} chain.`);
      return;
    }

    setIntentRegistering(true);
    try {
      const wallet = walletAddress.trim();
      if (!wallet) {
        throw new Error("Wallet address is required for match registration.");
      }

      const tradesResponse = await fetch(`/api/otc/trades?walletAddress=${encodeURIComponent(wallet)}`, {
        cache: "no-store",
      });

      if (!tradesResponse.ok) {
        const text = await tradesResponse.text();
        throw new Error(text || "Failed to verify existing intent.");
      }

      const trades = (await tradesResponse.json()) as ApiTradeRecord[];
      const hasActiveTrade = Array.isArray(trades)
        ? trades.some(
            (trade) =>
              trade?.direction === initialIntent.direction &&
              (trade?.status === "open" || trade?.status === "matched"),
          )
        : false;

      if (!hasActiveTrade) {
        const amount = Number.parseFloat(initialIntent.amount);
        const priceThreshold = Number.parseFloat(initialIntent.priceThreshold);

        if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(priceThreshold) || priceThreshold <= 0) {
          throw new Error("Invalid amount or price in swap intent. Please create intent again.");
        }

        const submitResponse = await fetch("/api/otc/intents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: wallet,
            direction: initialIntent.direction,
            templateId: "simple",
            selectedPath: "btc_otc_main",
            amount,
            priceThreshold,
            splitCount: 1,
            depositAmount: amount,
            depositConfirmed: true,
            sendChain,
            receiveChain,
            receiveWalletAddress: receiveWalletAddress.trim(),
          }),
        });

        if (!submitResponse.ok) {
          const text = await submitResponse.text();
          throw new Error(text || "Failed to auto-register intent for matching.");
        }
      }
    } catch (bootstrapError) {
      setError(bootstrapError instanceof Error ? bootstrapError.message : "Failed to prepare matching intent.");
    } finally {
      setIntentRegistering(false);
      setIntentBootstrapped(true);
    }
  }, [intentBootstrapped, walletAddress, initialIntent.direction, initialIntent.amount, initialIntent.priceThreshold, sendChain, receiveChain, receiveWalletAddress]);

  const measureCanvas = useCallback(() => {
    if (!layoutRef.current) return;
    const rootRect = layoutRef.current.getBoundingClientRect();

    setCanvasSize({ width: rootRect.width, height: rootRect.height });
    setPorts({
      buyerInput: pointFromElement(buyerInputRef.current, rootRect),
      buyerOutput: pointFromElement(buyerOutputRef.current, rootRect),
      sellerInput: pointFromElement(sellerInputRef.current, rootRect),
      sellerOutput: pointFromElement(sellerOutputRef.current, rootRect),
    });
  }, []);

  const toCanvasPoint = useCallback((clientX: number, clientY: number): CanvasPoint | null => {
    if (!layoutRef.current) return null;
    const rootRect = layoutRef.current.getBoundingClientRect();
    return { x: clientX - rootRect.left, y: clientY - rootRect.top };
  }, []);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/otc/matches?walletAddress=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();
      const nextMatches = Array.isArray(data) ? data : [];
      setMatches(nextMatches);
      setError(null);

      const nextMatch = pickActiveMatch(nextMatches);
      setSelectedMatch(nextMatch);

      if (!nextMatch) {
        setActiveMatchId(null);
        setUiState("searching");
        setProgress(0);
        setBuyerConfirmed(false);
        setSellerConfirmed(false);
        setSettlementRequested(false);
        setSwapPrepared(false);
        setSwapped(false);
        return;
      }

      setBuyerConfirmed(Boolean(nextMatch.buyerConfirmed));
      setSellerConfirmed(Boolean(nextMatch.sellerConfirmed));

      if (activeMatchId !== nextMatch.id) {
        setActiveMatchId(nextMatch.id);
        setSettlementRequested(false);
        setSwapPrepared(false);
        setSwapped(false);
        setSwapPhase("idle");
      }

      const nextUiState = deriveUiStateFromMatch(nextMatch, participantRole);
      setUiState(nextUiState);

      if (nextUiState === "completed") {
        if (!swapped) {
          setUiState("executing");
          setProgress((prev) => (prev < 99 ? 99 : prev));
        } else {
          setUiState("completed");
          setProgress(100);
        }
      } else if (nextUiState === "executing") {
        setProgress((prev) => (prev > 0 ? prev : 0));
      } else {
        setProgress(0);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch matches.");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, pickActiveMatch, activeMatchId, participantRole, swapped]);

  useEffect(() => {
    void ensureIntentInOrderBook();
  }, [ensureIntentInOrderBook]);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 3000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  useEffect(() => {
    measureCanvas();
    const handler = () => measureCanvas();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);

    const observer = new ResizeObserver(handler);
    if (layoutRef.current) observer.observe(layoutRef.current);

    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
      observer.disconnect();
    };
  }, [measureCanvas]);

  useEffect(() => {
    if (!selectedMatch) return;
    measureCanvas();
  }, [selectedMatch, measureCanvas, swapped]);

  const canBuyerStart =
    participantRole === "buy" &&
    Boolean(selectedMatch) &&
    !buyerConfirmed &&
    (uiState === "matched" || uiState === "buyer_connecting");
  const canSellerStart =
    participantRole === "sell" &&
    Boolean(selectedMatch) &&
    buyerConfirmed &&
    !sellerConfirmed &&
    (uiState === "buyer_confirmed" || uiState === "seller_connecting");

  const startDrag = useCallback(
    (role: DragRole, clientX: number, clientY: number) => {
      const point = toCanvasPoint(clientX, clientY);
      if (!point) return;

      setDragFrom(role);
      setDragPoint(point);
      setActiveDropTarget(null);
      setUiState(role === "buyer" ? "buyer_connecting" : "seller_connecting");
    },
    [toCanvasPoint],
  );

  const onBuyerDragStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!canBuyerStart) return;
      event.preventDefault();
      startDrag("buyer", event.clientX, event.clientY);
    },
    [canBuyerStart, startDrag],
  );

  const onSellerDragStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!canSellerStart) return;
      event.preventDefault();
      startDrag("seller", event.clientX, event.clientY);
    },
    [canSellerStart, startDrag],
  );

  const leftRole = (swapped ? counterpartyDirection : initialIntent.direction) as "buy" | "sell";
  const rightRole = (swapped ? initialIntent.direction : counterpartyDirection) as "buy" | "sell";

  const buyerCardBindings = {
    inputPortRef: buyerInputRef,
    outputPortRef: buyerOutputRef,
    onOutputPointerDown: onBuyerDragStart,
    canDragOutput: canBuyerStart,
    portStatus: toPortStatus(uiState, "buyer") as PortStatus,
  };

  const sellerCardBindings = {
    inputPortRef: sellerInputRef,
    outputPortRef: sellerOutputRef,
    onOutputPointerDown: onSellerDragStart,
    canDragOutput: canSellerStart,
    portStatus: toPortStatus(uiState, "seller") as PortStatus,
  };

  const leftBindings = leftRole === "buy" ? buyerCardBindings : sellerCardBindings;
  const rightBindings = rightRole === "buy" ? buyerCardBindings : sellerCardBindings;

  useEffect(() => {
    if (!dragFrom) return;

    const onPointerMove = (event: PointerEvent) => {
      const nextPoint = toCanvasPoint(event.clientX, event.clientY);
      if (!nextPoint) return;

      setDragPoint(nextPoint);

      const targetPoint = dragFrom === "buyer" ? ports.sellerInput : ports.buyerInput;
      const targetRole = dragFrom === "buyer" ? "seller" : "buyer";
      const isInside = distance(nextPoint, targetPoint) <= 24;
      setActiveDropTarget(isInside ? targetRole : null);
    };

    const onPointerUp = () => {
      const finalize = async () => {
        const targetRole = dragFrom === "buyer" ? "seller" : "buyer";
        const success = activeDropTarget === targetRole;

        try {
          if (success && dragFrom === "buyer") {
            const approved = window.confirm("Buyer confirmation: proceed with buyer-side transaction?");
            if (approved && selectedMatch) {
              const updated = await confirmOnBackend(selectedMatch.id);
              await confirmEscrowDeposit(selectedMatch.id);
              setBuyerConfirmed(Boolean(updated.buyerConfirmed));
              setSellerConfirmed(Boolean(updated.sellerConfirmed));
              setUiState(participantRole === "buy" ? "buyer_confirmed" : "seller_connecting");
              await fetchMatches();
            } else {
              setUiState("matched");
            }
          }

          if (success && dragFrom === "seller") {
            const approved = window.confirm("Seller confirmation: proceed with seller-side transaction?");
            if (approved && selectedMatch) {
              const updated = await confirmOnBackend(selectedMatch.id);
              await confirmEscrowDeposit(selectedMatch.id);
              setBuyerConfirmed(Boolean(updated.buyerConfirmed));
              setSellerConfirmed(Boolean(updated.sellerConfirmed));
              setUiState("seller_confirmed");
              await fetchMatches();
            } else {
              setUiState(participantRole === "sell" ? "seller_connecting" : "buyer_confirmed");
            }
          }

          if (!success) {
            setUiState(dragFrom === "buyer" ? "matched" : "seller_connecting");
          }
        } catch (confirmError) {
          setError(confirmError instanceof Error ? confirmError.message : "Failed to confirm participant action.");
        } finally {
          setDragFrom(null);
          setDragPoint(null);
          setActiveDropTarget(null);
        }
      };

      void finalize();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [
    dragFrom,
    activeDropTarget,
    toCanvasPoint,
    ports,
    selectedMatch,
    confirmOnBackend,
    participantRole,
    fetchMatches,
  ]);

  useEffect(() => {
    if (uiState !== "executing" || !selectedMatch || settlementRequested) return;
    setSettlementRequested(true);
    void settleOnBackend(selectedMatch.id);
  }, [uiState, selectedMatch, settlementRequested, settleOnBackend]);

  useEffect(() => {
    if (uiState !== "executing" || swapPrepared) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) return 99;
        return Math.min(99, prev + 5);
      });
    }, 220);

    return () => clearInterval(timer);
  }, [uiState, swapPrepared]);

  useEffect(() => {
    if (uiState !== "executing" || progress < 99 || swapPrepared || swapped) return;
    setSwapPrepared(true);
  }, [uiState, progress, swapPrepared, swapped]);

  useEffect(() => {
    if (uiState !== "executing" || !swapPrepared || swapped) return;

    const completionTimer = setTimeout(() => {
      setProgress(100);
    }, 420);

    const startCrossingTimer = setTimeout(() => {
      setSwapPhase("crossing");
    }, 700);

    const swapTimer = setTimeout(() => {
      setSwapped(true);
      setSwapPhase("idle");
      setUiState("completed");
      setSwapPrepared(false);
    }, 1750);

    return () => {
      clearTimeout(completionTimer);
      clearTimeout(startCrossingTimer);
      clearTimeout(swapTimer);
    };
  }, [uiState, swapPrepared, swapped]);

  const tradeState = toTradeState(uiState);
  const activeMatches = useMemo(() => matches.filter((match) => match.status === "matched"), [matches]);
  const settledMatchesCount = matches.length - activeMatches.length;
  const cardCrossDistance = useMemo(() => {
    if (canvasSize.width >= 1200) return 440;
    if (canvasSize.width >= 980) return 360;
    if (canvasSize.width >= 760) return 280;
    return 190;
  }, [canvasSize.width]);

  const instruction = useMemo(() => {
    if (uiState === "matched" || uiState === "buyer_connecting") {
      return participantRole === "buy"
        ? "Buyer: drag dotted line from your output node to seller input node."
        : "Waiting for buyer to complete buyer-side connection.";
    }
    if (uiState === "buyer_confirmed" || uiState === "seller_connecting") {
      return participantRole === "sell"
        ? "Seller: drag dotted line from seller output node to buyer input node."
        : "Buyer confirmed. Waiting for seller-side connection.";
    }
    if (uiState === "seller_confirmed") {
      return "Both confirmations complete. Preparing settlement...";
    }
    if (uiState === "executing" && progress >= 99) {
      return "Settlement at 99%. Reordering counterparties for final swap...";
    }
    if (uiState === "completed") {
      return "Settlement complete. Opponent assets are now yours.";
    }
    return "Searching for compatible counterparty...";
  }, [uiState, participantRole, progress]);

  const leftCard = (
    <IntentCard
      side="left"
      roleLabel={swapped ? counterpartyLabel : roleLabel}
      direction={swapped ? counterpartyDirection : initialIntent.direction}
      amount={swapped && selectedMatch ? String(selectedMatch.amount) : initialIntent.amount}
      price={swapped && selectedMatch ? String(selectedMatch.price) : initialIntent.priceThreshold}
      walletAddress={
        swapped && selectedMatch
          ? initialIntent.direction === "buy"
            ? selectedMatch.sellerWallet
            : selectedMatch.buyerWallet
          : walletAddress
      }
      state={tradeState}
      swapPhase={swapPhase}
      inputPortRef={leftBindings.inputPortRef}
      outputPortRef={leftBindings.outputPortRef}
      onOutputPointerDown={leftBindings.onOutputPointerDown}
      canDragOutput={leftBindings.canDragOutput}
      portStatus={leftBindings.portStatus}
      crossDistance={cardCrossDistance}
    />
  );

  const rightCard = selectedMatch ? (
    <IntentCard
      side="right"
      roleLabel={swapped ? roleLabel : counterpartyLabel}
      direction={swapped ? initialIntent.direction : counterpartyDirection}
      amount={swapped ? initialIntent.amount : String(selectedMatch.amount)}
      price={swapped ? initialIntent.priceThreshold : String(selectedMatch.price)}
      walletAddress={
        swapped
          ? walletAddress
          : initialIntent.direction === "buy"
            ? selectedMatch.sellerWallet
            : selectedMatch.buyerWallet
      }
      state={tradeState}
      swapPhase={swapPhase}
      inputPortRef={rightBindings.inputPortRef}
      outputPortRef={rightBindings.outputPortRef}
      onOutputPointerDown={rightBindings.onOutputPointerDown}
      canDragOutput={rightBindings.canDragOutput}
      portStatus={rightBindings.portStatus}
      crossDistance={cardCrossDistance}
    />
  ) : (
    <div className="rounded-2xl border-4 border-dashed border-black/40 bg-white/70 p-6 text-center text-sm font-semibold uppercase tracking-wide text-[#7a7a7a]">
      {initialIntent.direction === "buy" ? "Waiting for seller intent" : "Waiting for buyer intent"}
    </div>
  );

  const centerPanel = (
    <motion.div
      key={uiState}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full space-y-4"
    >
      {uiState === "searching" ? (
        <MatchTerminal active={true} />
      ) : (
        <div className="rounded-xl border-3 border-black bg-white p-4 text-center text-xs font-bold uppercase tracking-wide text-[#555]">
          {instruction}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="graph-dot-bg min-h-screen px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-3xl font-bold">OTC Match Terminal</h1>
          <p className="mt-2 text-sm text-[#555]">
            Buyer and seller must both drag-connect and approve their side before settlement executes.
          </p>
          {intentRegistering && (
            <p className="mt-2 text-sm font-semibold text-[#1f4d8f]">Registering this intent in matching engine...</p>
          )}
          {error && <p className="mt-2 text-sm font-semibold text-[#b42318]">{error}</p>}

          <div className="mt-6 grid gap-4 rounded-2xl border-3 border-gray-200 bg-gray-50 p-5 md:grid-cols-3">
            <div>
              <label className="text-xs font-bold uppercase text-[#666]">You Send</label>
              <select
                value={sendChain}
                onChange={(e) => {
                  const newSend = e.target.value as "btc" | "strk";
                  setSendChain(newSend);
                  // Auto-flip receiveChain if same
                  if (newSend === receiveChain) {
                    setReceiveChain(newSend === "btc" ? "strk" : "btc");
                  }
                }}
                className="mt-2 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-bold uppercase"
              >
                <option value="btc">Bitcoin (BTC)</option>
                <option value="strk">Starknet (STRK)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-[#666]">You Receive</label>
              <select
                value={receiveChain}
                onChange={(e) => {
                  const newReceive = e.target.value as "btc" | "strk";
                  setReceiveChain(newReceive);
                  // Auto-flip sendChain if same
                  if (newReceive === sendChain) {
                    setSendChain(newReceive === "btc" ? "strk" : "btc");
                  }
                }}
                className="mt-2 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-bold uppercase"
              >
                <option value="btc">Bitcoin (BTC)</option>
                <option value="strk">Starknet (STRK)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-[#666]">Receive Wallet Address</label>
              <input
                type="text"
                value={receiveWalletAddress}
                onChange={(e) => {
                  setReceiveWalletAddress(e.target.value);
                  setReceiveChainError(null);
                }}
                placeholder={receiveChain === "btc" ? "bc1q..." : "0x..."}
                className="mt-2 w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-mono"
              />
              {receiveChainError && <p className="mt-1 text-xs text-red-600">{receiveChainError}</p>}
            </div>
          </div>
        </div>

        <div ref={layoutRef} className="relative">
          <ConnectionCanvas
            visible={uiState !== "searching" && Boolean(selectedMatch)}
            width={canvasSize.width}
            height={canvasSize.height}
            buyerInput={ports.buyerInput}
            buyerOutput={ports.buyerOutput}
            sellerInput={ports.sellerInput}
            sellerOutput={ports.sellerOutput}
            buyerConfirmed={buyerConfirmed}
            sellerConfirmed={sellerConfirmed}
            executing={uiState === "executing"}
            completed={uiState === "completed"}
            dragFrom={dragFrom}
            dragPoint={dragPoint}
            activeDropTarget={activeDropTarget}
          />

          <SwapContainer left={leftCard} center={centerPanel} right={rightCard} />
        </div>

        {(uiState === "executing" || uiState === "completed") && (
          <motion.div
            key={`progress-${uiState}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="mt-8 mx-auto w-full max-w-3xl"
          >
            <TradeProgress progress={progress} />
          </motion.div>
        )}

        {selectedMatch && (uiState === "executing" || uiState === "completed") && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="mt-8 mx-auto w-full max-w-4xl space-y-4"
          >
            {/* Cross-Chain Settlement Summary */}
            <div className="rounded-2xl border-3 border-green-500 bg-green-50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-green-900">
                ✅ Cross-Chain Settlement Complete
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Buyer Settlement */}
                {selectedMatch.buyerSettlement && (
                  <div className="rounded-lg border-2 border-green-300 bg-white p-4">
                    <p className="mb-3 text-xs font-semibold uppercase text-blue-700">🔵 Buyer Receives</p>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-[#666] mb-1">Asset</p>
                        <p className="font-bold text-lg">
                          {selectedMatch.buyerSettlement.toChain === "btc" ? "🔵 Bitcoin" : "⚡ Starknet"}{" "}
                          <span className="text-green-600">+{selectedMatch.buyerSettlement.amount.toFixed(8)}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-[#666] mb-1">Receive Wallet</p>
                        <p className="text-[11px] font-mono text-[#333] break-all bg-gray-50 p-2 rounded">
                          {selectedMatch.buyerCrossChain?.receiveWalletAddress || "Loading..."}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-[#666] mb-1">Settlement Tx</p>
                        <p className="text-[10px] font-mono text-[#555] break-all">
                          {selectedMatch.buyerSettlement.txHash}
                        </p>
                      </div>
                      <p className={`text-[10px] font-semibold ${selectedMatch.buyerSettlement.status === "completed" ? "text-green-600" : "text-yellow-600"}`}>
                        Status: {selectedMatch.buyerSettlement.status.toUpperCase()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Seller Settlement */}
                {selectedMatch.sellerSettlement && (
                  <div className="rounded-lg border-2 border-green-300 bg-white p-4">
                    <p className="mb-3 text-xs font-semibold uppercase text-red-700">⚡ Seller Receives</p>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-[#666] mb-1">Asset</p>
                        <p className="font-bold text-lg">
                          {selectedMatch.sellerSettlement.toChain === "btc" ? "🔵 Bitcoin" : "⚡ Starknet"}{" "}
                          <span className="text-green-600">+{selectedMatch.sellerSettlement.amount.toFixed(8)}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-[#666] mb-1">Receive Wallet</p>
                        <p className="text-[11px] font-mono text-[#333] break-all bg-gray-50 p-2 rounded">
                          {selectedMatch.sellerCrossChain?.receiveWalletAddress || "Loading..."}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-[#666] mb-1">Settlement Tx</p>
                        <p className="text-[10px] font-mono text-[#555] break-all">
                          {selectedMatch.sellerSettlement.txHash}
                        </p>
                      </div>
                      <p className={`text-[10px] font-semibold ${selectedMatch.sellerSettlement.status === "completed" ? "text-green-600" : "text-yellow-600"}`}>
                        Status: {selectedMatch.sellerSettlement.status.toUpperCase()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* On-Chain Transaction Details */}
            <div className="rounded-2xl border-3 border-purple-500 bg-purple-50 p-5">
              <p className="mb-4 text-xs font-bold uppercase text-purple-900">On-Chain Transaction Records</p>
              <div className="grid gap-3 md:grid-cols-3">
                {/* Intent Hash */}
                <div className="rounded-lg border-2 border-purple-300 bg-white p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase text-[#666]">Intent Created</p>
                  {selectedMatch.buyerCrossChain?.onChainIntentTxHash ? (
                    <>
                      <p className="font-mono text-[9px] text-[#555] break-all">
                        {selectedMatch.buyerCrossChain.onChainIntentTxHash}
                      </p>
                      <p className="mt-1 text-[9px] text-green-600 font-semibold">✓ On-Chain</p>
                    </>
                  ) : (
                    <p className="text-[9px] text-[#999]">Pending...</p>
                  )}
                </div>

                {/* Escrow Deposits */}
                <div className="rounded-lg border-2 border-purple-300 bg-white p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase text-[#666]">Escrow Locked</p>
                  {selectedMatch.buyerCrossChain?.escrowTxHash && selectedMatch.sellerCrossChain?.escrowTxHash ? (
                    <>
                      <p className="font-mono text-[9px] text-[#555] break-all">
                        {selectedMatch.buyerCrossChain.escrowTxHash.slice(0, 28)}...
                      </p>
                      <p className="font-mono text-[9px] text-[#555] break-all">
                        {selectedMatch.sellerCrossChain.escrowTxHash.slice(0, 28)}...
                      </p>
                      <p className="mt-1 text-[9px] text-green-600 font-semibold">✓ Both Confirmed</p>
                    </>
                  ) : (
                    <p className="text-[9px] text-yellow-600 font-semibold">Pending...</p>
                  )}
                </div>

                {/* Settlement Hash */}
                <div className="rounded-lg border-2 border-purple-300 bg-white p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase text-[#666]">Settlement Finalized</p>
                  {selectedMatch.buyerCrossChain?.settlementTxHash ? (
                    <>
                      <p className="font-mono text-[9px] text-[#555] break-all">
                        {selectedMatch.buyerCrossChain.settlementTxHash}
                      </p>
                      <p className="mt-1 text-[9px] text-green-600 font-semibold">✓ Settled</p>
                    </>
                  ) : (
                    <p className="text-[9px] text-[#999]">Pending...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Cross-Chain Routing Info */}
            <div className="rounded-2xl border-3 border-blue-400 bg-blue-50 p-5">
              <p className="mb-4 text-xs font-bold uppercase text-blue-900">Cross-Chain Routing</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-[#666] mb-2">Buyer Direction</p>
                  <p className="text-sm font-bold">
                    {selectedMatch.buyerCrossChain?.sendChain === "btc" ? "🔵 Sends BTC" : "⚡ Sends STRK"} →{" "}
                    {selectedMatch.buyerCrossChain?.receiveChain === "btc" ? "🔵 Receives BTC" : "⚡ Receives STRK"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-[#666] mb-2">Seller Direction</p>
                  <p className="text-sm font-bold">
                    {selectedMatch.sellerCrossChain?.sendChain === "btc" ? "🔵 Sends BTC" : "⚡ Sends STRK"} →{" "}
                    {selectedMatch.sellerCrossChain?.receiveChain === "btc" ? "🔵 Receives BTC" : "⚡ Receives STRK"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeMatches.length > 0 && (
          <div className="mt-12 rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="mb-4 text-xl font-bold">Available Matches ({activeMatches.length})</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {activeMatches.map((match, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedMatch(match);
                    setActiveMatchId(match.id);
                    setBuyerConfirmed(false);
                    setSellerConfirmed(false);
                    setProgress(0);
                    setSwapPrepared(false);
                    setSwapped(false);
                    setSwapPhase("idle");
                    setUiState("matched");
                    setTimeout(measureCanvas, 10);
                  }}
                  className={`rounded-xl border-3 p-4 text-left transition-all ${
                    selectedMatch?.id === match.id
                      ? "border-blue-600 bg-blue-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      : "border-black bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  <p className="text-xs font-semibold text-[#666] uppercase">{match.buyerWallet === walletAddress ? "Seller" : "Buyer"}</p>
                  <p className="mt-1 text-lg font-bold">{match.amount} BTC</p>
                  <p className="text-sm text-[#555]">${match.price}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[#777]">{match.status}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {matches.length === 0 && !loading && uiState === "searching" && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-[#666]">
            <Loader2 className="h-4 w-4 animate-spin" />
            {initialIntent.direction === "buy" ? "Waiting for seller match events..." : "Waiting for buyer match events..."}
          </div>
        )}

        {activeMatches.length === 0 && settledMatchesCount > 0 && uiState === "searching" && (
          <div className="mt-8 rounded-xl border-3 border-black bg-[#fff5da] px-4 py-3 text-sm font-semibold text-[#7a5a00]">
            No active match right now. Previous settled intents are archived. Create new buyer/seller intents to start a new drag-confirm session.
          </div>
        )}
      </div>
    </div>
  );
}
