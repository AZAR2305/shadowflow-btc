"use client";

import { motion } from "framer-motion";

interface ConnectionLineProps {
  visible: boolean;
  executing: boolean;
  completed: boolean;
}

export function ConnectionLine({ visible, executing, completed }: ConnectionLineProps) {
  if (!visible) {
    return <div className="h-32" />;
  }

  const stroke = completed ? "#1E6B31" : "#0b5fa8";

  return (
    <div className="relative h-32 w-full">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 128" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <marker id="arrow-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
          </marker>
          <marker id="arrow-left" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
          </marker>
        </defs>

        <circle cx="14" cy="42" r="4" fill="#fff" stroke={stroke} strokeWidth="2" />
        <circle cx="306" cy="42" r="4" fill="#fff" stroke={stroke} strokeWidth="2" />
        <circle cx="14" cy="86" r="4" fill="#fff" stroke={stroke} strokeWidth="2" />
        <circle cx="306" cy="86" r="4" fill="#fff" stroke={stroke} strokeWidth="2" />

        <motion.path
          d="M 18 42 C 90 12, 230 12, 302 42"
          fill="transparent"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="6 6"
          markerEnd="url(#arrow-right)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45 }}
        />
        <motion.path
          d="M 302 86 C 230 116, 90 116, 18 86"
          fill="transparent"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="6 6"
          markerEnd="url(#arrow-left)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: 0.06 }}
        />

        <text x="160" y="26" textAnchor="middle" className="fill-[#4b5563] text-[9px] font-bold tracking-[0.12em] uppercase">
          BUYER → SELLER
        </text>
        <text x="160" y="124" textAnchor="middle" className="fill-[#4b5563] text-[9px] font-bold tracking-[0.12em] uppercase">
          SELLER → BUYER
        </text>

        {executing && (
          <>
            <motion.circle
              r="4"
              fill="#60a5fa"
              animate={{
                cx: [18, 302],
                cy: [42, 42],
              }}
              transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.circle
              r="4"
              fill="#34d399"
              animate={{
                cx: [302, 18],
                cy: [86, 86],
              }}
              transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}
      </svg>
    </div>
  );
}
