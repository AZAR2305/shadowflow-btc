import { create } from "zustand";
import { produce } from "immer";

import type { ExecutionLog } from "@/types";

interface ExecutionState {
  logs: ExecutionLog[];
  currentStage: number;
  isSimulating: boolean;
  startSimulation: () => void;
  advanceStage: () => void;
  appendLog: (log: ExecutionLog) => void;
  resetSimulation: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  logs: [],
  currentStage: 0,
  isSimulating: false,
  startSimulation: () =>
    set({
      logs: [],
      currentStage: 0,
      isSimulating: true,
    }),
  advanceStage: () =>
    set(
      produce((state: ExecutionState) => {
        state.currentStage = Math.min(5, state.currentStage + 1);
        if (state.currentStage >= 5) {
          state.isSimulating = false;
        }
      }),
    ),
  appendLog: (log) =>
    set(
      produce((state: ExecutionState) => {
        state.logs.push(log);
      }),
    ),
  resetSimulation: () =>
    set({
      logs: [],
      currentStage: 0,
      isSimulating: false,
    }),
}));
