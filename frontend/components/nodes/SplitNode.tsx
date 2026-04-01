"use client";

import type { NodeProps } from "reactflow";

import { BaseNode } from "@/components/nodes/BaseNode";
import { colorByType } from "@/components/nodes/nodeStyles";

export function SplitNode({ data, selected }: NodeProps) {
  const color = colorByType("split");

  return (
    <BaseNode
      title="Split"
      icon="⎇"
      accentColor={color}
      selected={selected}
      inputHandles={[{ top: 50 }]}
      outputHandles={[
        { id: "branch-a", top: 34 },
        { id: "branch-b", top: 66 },
      ]}
    >
      <div>
        Count: <span className="redacted">████</span>
      </div>
      <div>Mode: {data.splitMode ?? "equal"}</div>
      <div className="text-[10px] text-muted/80">Outputs: branch-a / branch-b</div>
    </BaseNode>
  );
}
