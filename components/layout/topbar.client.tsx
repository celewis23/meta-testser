"use client";

import { useTheme } from "next-themes";
import { LogOut, MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border"
      aria-label="Toggle theme"
    >
      {mounted && resolvedTheme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
    </button>
  );
}

export function LogoutButton() {
  return (
    <form action="/login/logout" method="post">
      <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm">
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </form>
  );
}
