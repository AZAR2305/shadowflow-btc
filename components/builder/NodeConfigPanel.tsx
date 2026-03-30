"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { StrategyNode } from "@/types";

const baseSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

interface Props {
  node: StrategyNode | null;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}

export function NodeConfigPanel({ node, onUpdate }: Props) {
  const [showPrivate, setShowPrivate] = useState(false);

  const defaults = useMemo(() => {
    if (!node) {
      return {};
    }
    return node.data as unknown as Record<string, string | number | boolean>;
  }, [node]);

  const form = useForm<Record<string, string | number | boolean>>({
    resolver: zodResolver(baseSchema),
    values: defaults,
    mode: "onChange",
  });

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  if (!node) {
    return (
      <div className="w-[280px] border-l border-border bg-surface p-4 text-sm text-muted">
        Select a node to configure private/public parameters.
      </div>
    );
  }

  const registerAndSave = (key: string, value: string | number | boolean) => {
    form.setValue(key, value);
    onUpdate(node.id, { [key]: value });
  };

  const isPrivateField = (key: string) => ["price", "splitCount", "amount", "delayMs", "value"].includes(key);

  return (
    <div className="w-[280px] border-l border-border bg-surface p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-lg font-bold">Node Config</h3>
        <Button variant="ghost" size="icon" onClick={() => setShowPrivate((prev) => !prev)}>
          {showPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      <div className="space-y-4">
        {Object.entries(node.data).map(([key, value]) => {
          const privateField = isPrivateField(key);
          const visibleValue = privateField && !showPrivate ? "████" : value;

          if (typeof value === "number" && key === "splitCount") {
            return (
              <div key={key} className="space-y-2">
                <Label>{key}</Label>
                <Slider
                  value={[Number(value)]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(next) => registerAndSave(key, next[0])}
                />
                <p className="text-xs text-muted">{String(visibleValue)}</p>
              </div>
            );
          }

          if (key === "direction") {
            return (
              <div key={key} className="space-y-2">
                <Label>{key}</Label>
                <Select value={String(value)} onValueChange={(next) => registerAndSave(key, next)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">buy</SelectItem>
                    <SelectItem value="sell">sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          }

          if (key === "operator") {
            return (
              <div key={key} className="space-y-2">
                <Label>{key}</Label>
                <Select value={String(value)} onValueChange={(next) => registerAndSave(key, next)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<">&lt;</SelectItem>
                    <SelectItem value=">">&gt;</SelectItem>
                    <SelectItem value="==">==</SelectItem>
                    <SelectItem value=">=">&gt;=</SelectItem>
                    <SelectItem value="<=">&lt;=</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          }

          if (typeof value === "boolean") {
            return (
              <div key={key} className="flex items-center justify-between">
                <Label>{key}</Label>
                <Switch checked={Boolean(value)} onCheckedChange={(next) => registerAndSave(key, next)} />
              </div>
            );
          }

          return (
            <div key={key} className="space-y-2">
              <Label>{key}</Label>
              <Input
                value={String(visibleValue)}
                type={typeof value === "number" ? "number" : "text"}
                onChange={(event) => {
                  const raw = event.target.value;
                  registerAndSave(key, typeof value === "number" ? Number(raw) : raw);
                }}
                disabled={privateField && !showPrivate}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
