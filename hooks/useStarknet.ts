"use client";

import { useCallback } from "react";

import { starknetClient } from "@/lib/starknetClient";

export function useStarknet() {
  const storeCommitment = useCallback(async (commitment: string) => {
    return starknetClient.storeCommitment(commitment);
  }, []);

  const verifyAndStore = useCallback(async (proofHash: string, finalStateHash: string) => {
    return starknetClient.verifyAndStore(proofHash, finalStateHash);
  }, []);

  return {
    storeCommitment,
    verifyAndStore,
  };
}
