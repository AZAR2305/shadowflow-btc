import { randomBytes } from "@noble/hashes/utils.js";

import type { NodeGraph, ZKProof } from "@/types";

const hex = (size: number) => `0x${Buffer.from(randomBytes(size)).toString("hex")}`;

export async function generateZkProof(graph: NodeGraph, commitment: string): Promise<ZKProof> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  return {
    proofHash: hex(32),
    commitment,
    finalStateHash: hex(32),
    publicInputs: [`nodes:${graph.nodes.length}`, `edges:${graph.edges.length}`],
    verified: false,
  };
}

export async function verifyZkProof(proof: ZKProof): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return proof.proofHash.length > 10;
}
