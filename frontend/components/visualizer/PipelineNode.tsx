"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PipelineNodeProps {
  title: string;
  icon: LucideIcon;
  badge: { label: string; variant: "private" | "public" | "verified" | "default" };
  children: React.ReactNode;
}

export function PipelineNode({ title, icon: Icon, badge, children }: PipelineNodeProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
      }}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted">{children}</CardContent>
      </Card>
    </motion.div>
  );
}
