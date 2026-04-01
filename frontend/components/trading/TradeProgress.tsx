"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

interface TradeProgressProps {
  progress: number;
}

const STAGES = [
  { label: "Buyer Signed", threshold: 25 },
  { label: "Seller Signed", threshold: 50 },
  { label: "On-chain Execution", threshold: 80 },
  { label: "Settlement Complete", threshold: 100 },
];

export function TradeProgress({ progress }: TradeProgressProps) {
  const currentStage = STAGES.find((stage) => progress <= stage.threshold)?.label ?? STAGES[STAGES.length - 1].label;

  return (
    <div className="w-full rounded-xl border-3 border-black bg-white p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-[#555]">
        <span>{currentStage}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border-2 border-black bg-[#e6edf5]">
        <motion.div
          className="h-full bg-gradient-to-r from-[#0b5fa8] via-[#3b82f6] to-[#16a34a]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>

      <div className="mt-4 grid gap-2">
        {STAGES.map((stage) => {
          const done = progress >= stage.threshold;
          const active = !done && currentStage === stage.label;

          return (
            <div
              key={stage.label}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-wide ${
                done
                  ? "border-[#59c487] bg-[#ecfff3] text-[#1f7a43]"
                  : active
                    ? "border-[#74a4e6] bg-[#edf5ff] text-[#0b4d9d]"
                    : "border-[#d2d2d2] bg-[#f8f8f8] text-[#666]"
              }`}
            >
              <span>{stage.label}</span>
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>...</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
