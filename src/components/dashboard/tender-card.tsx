"use client";

import {
  Building2,
  CalendarClock,
  IndianRupee,
  Layers,
  MapPin,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatCurrency } from "@/lib/utils";
import { daysUntil, formatDate } from "@/lib/format";
import { STATUS_BADGE } from "@/lib/filter-options";
import type { Tender } from "@/types/tender";

export function TenderCard({
  tender,
  onClick,
  onToggleVisited,
  onDelete,
  busy,
}: {
  tender: Tender;
  onClick: () => void;
  /** Toggle visited (checkbox). Omit to hide the checkbox. */
  onToggleVisited?: (tender: Tender) => void;
  /** Permanently delete (trash button, shown in the Visited section). */
  onDelete?: (tender: Tender) => void;
  busy?: boolean;
}) {
  const status = STATUS_BADGE[tender.status];
  const days = daysUntil(tender.closingDate);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {onToggleVisited && (
              <span className="mt-0.5">
                <Checkbox
                  checked={tender.visited}
                  disabled={busy}
                  aria-label={tender.visited ? "Mark as not visited" : "Mark as visited"}
                  title={tender.visited ? "Mark as not visited" : "Mark as visited"}
                  onCheckedChange={() => onToggleVisited(tender)}
                />
              </span>
            )}
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
              {tender.title}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant={status.variant}>{status.label}</Badge>
            {onDelete && (
              <button
                type="button"
                aria-label="Delete permanently"
                title="Delete permanently from database"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(tender);
                }}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {tender.organization && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{tender.organization}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {(tender.state || tender.city) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {[tender.city, tender.state].filter(Boolean).join(", ")}
              </span>
            )}
            {tender.sector && (
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                {tender.sector}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span
              className={cn(
                "flex items-center gap-1.5",
                days !== null && days <= 3 && days >= 0 && "text-amber-600 dark:text-amber-400",
                days !== null && days < 0 && "text-destructive",
              )}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {formatDate(tender.closingDate)}
              {days !== null && days >= 0 && days <= 7 && (
                <span className="font-medium">({days}d)</span>
              )}
            </span>
            {tender.estimatedValue != null && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <IndianRupee className="h-3.5 w-3.5" />
                {formatCurrency(tender.estimatedValue, tender.currency).replace("₹", "")}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Badge variant={tender.matchType === "DEPARTMENT" ? "default" : "secondary"}>
            {tender.matchType === "DEPARTMENT" ? "Department Match" : "Keyword Match"}
          </Badge>
          {tender.matchedKeywords.slice(0, 3).map((kw) => (
            <Badge key={kw} variant="outline" className="border-dashed">
              {kw}
            </Badge>
          ))}
          {tender.matchedKeywords.length > 3 && (
            <Badge variant="outline" className="border-dashed">
              +{tender.matchedKeywords.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
