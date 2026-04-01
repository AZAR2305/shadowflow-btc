"use client";
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle, AlertCircle } from "lucide-react";

interface NullifierStatusProps {
  nullifier: bigint | null;
  isSpent: boolean;
  isNew: boolean;
}

/**
 * NullifierStatus: Displays nullifier state for replay attack prevention.
 * Shows:
 * - Nullifier hash (PUBLIC)
 * - Spent/Unspent status (PUBLIC, from on-chain)
 * - Animation on fresh nullifier generation
 * 
 * PRIVATE: Secret key is never shown or stored.
 */
export function NullifierStatus({
  nullifier,
  isSpent,
  isNew,
}: NullifierStatusProps) {
  const [showAnimation, setShowAnimation] = React.useState(false);

  useEffect(() => {
    if (isNew) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  const nullifierHex = nullifier
    ? "0x" + nullifier.toString(16).slice(0, 16)
    : "Not generated";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-surface p-5 relative"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <motion.div animate={{ scale: showAnimation ? 1.2 : 1 }}>
          <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Shield className={`h-6 w-6 ${showAnimation ? "text-emerald-400" : "text-blue-400"}`} />
          </div>
        </motion.div>
        <div>
          <h3 className="font-heading text-lg font-semibold">Nullifier</h3>
          <p className="text-xs text-muted">Replay attack prevention</p>
        </div>
      </div>

        {/* Nullifier Hash */}
        <div className="mb-3 rounded-lg border border-border bg-background/50 p-3">
          <div className="text-xs text-muted mb-2">Nullifier Hash (PUBLIC)</div>
          <motion.code
            className="text-xs text-cyan-400 font-code break-all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {nullifierHex}
          </motion.code>
        </div>

        {/* Status Indicator */}
        <div className="space-y-2">
          <div className="text-xs text-muted">Status</div>
          <motion.div
            className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${
              isSpent
                ? "bg-red-500/10 border-red-500"
                : "bg-emerald-500/10 border-emerald-500"
            }`}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {isSpent ? (
              <>
                <AlertCircle size={16} className="text-red-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-400">Already Spent</p>
                  <p className="text-xs text-red-300">
                    This execution cannot be replayed
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle size={16} className="text-emerald-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-400">Not Spent</p>
                  <p className="text-xs text-emerald-300">
                    {isNew ? "✓ Fresh nullifier" : "Ready for execution"}
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* Info */}
        <div className="bg-background/50 rounded-lg p-3 text-xs text-muted space-y-2 border border-border mt-3">
          <p>
            <span className="text-emerald-400">How it works:</span> Each strategy
            execution generates a unique nullifier. Once used, it&apos;s recorded
            on-chain to prevent the same execution from being replayed.
          </p>
          <p>
            <span className="text-amber-400">Secret Key:</span> Never transmitted
            or stored. Only your browser computes the nullifier.
          </p>
        </div>

        {/* Animation pulse on fresh nullifier */}
        {showAnimation && (
          <motion.div
            className="absolute inset-0 rounded-lg border border-emerald-400"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.05, opacity: 0 }}
            transition={{ duration: 1 }}
          />
        )}
    </motion.div>
  );
}
