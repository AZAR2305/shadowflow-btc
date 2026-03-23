"use client";

import { useCallback } from "react";

import { generateZkProof, verifyZkProof } from "@/lib/zkProver";
import { useProofStore } from "@/store/proofStore";
import { useStrategyStore } from "@/store/strategyStore";

export function useZKProver() {
  const { graph, commitment } = useStrategyStore();
  const { startProofGeneration, setProgress, setProof, setStatus } = useProofStore();

  const run = useCallback(async () => {
    startProofGeneration();
    setProgress(25);
    const proof = await generateZkProof(graph, commitment ?? "0x0");
    setProgress(75);
    setStatus("verifying");
    const verified = await verifyZkProof(proof);
    setProof({ ...proof, verified });
    setStatus(verified ? "complete" : "error");
    setProgress(100);
    return proof;
  }, [commitment, graph, setProgress, setProof, setStatus, startProofGeneration]);

  return { run };
}
