import Link from "next/link";
import { LogoutButton, ThemeToggle } from "@/components/layout/topbar.client";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Meta Graph Admin</p>
          <p className="text-lg font-semibold">Review-safe testing without exposing tokens</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/review-pack" className="rounded-xl border border-border px-3 py-2 text-sm font-medium">
            Export App Review Pack
          </Link>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
      <div className="border-t border-border/70 bg-warning/10 px-6 py-2 text-sm text-warning">
        Internal admin tool only. Do not share exported evidence packs, tokens, or run logs outside approved reviewers.
      </div>
    </header>
  );
}
