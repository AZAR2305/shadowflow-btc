import { NODE_CONFIGS } from "@/constants/nodes";
import type { NodeType } from "@/types";

export const nodeCardClass =
  "rounded-xl border border-border bg-surface shadow-[0_0_0_1px_rgba(0,0,0,0.15)] min-w-[220px] overflow-hidden";

export const colorByType = (type: NodeType) => NODE_CONFIGS[type].color;
