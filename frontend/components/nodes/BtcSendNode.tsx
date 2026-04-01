"use client";

import { motion } from "framer-motion";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

import { Badge } from "@/components/ui/badge";
import type { BtcSendData } from "@/types";

/**
 * BtcSendNode — Send BTC from one address to another
 *
 * Privacy model:
 *   PRIVATE: senderAddress, recipientAddress, btcAmount
 *   PUBLIC:  fee, commitment
 */
export function BtcSendNode({ data, selected }: NodeProps<BtcSendData>) {
  const BTC_COLOR = "#F7931A";
  const fee = data.fee ?? 546;  // Default UTXO minimum
  const commitment = data.commitment ?? "0x0000000000000000";

  return (
    <motion.div
      whileHover={{ scale: 1.015 }}
      className={`relative min-w-[260px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_0_0_1px_rgba(255,255,255,0.03)] ${
        selected ? "ring-2 ring-[#F7931A]" : ""
      }`}
      style={{ borderLeft: "5px solid #F7931A" }}
    >
      {/* Golden glow ring for send operation */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          boxShadow: "0 0 16px 2px rgba(247,147,26,0.18)",
        }}
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Input handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: BTC_COLOR, top: "50%" }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border p-3 text-sm font-semibold">
        <span style={{ color: BTC_COLOR }} className="text-base">↗</span>
        <span>BTC Send</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted">SEND</span>
      </div>

      {/* Body */}
      <div className="space-y-1 p-3 text-xs text-muted">
        <div className="flex justify-between">
          <span>Network:</span>
          <span className="font-semibold" style={{ color: BTC_COLOR }}>₿ Bitcoin</span>
        </div>
        <div className="flex justify-between">
          <span>From:</span>
          <span className="redacted font-mono">████████████</span>
        </div>
        <div className="flex justify-between">
          <span>To:</span>
          <span className="redacted font-mono">████████████</span>
        </div>
        <div className="flex justify-between">
          <span>Amount:</span>
          <span className="redacted font-mono">████ BTC</span>
        </div>

        {/* Horizontal divider */}
        <div className="my-1 h-px bg-border/60" />

        {/* Public fields */}
        <div className="flex justify-between">
          <span>Network Fee:</span>
          <span className="font-mono text-foreground">{fee} sat</span>
        </div>
        <div>
          <span className="block mb-0.5">Commitment:</span>
          <span className="block font-mono text-[10px] break-all" style={{ color: BTC_COLOR }}>
            {commitment.length > 20
              ? `${commitment.slice(0, 10)}...${commitment.slice(-6)}`
              : commitment}
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
        style={{ background: BTC_COLOR, top: "50%" }}
      />
    </motion.div>
  );
}
