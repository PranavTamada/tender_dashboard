"use client";

import { Activity, Radar } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { RefreshButton } from "./refresh-button";
import { formatRelative } from "@/lib/format";

export function Header({
  lastRefresh,
  isRefreshing,
}: {
  lastRefresh: string | null | undefined;
  isRefreshing: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Radar className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-semibold sm:text-lg">
              Tender Intelligence Dashboard
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Real-time Government Tender Monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <Activity
              className={
                isRefreshing
                  ? "h-3.5 w-3.5 animate-pulse text-emerald-500"
                  : "h-3.5 w-3.5 text-muted-foreground"
              }
            />
            {isRefreshing
              ? "Fetching latest tenders…"
              : `Updated ${formatRelative(lastRefresh)}`}
          </span>
          <RefreshButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
