"use client";

import { useMemo } from "react";

import { CommitmentCard } from "@/components/dashboard/CommitmentCard";
import { ExecutionTimeline } from "@/components/dashboard/ExecutionTimeline";
import { ProofStatusCard } from "@/components/dashboard/ProofStatusCard";
import { StarknetStatus } from "@/components/dashboard/StarknetStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateZkProof, verifyZkProof } from "@/lib/zkProver";
import { useProofStore } from "@/store/proofStore";
import { useStrategyStore } from "@/store/strategyStore";

export function Dashboard() {
  const { graph, commitment } = useStrategyStore();
  const { startProofGeneration, setProgress, setProof, setStatus, proof } = useProofStore();

  const constraints = useMemo(
    () =>
      graph.nodes.map((node) => ({
        nodeId: node.id,
        constraintType: node.type,
        publicInputs: [node.type],
      })),
    [graph.nodes],
  );

  const onGenerate = async () => {
    startProofGeneration();
    setProgress(20);

    const next = await generateZkProof(graph, commitment ?? "0x0");
    setProgress(70);
    setStatus("verifying");

    const verified = await verifyZkProof(next);
    setProgress(100);
    setProof({ ...next, verified });
    setStatus(verified ? "complete" : "error");
  };

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="logs">Execution Logs</TabsTrigger>
        <TabsTrigger value="constraints">ZK Constraints</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <CommitmentCard commitment={commitment} />
          <ProofStatusCard onGenerate={onGenerate} />
          <StarknetStatus />
        </div>
        <ExecutionTimeline />
      </TabsContent>

      <TabsContent value="logs">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 font-heading text-lg font-bold">Execution Log Table</h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2">Step</th>
                <th>Node</th>
                <th>Action</th>
                <th>Masked</th>
              </tr>
            </thead>
            <tbody>
              {graph.nodes.map((node, index) => (
                <tr key={node.id} className="border-b border-border/50">
                  <td className="py-2">{index + 1}</td>
                  <td>{node.id.slice(0, 6)}</td>
                  <td>{node.type.toUpperCase()}</td>
                  <td className="redacted">████</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>

      <TabsContent value="constraints">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 font-heading text-lg font-bold">Constraint Set</h3>
          <ul className="space-y-2 text-sm">
            {constraints.map((item) => (
              <li key={item.nodeId} className="rounded-md border border-border p-2">
                {item.nodeId.slice(0, 8)} — {item.constraintType}
              </li>
            ))}
          </ul>
          {proof ? <p className="mt-3 text-xs text-primary">Proof hash: {proof.proofHash}</p> : null}
        </div>
      </TabsContent>
    </Tabs>
  );
}
