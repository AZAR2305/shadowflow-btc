import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition",
  {
    variants: {
      variant: {
        default: "border-border bg-border text-foreground",
        public: "border-[#00ff8866] bg-[#00ff8833] text-primary",
        private: "border-[#ff335566] bg-[#ff335533] text-danger",
        verified: "border-[#00ff8866] bg-[#00ff8833] text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
