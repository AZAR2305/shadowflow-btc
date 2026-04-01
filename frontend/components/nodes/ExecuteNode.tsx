"use client";

import type { NodeProps } from "reactflow";

import { BaseNode } from "@/components/nodes/BaseNode";
import { colorByType } from "@/components/nodes/nodeStyles";

export function ExecuteNode({ data, selected }: NodeProps) {
  const color = colorByType("execute");

  return (
    <BaseNode
      title="Execute"
      icon="⚡"
      accentColor={color}
      selected={selected}
      inputHandles={[{ top: 50 }]}
      outputHandles={[]}
    >
      <div>Direction: {data.direction ?? "buy"}</div>
      <div>
        Amount: <span className="redacted">████</span>
      </div>
      <div>
        Delay: <span className="redacted">████</span>
      </div>
    </BaseNode>
  );
}
