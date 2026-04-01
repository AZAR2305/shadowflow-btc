"use client";

import { Copy, ExternalLink } from "lucide-react";
import { Card, Title, Text } from "@tremor/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CommitmentCard({ commitment }: { commitment: string | null }) {
  const short = commitment ? `${commitment.slice(0, 10)}...${commitment.slice(-6)}` : "Pending";

  return (
    <Card decoration="top" decorationColor="emerald">
      <Title>Commitment</Title>
      <Text>{short}</Text>
      <div className="mt-4 flex items-center gap-2">
        <Badge variant={commitment ? "public" : "default"}>{commitment ? "Committed" : "Pending"}</Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (commitment) {
              navigator.clipboard.writeText(commitment);
            }
          }}
        >
          <Copy className="mr-1 h-4 w-4" /> Copy
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a href="https://starkscan.co" target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1 h-4 w-4" /> Explorer
          </a>
        </Button>
      </div>
    </Card>
  );
}
