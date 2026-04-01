import { hash } from "starknet";

import type { NodeGraph, Strategy } from "@/types";

export const serializeGraph = (graph: NodeGraph) => JSON.stringify(graph);

const toFelts = (raw: string) =>
  raw.split("").map((char, index) => {
    const value = BigInt(char.charCodeAt(0) + index + 1);
    return `0x${value.toString(16)}`;
  });

export const poseidonCommitment = (payload: string, salt: string) => {
  const values = [...toFelts(payload), ...toFelts(salt)];
  return hash.computePoseidonHashOnElements(values);
};

export const compileCommitment = (strategy: Strategy) => {
  const serialized = serializeGraph(strategy.graph);
  return poseidonCommitment(serialized, strategy.salt);
};
