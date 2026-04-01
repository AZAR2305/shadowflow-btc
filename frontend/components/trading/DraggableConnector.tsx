"use client";

import { motion } from "framer-motion";

export interface CanvasPoint {
  x: number;
  y: number;
}

interface DraggableConnectorProps {
  start: CanvasPoint;
  end: CanvasPoint;
  color: string;
  markerEnd?: string;
  width?: number;
  dashed?: boolean;
  animated?: boolean;
  opacity?: number;
}

export function connectorPath(start: CanvasPoint, end: CanvasPoint): string {
  const distance = Math.abs(end.x - start.x);
  const pull = Math.max(80, distance * 0.55);
  const direction = end.x >= start.x ? 1 : -1;
  const c1x = start.x + pull * direction;
  const c2x = end.x - pull * direction;

  return `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${end.y}, ${end.x} ${end.y}`;
}

export function DraggableConnector({
  start,
  end,
  color,
  markerEnd,
  width = 3,
  dashed = false,
  animated = false,
  opacity = 1,
}: DraggableConnectorProps) {
  const d = connectorPath(start, end);

  return (
    <>
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? "8 8" : undefined}
        markerEnd={markerEnd}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35 }}
        style={{ opacity }}
      />
      {animated && (
        <motion.path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeDasharray="6 10"
          markerEnd={markerEnd}
          animate={{ strokeDashoffset: [18, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          style={{ opacity: opacity * 0.9 }}
        />
      )}
    </>
  );
}
