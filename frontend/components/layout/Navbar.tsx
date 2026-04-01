"use client";

import Link from "next/link";
import { Shield } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4">
        <Link href="/builder" className="flex items-center gap-2 font-heading text-lg font-bold">
          <Shield className="h-5 w-5 text-primary" />
          ShadowFlowBTC++
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/builder" className="hover:text-foreground">Builder</Link>
          <Link href="/simulate" className="hover:text-foreground">Simulate</Link>
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        </nav>
      </div>
    </header>
  );
}
