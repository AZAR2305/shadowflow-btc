"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

interface MatchTerminalProps {
  active: boolean;
}

const LINES = [
  "Scanning liquidity...",
  "Matching intent...",
  "Counterparty found",
];

export function MatchTerminal({ active }: MatchTerminalProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % LINES.length);
    }, 1400);
    return () => clearInterval(id);
  }, [active]);

  const visibleLines = useMemo(() => {
    return [LINES[index], LINES[(index + 1) % LINES.length], LINES[(index + 2) % LINES.length]];
  }, [index]);

  return (
    <div className="w-full rounded-2xl border-4 border-dashed border-black bg-[#0f1115] p-5 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#99a4b3]">Matching Terminal</p>
      <div className="mt-4 space-y-3">
        {visibleLines.map((line, idx) => (
          <motion.div
            key={`${line}-${idx}`}
            initial={{ opacity: 0.25, y: 6 }}
            animate={{ opacity: idx === 0 ? 1 : 0.55, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-2 text-sm"
          >
            <Loader2 className={`h-4 w-4 ${idx === 0 ? "animate-spin text-[#58a6ff]" : "text-[#6d7f94]"}`} />
            <span>{line}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
