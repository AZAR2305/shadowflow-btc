"use client";

import { useCallback } from "react";

import { compileCommitment } from "@/lib/commitment";
import { validateGraphAsDag } from "@/lib/graphCompiler";
import { useStrategyStore } from "@/store/strategyStore";

export function useStrategyCompiler() {
  const { graph, setCommitment } = useStrategyStore();

  const compile = useCallback(() => {
    const validation = validateGraphAsDag(graph);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const commitment = compileCommitment({
      id: "strategy-local",
      graph,
      salt: "shadowflow-salt",
      createdAt: Date.now(),
    });

    setCommitment(commitment);
    return commitment;
  }, [graph, setCommitment]);

  return { compile };
}
