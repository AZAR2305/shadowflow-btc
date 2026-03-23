"use client";

import { Card, Title, Text } from "@tremor/react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProofStore } from "@/store/proofStore";

export function ProofStatusCard({ onGenerate }: { onGenerate: () => Promise<void> }) {
  const { status, progress, proof } = useProofStore();

  return (
    <Card decoration="top" decorationColor="blue">
      <Title>ZK Proof Status</Title>
      <Text>{status}</Text>
      <div className="mt-3 space-y-2">
        <Progress value={progress} />
        <Text>{proof ? `Proof: ${proof.proofHash.slice(0, 14)}...` : "Proof hash pending"}</Text>
      </div>
      <Button className="mt-4" onClick={() => void onGenerate()}>
        Generate Proof
      </Button>
    </Card>
  );
}
