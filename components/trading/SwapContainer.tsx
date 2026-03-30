"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

interface SwapContainerProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function SwapContainer({ left, center, right }: SwapContainerProps) {
  return (
    <motion.section
      layout
      className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(360px,1fr)_300px_minmax(360px,1fr)] lg:items-center"
    >
      <motion.div layout className="order-1 min-w-0">{left}</motion.div>

      <motion.div layout className="order-2 flex min-h-[220px] items-center justify-center">
        <AnimatePresence mode="wait">{center}</AnimatePresence>
      </motion.div>

      <motion.div layout className="order-3 min-w-0">{right}</motion.div>
    </motion.section>
  );
}
