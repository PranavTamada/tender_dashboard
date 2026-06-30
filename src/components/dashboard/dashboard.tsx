"use client";

import * as React from "react";
import { AlertTriangle, BarChart3, CheckCircle2, ChevronDown } from "lucide-react";
import { Header } from "./header";
import { StatsCards } from "./stats-cards";
import { FiltersBar } from "./filters-bar";
import { AnalyticsCharts } from "./analytics-charts";
import { TenderGrid } from "./tender-section";
import { TenderDetailModal } from "./tender-detail-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStats } from "@/hooks/use-stats";
import { useTenders } from "@/hooks/use-tenders";
import { useRefresh } from "@/hooks/use-refresh";
import { useDebounce } from "@/hooks/use-debounce";
import { useDeleteTender, useToggleVisited } from "@/hooks/use-tender-actions";
import type { TenderFilters } from "@/lib/api-client";
import type { Tender } from "@/types/tender";

const DEFAULT_FILTERS: TenderFilters = { sort: "newest", pageSize: 24, page: 1 };

export function Dashboard() {
  const [filters, setFilters] = React.useState<TenderFilters>(DEFAULT_FILTERS);
  const [selected, setSelected] = React.useState<Tender | null>(null);
  const [showCharts, setShowCharts] = React.useState(true);
  const [showVisited, setShowVisited] = React.useState(true);
  const ranInitial = React.useRef(false);

  const debouncedQ = useDebounce(filters.q ?? "", 350);
  const debouncedText = useDebounce(
    `${filters.state ?? ""}|${filters.sector ?? ""}`,
    350,
  );
  // Main list excludes visited tenders.
  const queryFilters = React.useMemo(
    () => ({ ...filters, q: debouncedQ || undefined, visited: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, debouncedQ, debouncedText],
  );

  const stats = useStats();
  const tenders = useTenders(queryFilters);
  const visited = useTenders({ visited: true, sort: "newest", pageSize: 100 });
  const refresh = useRefresh();
  const toggleVisited = useToggleVisited();
  const deleteTender = useDeleteTender();

  // Always fetch the latest live on every page load.
  React.useEffect(() => {
    if (ranInitial.current) return;
    ranInitial.current = true;
    refresh.mutate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (next: Partial<TenderFilters>) =>
    setFilters((f) => ({ ...f, ...next, page: 1 }));
  const clear = () => setFilters(DEFAULT_FILTERS);

  const onToggleVisited = (t: Tender) =>
    toggleVisited.mutate({ id: t.id, visited: !t.visited });
  const onDelete = (t: Tender) => {
    if (
      window.confirm(
        `Permanently delete this tender from the database?\n\n${t.title}`,
      )
    ) {
      deleteTender.mutate(t.id);
    }
  };

  const list = tenders.data?.data ?? [];
  const visitedList = visited.data?.data ?? [];
  const visitedCount = visited.data?.pagination.total ?? 0;
  const total = tenders.data?.pagination.total;
  const totalPages = tenders.data?.pagination.totalPages ?? 1;
  const page = filters.page ?? 1;
  const mutating = toggleVisited.isPending || deleteTender.isPending;

  return (
    <div className="min-h-screen">
      <Header lastRefresh={stats.data?.lastRefresh} isRefreshing={refresh.isPending} />

      <main className="container space-y-6 py-6">
        {refresh.isError && (
          <Banner
            text={`Refresh failed: ${(refresh.error as Error).message}. Showing the most recent stored data.`}
          />
        )}
        {tenders.isError && (
          <Banner text={`Could not load tenders: ${(tenders.error as Error).message}`} />
        )}

        <StatsCards stats={stats.data} isLoading={stats.isLoading} />

        <div>
          <button
            onClick={() => setShowCharts((s) => !s)}
            className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
            <ChevronDown className={`h-4 w-4 transition-transform ${showCharts ? "rotate-180" : ""}`} />
          </button>
          {showCharts && <AnalyticsCharts stats={stats.data} isLoading={stats.isLoading} />}
        </div>

        <FiltersBar filters={filters} onChange={update} onClear={clear} resultCount={total} />

        <TenderGrid
          tenders={list}
          isLoading={tenders.isLoading}
          onSelect={setSelected}
          onToggleVisited={onToggleVisited}
          busy={mutating}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: page - 1 }))}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: page + 1 }))}>
              Next
            </Button>
          </div>
        )}

        {/* Visited section */}
        <section className="space-y-3 border-t pt-6">
          <button
            onClick={() => setShowVisited((s) => !s)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Visited
            <Badge variant="secondary">{visitedCount}</Badge>
            <ChevronDown className={`h-4 w-4 transition-transform ${showVisited ? "rotate-180" : ""}`} />
          </button>
          {showVisited && (
            <TenderGrid
              tenders={visitedList}
              isLoading={visited.isLoading}
              onSelect={setSelected}
              onToggleVisited={onToggleVisited}
              onDelete={onDelete}
              busy={mutating}
              emptyHint="Tick a tender's checkbox to move it here."
            />
          )}
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-xs text-muted-foreground">
          Tender Intelligence Dashboard · Live data from tenders.infralens.in ·
          Fetches the latest on every refresh
        </div>
      </footer>

      <TenderDetailModal
        tender={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}

function Banner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
