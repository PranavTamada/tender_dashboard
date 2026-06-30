"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/** Toggle a tender's visited flag, then refresh both tender lists + stats. */
export function useToggleVisited() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, visited }: { id: string; visited: boolean }) =>
      api.setVisited(id, visited),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenders"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

/** Permanently delete a tender from the database. */
export function useDeleteTender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTender(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenders"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
