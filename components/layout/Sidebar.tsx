"use client";

import Link from "next/link";
import { Activity, BarChart3, Workflow } from "lucide-react";

const links = [
  { href: "/builder", label: "Builder", icon: Workflow },
  { href: "/simulate", label: "Simulate", icon: Activity },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-surface p-3 lg:block">
      <div className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm text-muted hover:border-border hover:bg-background hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
