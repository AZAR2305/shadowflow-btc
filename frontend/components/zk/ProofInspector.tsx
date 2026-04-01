"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Eye, Lock } from "lucide-react";
import { ZKProof } from "@/types";

interface ProofInspectorProps {
  proof: ZKProof | null;
}

/**
 * ProofInspector: Accordion interface showing proof structure.
 * PUBLIC section: Expanded by default, shows commitment, finalhash, nullifier, merkleRoot
 * PRIVATE section: Collapsed by default, shows count of hidden elements, lock icon
 * 
 * PRIVATE fields remain fully redacted in UI.
 */
export function ProofInspector({ proof }: ProofInspectorProps) {
  const [expandedPublic, setExpandedPublic] = useState(true);
  const [expandedPrivate, setExpandedPrivate] = useState(false);

  if (!proof) {
    return (
      <div className="w-full rounded-xl border border-border bg-surface p-6">
        <p className="text-sm text-muted text-center">
          Generate a proof to inspect its structure
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border border-border bg-surface overflow-hidden"
    >
      {/* Proof Hash */}
      <div className="p-4 border-b border-border">
        <div className="text-xs text-muted mb-2">Proof Hash</div>
        <code className="font-code text-sm text-cyan-400 break-all">
          {proof.proofHash}
        </code>
      </div>

      {/* PUBLIC Section */}
      <motion.div className="border-b border-border">
        <button
          onClick={() => setExpandedPublic(!expandedPublic)}
          className="flex w-full items-center justify-between border-b border-border px-4 py-3 transition-colors hover:bg-elevated"
        >
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-emerald-400" />
            <span className="font-semibold text-foreground">PUBLIC Inputs</span>
            <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
              Visible on-chain
            </span>
          </div>
          <motion.div animate={{ rotate: expandedPublic ? 180 : 0 }}>
            <ChevronDown size={18} className="text-muted" />
          </motion.div>
        </button>

        <AnimatePresence>
          {expandedPublic && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 bg-background/50 px-4 py-3">
                <div>
                  <div className="text-xs text-slate-500">commitment</div>
                  <code className="font-code text-sm text-cyan-400 block">
                    {proof.commitment.slice(0, 32)}...
                  </code>
                </div>
                <div>
                  <div className="text-xs text-slate-500">finalStateHash</div>
                  <code className="font-code text-sm text-cyan-400 block">
                    {proof.finalStateHash.slice(0, 32)}...
                  </code>
                </div>
                <div>
                  <div className="text-xs text-slate-500">nullifier</div>
                  <code className="font-code text-sm text-cyan-400 block">
                    {proof.nullifier}
                  </code>
                </div>
                <div>
                  <div className="text-xs text-slate-500">merkleRoot</div>
                  <code className="font-code text-sm text-cyan-400 block">
                    {proof.merkleRoot}
                  </code>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-border pt-2">
                  <div>
                    <div className="text-xs text-slate-500">constraints</div>
                    <div className="font-code text-sm text-cyan-400">
                      {proof.constraintCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">proof_size</div>
                    <div className="font-code text-sm text-cyan-400">
                      {proof.proofSize} bytes
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* PRIVATE Section */}
      <motion.div className="border-t border-border">
        <button
          onClick={() => setExpandedPrivate(!expandedPrivate)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-elevated transition-colors"
        >
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-red-400" />
            <span className="font-semibold text-foreground">PRIVATE Witnesses</span>
            <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
              Never shown
            </span>
          </div>
          <motion.div animate={{ rotate: expandedPrivate ? 180 : 0 }}>
            <ChevronDown size={18} className="text-muted" />
          </motion.div>
        </button>

        <AnimatePresence>
          {expandedPrivate && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 border-t border-border bg-background/50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <Lock size={16} className="mt-1 shrink-0 text-red-400" />
                  <div>
                    <div className="text-sm font-semibold text-red-400">
                      Hidden from UI
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-red-300">
                      <p>✓ Merkle tree path elements</p>
                      <p>✓ Range proof bit decomposition</p>
                      <p>✓ Strategy execution steps</p>
                      <p>✓ Trade parameters (amount, price bounds)</p>
                      <p>✓ Nullifier secret key</p>
                      <p>✓ Blinding factors</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="text-xs text-muted">
                    Private witnesses are computed locally and never transmitted.
                    Only PUBLIC outputs (commitment, nullifier, merkleRoot) leave
                    your browser.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Verification Status */}
      <div className="px-4 py-3 bg-background/50 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full" />
          <span className="text-xs font-code text-emerald-400">
            {proof.verified ? "Verified on-chain" : "Pending on-chain verification"}
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Generated {new Date(proof.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </motion.div>
  );
}
