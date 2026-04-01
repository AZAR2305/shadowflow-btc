import { create } from "zustand";
import { produce } from "immer";
import { nanoid } from "nanoid";

import type {
  ConditionData,
  ConstraintData,
  ExecuteData,
  NodeGraph,
  NodeType,
  SplitData,
} from "@/types";

interface StrategyState {
  graph: NodeGraph;
  selectedNodeId: string | null;
  isValid: boolean;
  commitment: string | null;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: {
    id?: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => void;
  setSelectedNode: (id: string | null) => void;
  validateGraph: () => boolean;
  resetGraph: () => void;
  setCommitment: (commitment: string | null) => void;
}

const emptyGraph: NodeGraph = {
  nodes: [],
  edges: [],
};

const defaultNodeData = (type: NodeType): ConditionData | SplitData | ExecuteData | ConstraintData => {
  switch (type) {
    case "condition":
      return { asset: "BTC", operator: "<", price: 60000 };
    case "split":
      return { splitCount: 3, splitMode: "equal" };
    case "execute":
      return { direction: "buy", amount: 0.1, delayMs: 500 };
    case "constraint":
      return { field: "maxSlippage", operator: "<=", value: 2 };
  }
};

const validateNodeGraph = (graph: NodeGraph) => {
  if (!graph.nodes.length) {
    return false;
  }

  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return false;
    }
  }

  const indegree = new Map<string, number>();
  graph.nodes.forEach((node) => indegree.set(node.id, 0));
  graph.edges.forEach((edge) => indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1));

  const queue = Array.from(indegree.entries())
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id);

  let visited = 0;
  while (queue.length) {
    const id = queue.shift()!;
    visited += 1;

    graph.edges
      .filter((edge) => edge.source === id)
      .forEach((edge) => {
        const next = (indegree.get(edge.target) ?? 0) - 1;
        indegree.set(edge.target, next);
        if (next === 0) {
          queue.push(edge.target);
        }
      });
  }

  return visited === graph.nodes.length;
};

export const useStrategyStore = create<StrategyState>((set, get) => ({
  graph: emptyGraph,
  selectedNodeId: null,
  isValid: false,
  commitment: null,
  addNode: (type, position) =>
    set(
      produce((state: StrategyState) => {
        state.graph.nodes.push({
          id: nanoid(8),
          type,
          position,
          data: defaultNodeData(type),
        });
      }),
    ),
  updateNodeData: (id, data) =>
    set(
      produce((state: StrategyState) => {
        const node = state.graph.nodes.find((item) => item.id === id);
        if (!node) {
          return;
        }
        node.data = { ...node.data, ...data } as typeof node.data;
      }),
    ),
  updateNodePosition: (id, position) =>
    set(
      produce((state: StrategyState) => {
        const node = state.graph.nodes.find((item) => item.id === id);
        if (!node) {
          return;
        }
        node.position = position;
      }),
    ),
  removeNode: (id) =>
    set(
      produce((state: StrategyState) => {
        state.graph.nodes = state.graph.nodes.filter((node) => node.id !== id);
        state.graph.edges = state.graph.edges.filter((edge) => edge.source !== id && edge.target !== id);
        if (state.selectedNodeId === id) {
          state.selectedNodeId = null;
        }
      }),
    ),
  addEdge: (edge) =>
    set(
      produce((state: StrategyState) => {
        const edgeId = edge.id ?? `${edge.source}-${edge.target}-${nanoid(4)}`;
        const exists = state.graph.edges.some(
          (item) =>
            item.source === edge.source &&
            item.target === edge.target &&
            item.sourceHandle === edge.sourceHandle,
        );
        if (!exists) {
          state.graph.edges.push({
            id: edgeId,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
          });
        }
      }),
    ),
  setSelectedNode: (id) => set({ selectedNodeId: id }),
  validateGraph: () => {
    const valid = validateNodeGraph(get().graph);
    set({ isValid: valid });
    return valid;
  },
  resetGraph: () =>
    set({
      graph: emptyGraph,
      selectedNodeId: null,
      isValid: false,
      commitment: null,
    }),
  setCommitment: (commitment) => set({ commitment }),
}));
