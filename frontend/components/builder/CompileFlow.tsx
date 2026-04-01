"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

interface CompileFlowProps {
  active: boolean;
  stage: number;
}

const stages = [
  "Normalizing node graph",
  "Generating circuit witness",
  "Hashing private strategy",
  "Producing commitment",
];

export function CompileFlow({ active, stage }: CompileFlowProps) {
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 flex items-center justify-center bg-[#0a0f1a]/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-5"
          >
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Compile Flow
            </div>
            <div className="space-y-3 text-xs">
              {stages.map((label, index) => {
                const completed = index < stage;
                const current = index === stage;
                return (
                  <div key={label} className="flex items-center gap-2">
                    {completed ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : current ? (
                      <Loader2 className="h-4 w-4 animate-spin text-cyan" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-border" />
                    )}
                    <span className={completed || current ? "text-foreground" : "text-muted"}>{label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}