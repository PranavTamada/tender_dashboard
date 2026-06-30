"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TenderFilters } from "@/lib/api-client";
import {
  KEYWORD_OPTIONS,
  MATCH_TYPE_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/filter-options";

const ALL = "all";
const sel = (v: string): string | undefined => (v === ALL ? undefined : v);

interface FiltersBarProps {
  filters: TenderFilters;
  onChange: (next: Partial<TenderFilters>) => void;
  onClear: () => void;
  resultCount?: number;
}

export function FiltersBar({ filters, onChange, onClear, resultCount }: FiltersBarProps) {
  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v && !["sort", "page", "pageSize"].includes(k),
  ).length;

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search title, organization, department, sector, state…"
              className="pl-9"
              value={filters.q ?? ""}
              onChange={(e) => onChange({ q: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select value={filters.sort ?? "newest"} onValueChange={(v) => onChange({ sort: v })}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <Field label="Match Type">
            <Select value={filters.matchType ?? ALL} onValueChange={(v) => onChange({ matchType: sel(v) })}>
              <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {MATCH_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Status">
            <Select value={filters.status ?? ALL} onValueChange={(v) => onChange({ status: sel(v) })}>
              <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Keyword">
            <Select value={filters.keyword ?? ALL} onValueChange={(v) => onChange({ keyword: sel(v) })}>
              <SelectTrigger><SelectValue placeholder="Any keyword" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ALL}>Any keyword</SelectItem>
                {KEYWORD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="State">
            <Input placeholder="e.g. Telangana" value={filters.state ?? ""} onChange={(e) => onChange({ state: e.target.value })} />
          </Field>

          <Field label="Sector">
            <Input placeholder="e.g. Telecom & IT" value={filters.sector ?? ""} onChange={(e) => onChange({ sector: e.target.value })} />
          </Field>

          <Field label="Department">
            <Input placeholder="e.g. ITE&C" value={filters.department ?? ""} onChange={(e) => onChange({ department: e.target.value })} />
          </Field>

          <Field label="Closing Before">
            <Input
              type="date"
              value={filters.closingTo?.slice(0, 10) ?? ""}
              onChange={(e) =>
                onChange({ closingTo: e.target.value ? new Date(e.target.value).toISOString() : undefined })
              }
            />
          </Field>

          <Field label="Min Value (₹)">
            <Input
              type="number"
              min={0}
              placeholder="e.g. 1000000"
              value={filters.minValue ?? ""}
              onChange={(e) =>
                onChange({ minValue: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </Field>
        </div>

        {typeof resultCount === "number" && (
          <p className="text-xs text-muted-foreground">
            {resultCount.toLocaleString("en-IN")} matching tender{resultCount === 1 ? "" : "s"}
            {activeCount > 0 ? " for current filters" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
