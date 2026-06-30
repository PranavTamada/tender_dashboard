"use client";

import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { STATUS_BADGE } from "@/lib/filter-options";
import type { Tender } from "@/types/tender";

export function TenderDetailModal({
  tender,
  open,
  onOpenChange,
}: {
  tender: Tender | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!tender) return null;
  const status = STATUS_BADGE[tender.status];
  const valueText =
    tender.estimatedValue != null
      ? formatCurrency(tender.estimatedValue, tender.currency)
      : tender.valueBand ?? "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scrollbar-thin">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{tender.portal}</Badge>
            {tender.level && <Badge variant="outline">{tender.level}</Badge>}
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant={tender.matchType === "DEPARTMENT" ? "default" : "secondary"}>
              {tender.matchType === "DEPARTMENT" ? "Department Match" : "Keyword Match"}
            </Badge>
          </div>
          <DialogTitle>{tender.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Fact label="Tender Reference" value={tender.sourceTenderId} />
            <Fact label="Estimated Value" value={valueText} />
            <Fact label="Organization" value={tender.organization} />
            <Fact label="Department" value={tender.department} />
            <Fact label="Sector" value={tender.sector} />
            <Fact label="Work Type" value={tender.workType} />
            <Fact
              label="Location"
              value={[tender.city, tender.state].filter(Boolean).join(", ") || null}
            />
            <Fact label="Closing Date" value={formatDateTime(tender.closingDate)} />
          </dl>

          <Separator />

          {tender.description && (
            <section>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </h4>
              <p className="text-sm leading-relaxed">{tender.description}</p>
            </section>
          )}

          <section>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Matched Keywords
            </h4>
            {tender.matchedKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tender.matchedKeywords.map((kw) => (
                  <Badge key={kw} variant="outline" className="border-dashed">
                    {kw}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Included via department match — no keyword matched.
              </p>
            )}
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t p-4">
          <span className="text-xs text-muted-foreground">Source: {tender.portal}</span>
          {tender.url && (
            <Button asChild>
              <a href={tender.url} target="_blank" rel="noopener noreferrer">
                View on portal
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}
