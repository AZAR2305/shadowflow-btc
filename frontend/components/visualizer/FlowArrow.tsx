"use client";

import { motion } from "framer-motion";

export function FlowArrow() {
  return (
    <svg width="100%" height="34" viewBox="0 0 180 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <motion.path
        d="M6 17 H164 M164 17 L152 9 M164 17 L152 25"
        stroke="#00FF88"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
    </svg>
  );
}
