import type { Connection, Edge } from "reactflow";

import type { NodeGraph, NodeType } from "@/types";

const sourceLimits: Record<NodeType, number> = {
  condition: 1,
  split: 2,
  constraint: 1,
  execute: 0,
  btc_transfer: 1
};

const targetLimits: Record<NodeType, number> = {
  condition: 1,
  split: 1,
  constraint: 1,
  execute: 2,
  btc_transfer: 1
};

const allowedTargetsBySource: Record<NodeType, NodeType[]> = {
  condition: ["split", "constraint", "execute", "btc_transfer"],
  split: ["condition", "constraint", "execute", "btc_transfer"],
  constraint: ["condition", "split", "execute", "btc_transfer"],
  execute: [],
  btc_transfer: ["split", "constraint", "execute"]
};

const nodeTypeById = (graph: NodeGraph, id: string) => graph.nodes.find((node) => node.id === id)?.type;

const createsCycle = (graph: NodeGraph, source: string, target: string) => {
  const adjacency = new Map<string, string[]>();

  graph.nodes.forEach((node) => adjacency.set(node.id, []));
  graph.edges.forEach((edge) => {
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  });

  const augmented = adjacency.get(source) ?? [];
  augmented.push(target);
  adjacency.set(source, augmented);

  const seen = new Set<string>();
  const stack = [target];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === source) {
      return true;
    }
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    const next = adjacency.get(current) ?? [];
    next.forEach((id) => stack.push(id));
  }

  return false;
};

export function validateConnection(
  graph: NodeGraph,
  connection: Connection | Edge,
): { valid: boolean; reason?: string } {
  const { source, target, sourceHandle } = connection;
  if (!source || !target) {
    return { valid: false, reason: "Invalid connection endpoints" };
  }

  if (source === target) {
    return { valid: false, reason: "Node cannot connect to itself" };
  }

  const sourceType = nodeTypeById(graph, source);
  const targetType = nodeTypeById(graph, target);
  if (!sourceType || !targetType) {
    return { valid: false, reason: "Unknown node type in connection" };
  }

  if (!allowedTargetsBySource[sourceType].includes(targetType)) {
    return { valid: false, reason: `${sourceType} cannot connect to ${targetType}` };
  }

  const outgoing = graph.edges.filter((edge) => edge.source === source);
  if (outgoing.length >= sourceLimits[sourceType]) {
    return { valid: false, reason: `Source limit reached for ${sourceType}` };
  }

  const incoming = graph.edges.filter((edge) => edge.target === target);
  if (incoming.length >= targetLimits[targetType]) {
    return { valid: false, reason: `Target limit reached for ${targetType}` };
  }

  if (
    graph.edges.some(
      (edge) => edge.source === source && edge.target === target && edge.sourceHandle === sourceHandle,
    )
  ) {
    return { valid: false, reason: "Duplicate edge" };
  }

  if (
    sourceType === "split" &&
    sourceHandle &&
    graph.edges.some((edge) => edge.source === source && edge.sourceHandle === sourceHandle)
  ) {
    return { valid: false, reason: "Split branch already used" };
  }

  if (createsCycle(graph, source, target)) {
    return { valid: false, reason: "Connection creates cycle" };
  }

  return { valid: true };
}