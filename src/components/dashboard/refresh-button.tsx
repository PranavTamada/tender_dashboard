"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRefresh } from "@/hooks/use-refresh";

export function RefreshButton() {
  const refresh = useRefresh();
  return (
    <Button
      variant="default"
      onClick={() => refresh.mutate(true)}
      disabled={refresh.isPending}
    >
      <RefreshCw className={cn("h-4 w-4", refresh.isPending && "animate-spin")} />
      {refresh.isPending ? "Refreshing…" : "Refresh"}
    </Button>
  );
}
