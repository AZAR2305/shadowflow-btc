"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function RedactedValue({ value = "████████" }: { value?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="redacted">{value}</span>
        </TooltipTrigger>
        <TooltipContent>This value is kept private</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
