"use client";

import { Clock, LayoutGrid, CalendarClock, IndianRupee, CircleDot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format";
import { formatCurrency } from "@/lib/utils";
import type { StatsResponse } from "@/types/tender";

function compactCurrency(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  return formatCurrency(value);
}

export function StatsCards({
  stats,
  isLoading,
}: {
  stats: StatsResponse | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Matching Tenders",
      value: stats.totalMatches.toLocaleString("en-IN"),
      hint: `${stats.byMatchType.DEPARTMENT} dept · ${stats.byMatchType.KEYWORD} keyword`,
      icon: LayoutGrid,
      accent: "text-primary",
    },
    {
      label: "Active",
      value: stats.activeCount.toLocaleString("en-IN"),
      hint: "open for bidding",
      icon: CircleDot,
      accent: "text-emerald-500",
    },
    {
      label: "Closing Soon",
      value: stats.closingSoonCount.toLocaleString("en-IN"),
      hint: "≤ 3 days",
      icon: CalendarClock,
      accent: "text-amber-500",
    },
    {
      label: "Total Value",
      value: stats.totalValue > 0 ? compactCurrency(stats.totalValue) : "—",
      hint: "estimated",
      icon: IndianRupee,
      accent: "text-violet-500",
    },
    {
      label: "Last Refresh",
      value: formatRelative(stats.lastRefresh),
      hint: "live on refresh",
      icon: Clock,
      accent: "text-blue-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {c.label}
                </p>
                <Icon className={`h-4 w-4 ${c.accent}`} />
              </div>
              <p className="text-2xl font-bold tracking-tight">{c.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
