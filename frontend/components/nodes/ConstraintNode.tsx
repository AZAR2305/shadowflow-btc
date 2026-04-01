"use client";

import type { NodeProps } from "reactflow";

import { BaseNode } from "@/components/nodes/BaseNode";
import { colorByType } from "@/components/nodes/nodeStyles";

export function ConstraintNode({ data, selected }: NodeProps) {
  const color = colorByType("constraint");

  return (
    <BaseNode
      title="Constraint"
      icon="🔒"
      accentColor={color}
      selected={selected}
      inputHandles={[{ top: 50 }]}
      outputHandles={[{ top: 50 }]}
    >
      <div>Field: {data.field ?? "maxSlippage"}</div>
      <div>Operator: {data.operator ?? "<="}</div>
      <div>
        Value: <span className="redacted">████</span>
      </div>
    </BaseNode>
  );
}
