"use client";

import { motion } from "framer-motion";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

import { Badge } from "@/components/ui/badge";
import type { BtcBuyData } from "@/types";

/**
 * BtcBuyNode — Buy STRK with BTC via bridge swap
 *
 * Privacy model:
 *   PRIVATE: senderBtcAddress, recipientStrkAddress, btcAmount
 *   PUBLIC:  expectedStrkAmount, proofHash
 */
export function BtcBuyNode({ data, selected }: NodeProps<BtcBuyData>) {
  const BTC_COLOR = "#F7931A";
  const STRK_COLOR = "#EC4899";
  const btcAmount = data.btcAmount ?? 0;
  const strkAmount = data.expectedStrkAmount ?? 0;
  const proofHash = data.proofHash ?? "0x0000000000000000";

  // Calculate exchange rate for display
  const rate = btcAmount > 0 ? (strkAmount / btcAmount).toFixed(0) : "n/a";

  return (
    <motion.div
      whileHover={{ scale: 1.015 }}
      className={`relative min-w-[280px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_0_0_1px_rgba(255,255,255,0.03)] ${
        selected ? "ring-2 ring-[#EC4899]" : ""
      }`}
      style={{ borderLeft: "5px solid #EC4899" }}
    >
      {/* Pink/Magenta glow for bridge operation */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          boxShadow: "0 0 18px 3px rgba(236,72,153,0.16)",
        }}
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Input handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: BTC_COLOR, top: "50%" }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border p-3 text-sm font-semibold">
        <span style={{ color: BTC_COLOR }} className="text-base">₿</span>
        <span>→</span>
        <span style={{ color: STRK_COLOR }} className="text-base">⚡</span>
        <span>Buy STRK</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted">BRIDGE</span>
      </div>

      {/* Body */}
      <div className="space-y-1 p-3 text-xs text-muted">
        {/* Input: BTC */}
        <div className="mb-2 p-2 rounded-lg bg-orange-900/20 border border-orange-900/30">
          <div className="text-[10px] text-orange-200 font-semibold mb-1">INPUT</div>
          <div className="flex justify-between">
            <span>Address:</span>
            <span className="redacted font-mono">████████████</span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="redacted font-mono">████ BTC</span>
          </div>
        </div>

        {/* Exchange rate — PUBLIC */}
        <div className="flex justify-between items-center px-2 py-1 rounded bg-border/20">
          <span className="text-[10px]">Rate:</span>
          <span className="font-mono text-foreground text-[11px]">1 BTC = {rate} STRK</span>
        </div>

        {/* Output: STRK */}
        <div className="p-2 rounded-lg bg-pink-900/20 border border-pink-900/30">
          <div className="text-[10px] text-pink-200 font-semibold mb-1">OUTPUT</div>
          <div className="flex justify-between">
            <span>Recipient:</span>
            <span className="redacted font-mono">████████████</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: STRK_COLOR }}>Receives:</span>
            <span className="font-mono" style={{ color: STRK_COLOR }}>
              {strkAmount > 0 ? `${strkAmount.toFixed(0)} STRK` : "████ STRK"}
            </span>
          </div>
        </div>

        {/* Horizontal divider */}
        <div className="my-1 h-px bg-border/60" />

        {/* Public ZK commitment */}
        <div>
          <span className="block mb-0.5 text-[10px]">ZK Proof:</span>
          <span className="block font-mono text-[9px] break-all text-pink-300">
            {proofHash.length > 20
              ? `${proofHash.slice(0, 12)}...${proofHash.slice(-6)}`
              : proofHash}
          </span>
        </div>
      </div>

      {/* Footer badges */}
      <div className="flex items-center justify-between border-t border-border p-2 text-[10px]">
        <Badge variant="private">PRIVATE 🔒</Badge>
        <Badge variant="public">PUBLIC ✅</Badge>
      </div>

      {/* Output handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: STRK_COLOR, top: "50%" }}
      />
    </motion.div>
  );
}
