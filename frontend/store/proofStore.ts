import { create } from "zustand";

import type { ZKProof } from "@/types";

type ProofStatus = "idle" | "generating" | "verifying" | "complete" | "error";

interface ProofState {
  proof: ZKProof | null;
  status: ProofStatus;
  progress: number;
  startProofGeneration: () => void;
  setProof: (proof: ZKProof | null) => void;
  setStatus: (status: ProofStatus) => void;
  setProgress: (value: number) => void;
}

export const useProofStore = create<ProofState>((set) => ({
  proof: null,
  status: "idle",
  progress: 0,
  startProofGeneration: () =>
    set({
      status: "generating",
      progress: 0,
      proof: null,
    }),
  setProof: (proof) => set({ proof }),
  setStatus: (status) => set({ status }),
  setProgress: (value) => set({ progress: Math.max(0, Math.min(100, value)) }),
}));
