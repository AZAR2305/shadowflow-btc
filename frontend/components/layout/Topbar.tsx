"use client";

import { Bell, ChevronRight, UserCircle2 } from "lucide-react";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  builder: "Builder",
  simulate: "Simulate",
  dashboard: "Dashboard",
  trades: "My Trades",
  docs: "Docs",
};

export function Topbar() {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "builder";
  const current = labels[segment] ?? "Builder";

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-base/95 backdrop-blur">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm text-secondary">
          <span>Home</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{current}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-md border border-[#F7931A40] bg-[#F7931A14] px-2 py-1 font-code text-xs text-btc">
            BTC $67,842.20
          </div>
          <button className="rounded-md border border-border bg-elevated p-2 text-secondary hover:text-foreground">
            <Bell className="h-4 w-4" />
          </button>
          <button className="rounded-md border border-border bg-elevated p-2 text-secondary hover:text-foreground">
            <UserCircle2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
