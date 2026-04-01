"use client";

import type { NodeProps } from "reactflow";

import { BaseNode } from "@/components/nodes/BaseNode";
import { colorByType } from "@/components/nodes/nodeStyles";

export function ConditionNode({ data, selected }: NodeProps) {
  const color = colorByType("condition");

  return (
    <BaseNode
      title="Condition"
      icon="⟠"
      accentColor={color}
      selected={selected}
      inputHandles={[{ top: 50 }]}
      outputHandles={[{ top: 50 }]}
    >
      <div>Asset: BTC</div>
      <div>Operator: {data.operator ?? "<"}</div>
      <div>
        Price: <span className="redacted">████</span>
      </div>
    </BaseNode>
  );
}
