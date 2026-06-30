"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/**
 * Live-fetches the latest tenders from infralens, then invalidates the
 * tender/stats queries so the dashboard shows the newest dataset.
 * `force` (default true) bypasses the freshness window — the Refresh button
 * always pulls live; the on-load call passes force=false.
 */
export function useRefresh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (force: boolean) => api.refresh(force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
