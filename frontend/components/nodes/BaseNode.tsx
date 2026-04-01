"use client";

import { motion } from "framer-motion";
import { Handle, Position } from "reactflow";

import { Badge } from "@/components/ui/badge";

interface HandleConfig {
  id?: string;
  top: number;
}

interface BaseNodeProps {
  title: string;
  accentColor: string;
  icon: string;
  selected?: boolean;
  inputHandles?: HandleConfig[];
  outputHandles?: HandleConfig[];
  children: React.ReactNode;
}

const cardClass =
  "relative min-w-[250px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_0_0_1px_rgba(255,255,255,0.03)]";

export function BaseNode({
  title,
  accentColor,
  icon,
  selected,
  inputHandles = [{ top: 50 }],
  outputHandles = [{ top: 50 }],
  children,
}: BaseNodeProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`${cardClass} ${selected ? "ring-2 ring-primary" : ""}`}
      style={{ borderLeft: `5px solid ${accentColor}` }}
    >
      {inputHandles.map((handle, index) => (
        <Handle
          key={handle.id ?? `in-${index}`}
          type="target"
          id={handle.id}
          position={Position.Left}
          style={{ background: accentColor, top: `${handle.top}%` }}
        />
      ))}

      <div className="flex items-center gap-2 border-b border-border p-3 text-sm font-semibold">
        <span style={{ color: accentColor }}>{icon}</span>
        {title}
      </div>

      <div className="space-y-1 p-3 text-xs text-muted">{children}</div>

      <div className="flex items-center justify-between border-t border-border p-2 text-[10px]">
        <Badge variant="private">PRIVATE 🔒</Badge>
        <Badge variant="public">PUBLIC ✅</Badge>
      </div>

      {outputHandles.map((handle, index) => (
        <Handle
          key={handle.id ?? `out-${index}`}
          type="source"
          id={handle.id}
          position={Position.Right}
          style={{ background: accentColor, top: `${handle.top}%` }}
        />
      ))}
    </motion.div>
  );
}