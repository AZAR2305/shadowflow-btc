"use client";

import { Card, Title, Text } from "@tremor/react";

import { Badge } from "@/components/ui/badge";
import { useProofStore } from "@/store/proofStore";

export function StarknetStatus() {
  const { proof, status } = useProofStore();

  return (
    <Card decoration="top" decorationColor="violet">
      <Title>Starknet Verification</Title>
      <div className="mt-2 space-y-2 text-sm">
        <Badge variant={status === "complete" ? "verified" : "default"}>
          {status === "complete" ? "Verified" : "Not Verified"}
        </Badge>
        <Text>Final state hash: {proof?.finalStateHash?.slice(0, 14) ?? "n/a"}</Text>
        <Text>Block: {status === "complete" ? "#901245" : "-"}</Text>
        <Text>Tx: {status === "complete" ? "0xabc...9f1" : "-"}</Text>
      </div>
    </Card>
  );
}
