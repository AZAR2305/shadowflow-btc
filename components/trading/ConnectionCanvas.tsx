"use client";

import { AnimatePresence, motion } from "framer-motion";
import { DraggableConnector, type CanvasPoint } from "@/components/trading/DraggableConnector";

export type { CanvasPoint };

interface ConnectionCanvasProps {
  visible: boolean;
  width: number;
  height: number;
  buyerInput: CanvasPoint | null;
  buyerOutput: CanvasPoint | null;
  sellerInput: CanvasPoint | null;
  sellerOutput: CanvasPoint | null;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  executing: boolean;
  completed: boolean;
  dragFrom: "buyer" | "seller" | null;
  dragPoint: CanvasPoint | null;
  activeDropTarget: "buyer" | "seller" | null;
}

export function ConnectionCanvas({
  visible,
  width,
  height,
  buyerInput,
  buyerOutput,
  sellerInput,
  sellerOutput,
  buyerConfirmed,
  sellerConfirmed,
  executing,
  completed,
  dragFrom,
  dragPoint,
  activeDropTarget,
}: ConnectionCanvasProps) {
  if (!visible || width <= 0 || height <= 0) {
    return null;
  }

  const buyerLineColor = completed ? "#57d691" : buyerConfirmed ? "#5ce39f" : "#f3be2b";
  const sellerLineColor = completed ? "#57d691" : sellerConfirmed ? "#5ce39f" : "#f3be2b";

  const dragStart = dragFrom === "buyer" ? buyerOutput : dragFrom === "seller" ? sellerOutput : null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker id="buyer-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={buyerLineColor} />
        </marker>
        <marker id="seller-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={sellerLineColor} />
        </marker>
      </defs>

      {buyerConfirmed && buyerOutput && sellerInput && (
        <DraggableConnector
          start={buyerOutput}
          end={sellerInput}
          color={buyerLineColor}
          markerEnd="url(#buyer-arrow)"
          dashed={!completed}
          animated={executing}
        />
      )}

      {sellerConfirmed && sellerOutput && buyerInput && (
        <DraggableConnector
          start={sellerOutput}
          end={buyerInput}
          color={sellerLineColor}
          markerEnd="url(#seller-arrow)"
          dashed={!completed}
          animated={executing}
        />
      )}

      <AnimatePresence>
        {dragStart && dragPoint && (
          <motion.g initial={{ opacity: 0.7 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DraggableConnector
              start={dragStart}
              end={dragPoint}
              color="#fbbf24"
              markerEnd={dragFrom === "buyer" ? "url(#buyer-arrow)" : "url(#seller-arrow)"}
              dashed={true}
              animated={true}
              opacity={0.95}
            />
          </motion.g>
        )}
      </AnimatePresence>

      {buyerInput && (
        <circle
          cx={buyerInput.x}
          cy={buyerInput.y}
          r={activeDropTarget === "buyer" ? 14 : 9}
          fill={activeDropTarget === "buyer" ? "rgba(92,227,159,0.25)" : "rgba(116,164,230,0.25)"}
          stroke={activeDropTarget === "buyer" ? "#59ffc6" : "#74a4e6"}
          strokeWidth="2"
        />
      )}

      {sellerInput && (
        <circle
          cx={sellerInput.x}
          cy={sellerInput.y}
          r={activeDropTarget === "seller" ? 14 : 9}
          fill={activeDropTarget === "seller" ? "rgba(92,227,159,0.25)" : "rgba(116,164,230,0.25)"}
          stroke={activeDropTarget === "seller" ? "#59ffc6" : "#74a4e6"}
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
