"use client";

import { motion } from "framer-motion";
import { Activity, CheckCircle, FileCode, Hash, Shield, Star } from "lucide-react";

import { FlowArrow } from "@/components/visualizer/FlowArrow";
import { PipelineNode } from "@/components/visualizer/PipelineNode";
import { RedactedValue } from "@/components/visualizer/RedactedValue";
import { Progress } from "@/components/ui/progress";

export function ExecutionVisualizer() {
  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.8,
          },
        },
      }}
    >
      <PipelineNode title="Strategy Input" icon={FileCode} badge={{ label: "🔒 PRIVATE", variant: "private" }}>
        <div className="space-y-2">
          <p>Node Types: Condition → Split → Execute → Constraint</p>
          <p>
            Private values: <RedactedValue />
          </p>
        </div>
      </PipelineNode>
      <FlowArrow />

      <PipelineNode title="Cryptographic Commitment" icon={Hash} badge={{ label: "✅ PUBLIC", variant: "public" }}>
        <motion.code
          className="font-mono text-xs text-primary"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ duration: 1 }}
        >
          Poseidon(&quot;strategy...&quot;) → 0x3f2a...7b91
        </motion.code>
      </PipelineNode>
      <FlowArrow />

      <PipelineNode title="Deterministic Execution" icon={Activity} badge={{ label: "🔒 PRIVATE", variant: "private" }}>
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            {[18, 8, 12, 6, 10].map((height, index) => (
              <motion.div
                key={index}
                className="w-5 rounded bg-accent"
                initial={{ height: 0 }}
                animate={{ height: `${height * 4}px` }}
                transition={{ delay: index * 0.12, duration: 0.3 }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <motion.div
                key={index}
                className="h-2 w-2 rounded-full bg-primary"
                initial={{ x: 0, opacity: 0.4 }}
                animate={{ x: index % 2 === 0 ? 12 : -10, opacity: 1 }}
                transition={{ repeat: Infinity, repeatType: "mirror", duration: 1.2 + index * 0.1 }}
              />
            ))}
          </div>
        </div>
      </PipelineNode>
      <FlowArrow />

      <PipelineNode title="ZK Proof Generation" icon={Shield} badge={{ label: "✅ PUBLIC", variant: "public" }}>
        <div className="space-y-3">
          <p>Generating STARK proof...</p>
          <motion.div initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
            <Progress value={100} />
          </motion.div>
          <p className="text-primary">Proof ready</p>
        </div>
      </PipelineNode>
      <FlowArrow />

      <PipelineNode title="Starknet Verification" icon={CheckCircle} badge={{ label: "✅ PUBLIC", variant: "public" }}>
        <div className="space-y-2">
          <motion.div
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
          >
            ✓
          </motion.div>
          <p>Tx: 0xabc...9f1</p>
          <p>Block: #901245</p>
        </div>
      </PipelineNode>
      <FlowArrow />

      <PipelineNode title="Final State" icon={Star} badge={{ label: "✅ VERIFIED", variant: "verified" }}>
        <ul className="space-y-1">
          <li>✅ Commitment stored on Starknet</li>
          <li>✅ Proof verified on-chain</li>
          <li>🔒 0 bytes of private data exposed</li>
        </ul>
      </PipelineNode>
    </motion.div>
  );
}
