"use client";

import { validateGraphAsDag } from "@/lib/graphCompiler";
import type { NodeGraph } from "@/types";

export function GraphValidator({ graph }: { graph: NodeGraph }) {
  const result = validateGraphAsDag(graph);

  return (
    <div className="text-sm">
      {result.valid ? (
        <p className="text-primary">✅ Valid graph — ready for compilation</p>
      ) : (
        <p className="text-danger">❌ Invalid graph — {result.reason}</p>
      )}
    </div>
  );
}
