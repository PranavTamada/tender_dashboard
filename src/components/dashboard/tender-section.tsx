"use client";

import { Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TenderCard } from "./tender-card";
import type { Tender } from "@/types/tender";

/** Single responsive grid of tender cards with loading & empty states. */
export function TenderGrid({
  tenders,
  isLoading,
  onSelect,
  onToggleVisited,
  onDelete,
  busy,
  emptyHint,
}: {
  tenders: Tender[];
  isLoading: boolean;
  onSelect: (tender: Tender) => void;
  onToggleVisited?: (tender: Tender) => void;
  onDelete?: (tender: Tender) => void;
  busy?: boolean;
  emptyHint?: string;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-5 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tenders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">No matching tenders for the current filters.</p>
          <p className="text-xs">
            {emptyHint ?? "Try clearing filters or hit Refresh to fetch the latest."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tenders.map((t) => (
        <TenderCard
          key={t.id}
          tender={t}
          onClick={() => onSelect(t)}
          onToggleVisited={onToggleVisited}
          onDelete={onDelete}
          busy={busy}
        />
      ))}
    </div>
  );
}
