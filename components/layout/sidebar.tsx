import type { Route } from "next";
import Link from "next/link";
import { FlaskConical, FolderKanban, Gauge, KeyRound, PlayCircle, ShieldCheck, Telescope } from "lucide-react";
import { cn } from "@/lib/utils";

const items: Array<{ href: Route; label: string; icon: typeof Gauge }> = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/environments", label: "Environments", icon: ShieldCheck },
  { href: "/assets", label: "Assets", icon: Telescope },
  { href: "/permissions", label: "Permissions", icon: KeyRound },
  { href: "/tests", label: "Tests", icon: FlaskConical },
  { href: "/runs", label: "Runs", icon: PlayCircle },
  { href: "/review-pack", label: "App Review Pack", icon: FolderKanban }
];

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-slate-950/95 px-5 py-6 text-white lg:block">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Internal Admin Tool</p>
        <h1 className="mt-3 text-2xl font-semibold">Meta Permission Test Lab</h1>
        <p className="mt-2 text-sm text-slate-300">
          Securely validate permissions, discover IDs, and build App Review evidence.
        </p>
      </div>
      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
