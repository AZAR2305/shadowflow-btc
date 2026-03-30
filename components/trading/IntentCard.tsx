"use client";

import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";

export type TradeState = "waiting" | "matched" | "executing" | "completed";
export type PortStatus = "pending" | "ready" | "settled";

interface IntentCardProps {
  roleLabel: string;
  direction: "buy" | "sell";
  amount: string;
  price: string;
  walletAddress: string;
  state: TradeState;
  swapPhase?: "idle" | "crossing";
  crossDistance?: number;
  side: "left" | "right";
  inputPortRef?: RefObject<HTMLButtonElement>;
  outputPortRef?: RefObject<HTMLButtonElement>;
  onOutputPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  canDragOutput?: boolean;
  portStatus?: PortStatus;
}

function shortAddress(value: string): string {
  if (!value || value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

export function IntentCard({
  roleLabel,
  direction,
  amount,
  price,
  walletAddress,
  state,
  swapPhase = "idle",
  crossDistance = 380,
  side,
  inputPortRef,
  outputPortRef,
  onOutputPointerDown,
  canDragOutput = false,
  portStatus = "pending",
}: IntentCardProps) {
  const directionClass = direction === "buy" ? "bg-blue-600" : "bg-green-600";
  const inputPortPosition =
    side === "left" ? "-right-[11px] top-[42%]" : "-left-[11px] top-[42%]";
  const outputPortPosition =
    side === "left" ? "-right-[11px] top-[62%]" : "-left-[11px] top-[62%]";

  const portMeta: Record<PortStatus, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-[#fff4cf] text-[#7a5a00] border-[#f7d264]",
    },
    ready: {
      label: "Ready",
      className: "bg-[#e6fff2] text-[#1f7a43] border-[#58d68d]",
    },
    settled: {
      label: "Settled",
      className: "bg-[#e8f1ff] text-[#0b4d9d] border-[#74a4e6]",
    },
  };

  const stateMeta: Record<TradeState, { label: string; icon: JSX.Element; textClass: string }> = {
    waiting: {
      label: "Waiting",
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      textClass: "text-[#9a7a00]",
    },
    matched: {
      label: "Matched",
      icon: <CheckCircle2 className="h-4 w-4" />,
      textClass: "text-[#1E6B31]",
    },
    executing: {
      label: "Executing",
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      textClass: "text-[#0b5fa8]",
    },
    completed: {
      label: "Completed",
      icon: <CheckCircle2 className="h-4 w-4" />,
      textClass: "text-[#1E6B31]",
    },
  };

  const crossingX = swapPhase === "crossing" ? (side === "left" ? crossDistance : -crossDistance) : 0;
  const crossingY = swapPhase === "crossing" ? (side === "left" ? -66 : 66) : 0;
  const crossingRotate = swapPhase === "crossing" ? (side === "left" ? 4 : -4) : 0;
  const transition =
    swapPhase === "crossing"
      ? { type: "tween" as const, duration: 0.95, ease: [0.22, 1, 0.36, 1] as const }
      : { type: "spring" as const, stiffness: 280, damping: 24 };

  return (
    <motion.div
      layout
      transition={transition}
      animate={{
        x: crossingX,
        y: crossingY,
        rotate: crossingRotate,
        scale: swapPhase === "crossing" ? 0.98 : 1,
      }}
      style={{ zIndex: swapPhase === "crossing" ? (side === "left" ? 30 : 20) : 0 }}
      className="relative rounded-2xl border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
    >
      <button
        ref={inputPortRef}
        type="button"
        aria-label={`${roleLabel} input port`}
        className={`absolute z-10 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-black bg-white ${inputPortPosition}`}
      />
      <button
        ref={outputPortRef}
        type="button"
        aria-label={`${roleLabel} output port`}
        onPointerDown={onOutputPointerDown}
        disabled={!canDragOutput}
        className={`absolute z-10 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-black transition-colors ${outputPortPosition} ${
          canDragOutput ? "bg-[#5c42fb] cursor-crosshair" : "bg-[#d7d7d7] cursor-not-allowed"
        }`}
      />

      <div className="mb-4 flex items-center justify-between border-b-2 border-black pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#666]">{roleLabel}</p>
          <p className="mt-1 text-xs text-[#7d7d7d] inline-flex items-center gap-1.5">
            <Wallet className="h-3 w-3" />
            {shortAddress(walletAddress)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white ${directionClass}`}>
          {direction}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-black bg-[#f7f7f2] p-3">
          <p className="text-[11px] font-semibold uppercase text-[#666]">Amount</p>
          <p className="mt-1 text-xl font-bold">{amount} BTC</p>
        </div>
        <div className="rounded-xl border-2 border-black bg-[#f7f7f2] p-3">
          <p className="text-[11px] font-semibold uppercase text-[#666]">Price</p>
          <p className="mt-1 text-xl font-bold">${price}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border-2 border-black bg-[#f7f7f2] px-3 py-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#555]">Node Link</span>
        <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${portMeta[portStatus].className}`}>
          {portMeta[portStatus].label}
        </span>
      </div>

      <div className={`mt-4 inline-flex items-center gap-2 rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide ${stateMeta[state].textClass}`}>
        {stateMeta[state].icon}
        {stateMeta[state].label}
      </div>
    </motion.div>
  );
}
